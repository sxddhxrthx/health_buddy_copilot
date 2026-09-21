import type { Person } from '../shared/care.js';
import { MIN_CELL, MIN_COHORT } from '../shared/contracts.js';
import type { ConfirmedConditionSource, PatientResearch } from '../shared/patient-research.js';

export const PATIENT_RESEARCH_DATA_VERSION = 'condition-fixtures-v2';
export const PATIENT_RESEARCH_MATCH_VERSION = 'finalized-confirmed-exact-label-v2';

const catalog: {
  condition: string;
  study: PatientResearch['matches'][number]['study'];
  presentation?: PatientResearch['matches'][number]['presentation'];
}[] = [
  {
    condition: 'Advanced heart failure',
    study: {
      id: 'SYN-HEART-26',
      title: 'Fictional heart-failure follow-up study',
      description:
        'A made-up documentation study showing how follow-up information could be organized for a serious heart condition. No real participants, recruitment, intervention or published findings.',
    },
    presentation: {
      headline: 'A serious heart condition, explained simply',
      explanation:
        'Heart failure means the heart is not pumping blood as well as the body needs; it does not mean the heart has stopped. “Advanced” is an explicitly recorded fictional condition label, not a severity assessment made by this app.',
      highlights: [
        {
          label: 'Everyday impact — scenario background',
          text: 'The fictional presentation story includes tiredness, breathlessness during short walks and difficulty with everyday activities. These are authored examples, not symptoms detected from readings.',
        },
        {
          label: 'What connects this patient to the cohort?',
          text: 'Only the exact confirmed condition label in a finalized visit. Age, readings, symptoms and personal entries do not affect this association.',
        },
        {
          label: 'What the chart tells us',
          text: 'Whether an invented follow-up note is present in independent fictional cases, not whether anyone recovered or a treatment worked.',
        },
      ],
      studyQuestion: 'How consistently is follow-up documented in fictional heart-failure cases?',
      studyDesign:
        'Illustrative record-review design: 120 independently generated fictional cases, each assigned one documentation category. The selected patient is not enrolled and is not included in these counts.',
      studySteps: [
        {
          label: 'Starting point',
          text: 'Associate the current finalized, confirmed condition label with this bundled study. This is not screening or eligibility assessment.',
        },
        {
          label: 'Illustrative 30-day review window',
          text: 'Imagine checking whether a follow-up note was recorded within 30 days of a fictional index visit. No actual appointments are scheduled or monitored.',
        },
        {
          label: 'Documentation result',
          text: 'Summarize note-present and note-missing categories in the Buddy cohort chart. Missing documentation does not mean care was absent.',
        },
      ],
      limitations:
        'All counts and categories are deliberately invented. There is no treatment comparison, survival estimate, hospitalization prediction or evidence of benefit. This study cannot guide care; qualified human review is required.',
    },
  },
  {
    condition: 'Hypertension',
    study: {
      id: 'SYN-BP-26',
      title: 'Fictional blood-pressure documentation study',
      description:
        'Synthetic study design exploring completeness of blood-pressure follow-up documentation. No intervention or treatment-effect claim.',
    },
  },
  {
    condition: 'Type 2 diabetes',
    study: {
      id: 'SYN-GLUCOSE-26',
      title: 'Fictional glucose documentation study',
      description:
        'Synthetic study design exploring completeness of glucose-context documentation. No intervention or treatment-effect claim.',
    },
  },
  {
    condition: 'Asthma',
    study: {
      id: 'SYN-RESP-26',
      title: 'Fictional respiratory documentation study',
      description:
        'Synthetic study design exploring completeness of respiratory follow-up documentation. No intervention or treatment-effect claim.',
    },
  },
];

type FictionalRow = { condition: string; followup: string };
// Independent fixtures, never populated from workspace patients. Rows never leave the server.
const rows: FictionalRow[] = catalog.flatMap(({ condition }) =>
  Array.from({ length: condition === 'Advanced heart failure' ? 120 : 60 }, (_, index) => ({
    condition,
    followup:
      condition === 'Advanced heart failure'
        ? index < 90
          ? 'Fictional follow-up note present'
          : 'Fictional follow-up note missing'
        : ['Documented fictional follow-up', 'Missing fictional follow-up'][index % 2],
  })),
);

export function conditionCohort(condition: string, fixtures = rows) {
  const matches = fixtures.filter((row) => row.condition === condition);
  const counts = new Map<string, number>();
  for (const row of matches) counts.set(row.followup, (counts.get(row.followup) ?? 0) + 1);
  const suppressed = matches.length < MIN_COHORT || [...counts.values()].some((n) => n < MIN_CELL);
  return {
    suppressed,
    total: suppressed ? null : matches.length,
    followup: suppressed ? [] : [...counts].map(([label, count]) => ({ label, count })),
  };
}

export function patientResearch(
  patient: Person,
  confirmed: ConfirmedConditionSource[],
): PatientResearch {
  const normalize = (value: string) => value.trim().toLowerCase();
  const matches = catalog.flatMap(({ condition, study, presentation }) => {
    const sources = confirmed.filter(
      (source) => normalize(source.diagnosis) === normalize(condition),
    );
    return sources.length
      ? [
          {
            condition,
            sources,
            cohort: conditionCohort(condition),
            study,
            ...(presentation ? { presentation } : {}),
          },
        ]
      : [];
  });
  return {
    patient,
    dataVersion: PATIENT_RESEARCH_DATA_VERSION,
    matchingVersion: PATIENT_RESEARCH_MATCH_VERSION,
    matches,
    unmatched: confirmed.filter(
      (source) =>
        !catalog.some(({ condition }) => normalize(source.diagnosis) === normalize(condition)),
    ),
  };
}
