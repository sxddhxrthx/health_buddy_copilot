import { createHash } from 'node:crypto';
import {
  DATA_VERSION,
  DEFAULT_FILTERS,
  MATCH_VERSION,
  MIN_CELL,
  MIN_COHORT,
  WEIGHTS,
} from '../shared/contracts.js';
import type { CohortFilters, CohortResult, Distribution, Evidence } from '../shared/contracts.js';
import { historicalCases, type HistoricalCase } from './data.js';

export function parseFilters(input: unknown): CohortFilters {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Filters must be an object.');
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((k) => !Object.hasOwn(DEFAULT_FILTERS, k)))
    throw new Error('Unknown filter.');
  const result = { ...DEFAULT_FILTERS, ...record };
  if (
    typeof result.minScore !== 'number' ||
    !Number.isInteger(result.minScore) ||
    result.minScore < 50 ||
    result.minScore > 95 ||
    result.minScore % 5 !== 0
  )
    throw new Error('Minimum score must be 50–95 in steps of 5.');
  for (const key of ['sameEnvironment', 'confirmedOnly', 'requireFollowup'] as const) {
    if (typeof result[key] !== 'boolean') throw new Error(`${key} must be a boolean.`);
  }
  return result as CohortFilters;
}
const round = (n: number) => Math.round(n * 10) / 10;
function overlap(a: string[], b: string[]) {
  const union = new Set([...a, ...b]);
  return a.filter((x) => b.includes(x)).length / union.size;
}
export function dimensions(row: HistoricalCase) {
  return {
    symptoms: overlap(row.symptoms, ['fever', 'fatigue', 'cough']),
    conditions: overlap(row.conditions, ['diabetes', 'hypertension', 'dyslipidemia']),
    course: Math.max(0, 1 - Math.abs(row.duration - 4) / 7),
    environment: (Number(row.season === 'winter') + Number(row.climate === 'temperate')) / 2,
    age: row.ageBand === '50–59' ? 1 : 0,
    quality: row.completeness,
  };
}
export function scoreCase(row: HistoricalCase) {
  const d = dimensions(row);
  return Object.entries(WEIGHTS).reduce(
    (sum, [key, weight]) => sum + d[key as keyof typeof d] * weight,
    0,
  );
}

// Suppress the ENTIRE distribution if a cell is small. This avoids simple
// subtraction disclosure from totals/other categories, including binary cells.
export function distribution(label: string, values: string[], evidenceId: string): Distribution {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const suppressed = values.length < MIN_COHORT || [...counts.values()].some((n) => n < MIN_CELL);
  return {
    label,
    suppressed,
    evidenceId,
    rows: suppressed
      ? []
      : [...counts]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([label, count]) => ({
            label,
            count,
            percent: round((count / values.length) * 100),
          })),
  };
}

