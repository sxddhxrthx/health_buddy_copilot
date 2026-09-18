import type { HealthRecord } from '../shared/health.js';
import type { ReviewScenario, ReviewSource } from '../shared/review.js';
import { MIN_CELL, MIN_COHORT } from '../shared/contracts.js';

export const PILOT_GENERATOR_VERSION = 'measurement-coverage-fixtures-v1';
export const PILOT_MATCH_VERSION = 'measurement-coverage-jaccard-v1';
const features = {
  cardiology: ['bp|mmHg', 'weight|kg', 'weight|lb', 'steps|steps'],
  pulmonology: ['oxygen|%', 'temperature|°C', 'temperature|°F', 'steps|steps'],
} as const;
type PilotRow = { features: string[]; outcome: string };

// All 15 nonempty measurement patterns, each with balanced fictional outcome categories.
// Values are deliberately NOT modeled as treatment effectiveness or clinical similarity.
export function pilotRows(scenario: ReviewScenario): PilotRow[] {
  const outcomes = ['Fictional improvement', 'Fictional non-improvement', 'Missing follow-up'];
  return Array.from({ length: 225 }, (_, i) => ({
    features: features[scenario].filter((_, bit) => ((Math.floor(i / 15) + 1) & (1 << bit)) !== 0),
    outcome: outcomes[i % 3],
  }));
}

export function pilotCohort(
  records: HealthRecord[],
  scenario: ReviewScenario,
  rows = pilotRows(scenario),
): ReviewSource {
  const permitted: readonly string[] = features[scenario];
  const selected = new Set(
    records.map((r) => `${r.kind}|${r.unit}`).filter((key) => permitted.includes(key)),
  );
  const matches = selected.size
    ? rows.filter((row) => {
        const union = new Set([...selected, ...row.features]);
        return row.features.filter((key) => selected.has(key)).length / union.size >= 0.75;
      })
    : [];
  const counts = new Map<string, number>();
  for (const row of matches) counts.set(row.outcome, (counts.get(row.outcome) ?? 0) + 1);
  // Suppress the whole output, including totals, if ANY outcome cell is small.
  const suppressed = matches.length < MIN_COHORT || [...counts.values()].some((n) => n < MIN_CELL);
  return {
    id: 'COHORT-COVERAGE',
    kind: 'cohort',
    title: 'Fictional measurement-coverage cohort',
    text: suppressed
      ? 'No reportable cohort. Counts and outcomes are suppressed.'
      : `${matches.length} fictional cases share measurement-availability patterns (Jaccard threshold 0.75). ${[...counts].map(([label, count]) => `${label}: ${count}`).join('; ')}. This is not clinical matching, a diagnostic probability, or treatment evidence.`,
  };
}