export function findCohort(filters: CohortFilters, source = historicalCases): CohortResult {
  const eligible = source.filter(
    (r) => r.provenance && r.completeness >= 0.7 && r.year >= 2024 && r.symptoms.includes('fever'),
  );
  const rows = eligible.filter(
    (r) =>
      (!filters.sameEnvironment || (r.season === 'winter' && r.climate === 'temperate')) &&
      (!filters.confirmedOnly || r.confirmed) &&
      (!filters.requireFollowup || r.followup) &&
      scoreCase(r) >= filters.minScore,
  );
  const id =
    'COHORT-' +
    createHash('sha256')
      .update(JSON.stringify([DATA_VERSION, MATCH_VERSION, filters]))
      .digest('hex')
      .slice(0, 12);
  const suppressed = rows.length < MIN_COHORT;
  const evidenceId = `${id}-MATCH`;
  const limitations = [
    'Synthetic demonstration data; not validated for clinical use.',
    'Similarity is a retrieval indicator, not a diagnosis probability or causal claim.',
    'Historical treatments are descriptive, not recommendations; outcomes do not establish effectiveness.',
    'Vaccination, renal function, medication compatibility and specific exposure are not modeled by matching v1.',
    'Minimum cohort 10; entire distributions hidden if any observed cell has fewer than 5 cases.',
    'These demo controls do not prevent all cross-query differencing; real data requires disclosure review and query governance.',
  ];
  const evidence: Evidence[] = [
    {
      id: evidenceId,
      title: 'Reproducible cohort calculation',
      classification: 'Calculated metric',
      source: `${DATA_VERSION} / ${MATCH_VERSION} / seed 2026`,
      period: 'Historical years 2024–2025; patient as of 2026-01-15',
      calculation: `Eligibility: provenance present, completeness ≥70%, year ≥2024, fever present. Filters: ${JSON.stringify(filters)}. Score: symptom Jaccard ×25 + condition Jaccard ×20 + max(0,1−|duration−4|/7) ×20 + environment agreement ×15 + age-band agreement ×10 + completeness ×10. Threshold applied before rounding.`,
      detail: suppressed
        ? 'Cohort below the minimum disclosure size. Count, means and distributions withheld.'
        : `${source.length} generated records → ${eligible.length} eligible → ${rows.length} comparable cases. All aggregate denominators use this selected cohort.`,
      limitations,
    },
  ];
  const base: CohortResult = {
    id,
    filters,
    suppressed,
    size: null,
    total: source.length,
    eligible: eligible.length,
    meanScore: null,
    completeness: null,
    dimensions: [],
    distributions: [],
    comparisons: [],
    limitations,
    evidence,
  };
  if (suppressed) return base;
  const mean = (fn: (r: HistoricalCase) => number) =>
    rows.reduce((sum, r) => sum + fn(r), 0) / rows.length;
  const distributions = [
    distribution(
      'Recorded diagnostic categories',
      rows.map((r) => r.diagnosis),
      `${id}-DIAG`,
    ),
    distribution(
      'Recorded investigations',
      rows.map((r) => r.investigation),
      `${id}-TEST`,
    ),
    distribution(
      'Historical treatment categories',
      rows.map((r) => r.treatment),
      `${id}-TREAT`,
    ),
    distribution(
      'Recorded outcomes',
      rows.map((r) => r.outcome),
      `${id}-OUTCOME`,
    ),
    distribution(
      'Confirmation status',
      rows.map((r) => (r.confirmed ? 'Laboratory confirmed' : 'Not confirmed')),
      `${id}-CONFIRM`,
    ),
    distribution(
      'Follow-up availability',
      rows.map((r) => (r.followup ? 'Follow-up recorded' : 'Follow-up unavailable')),
      `${id}-FOLLOW`,
    ),
  ];
  for (const d of distributions)
    evidence.push({
      id: d.evidenceId,
      title: d.label,
      classification: 'Observed association',
      source: `${DATA_VERSION} / aggregate ${id}`,
      period: 'Historical years 2024–2025',
      calculation: `Group by recorded category, count rows, percent = count / ${rows.length} × 100, rounded to one decimal. One category per case. Entire distribution suppressed when any observed cell < ${MIN_CELL}.`,
      detail: d.suppressed
        ? 'Distribution withheld under small-cell policy.'
        : d.rows.map((r) => `${r.label}: ${r.count}/${rows.length} (${r.percent}%)`).join('; '),
      limitations: [
        'Fictional categories are independently generated; no clinical association has been established.',
        'Confirmation status is separate from recorded diagnostic category.',
        'Counts are not patient-specific probabilities.',
      ],
    });
  return {
    ...base,
    size: rows.length,
    meanScore: round(mean(scoreCase)),
    completeness: round(mean((r) => r.completeness) * 100),
    distributions,
    dimensions: Object.entries(WEIGHTS).map(([key, weight]) => ({
      label: key,
      weight,
      value: round(mean((r) => dimensions(r)[key as keyof typeof WEIGHTS]) * 100),
    })),
    comparisons: [
      {
        area: 'Symptom course',
        patient: 'Fever, fatigue, dry cough · day 4',
        cohort: `Mean recorded duration ${round(mean((r) => r.duration))} days`,
        difference: 'Duration overlap does not establish the same illness or severity.',
        evidenceId,
      },
      {
        area: 'Chronic conditions',
        patient: 'Diabetes, hypertension, dyslipidemia',
        cohort: `Mean condition overlap ${round(mean((r) => dimensions(r).conditions) * 100)}%`,
        difference: 'Medication compatibility and renal function are not modeled.',
        evidenceId,
      },
      {
        area: 'Environment',
        patient: 'Winter · temperate',
        cohort: `Mean environmental agreement ${round(mean((r) => dimensions(r).environment) * 100)}%`,
        difference: 'Broad bands do not establish a common exposure or cause.',
        evidenceId,
      },
      {
        area: 'Investigations',
        patient: 'Confirmatory test unavailable',
        cohort: 'Recorded tests and confirmation shown separately below',
        difference: 'Missing confirmation reduces applicability; vaccination is unknown.',
        evidenceId: `${id}-CONFIRM`,
      },
      {
        area: 'Outcomes',
        patient: 'No resolved outcome recorded',
        cohort: 'Aggregate recorded follow-up; no predicted outcome',
        difference: 'Follow-up can be missing; historical improvement is not treatment efficacy.',
        evidenceId: `${id}-OUTCOME`,
      },
    ],
  };
}
