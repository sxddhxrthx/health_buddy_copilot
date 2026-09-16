import { PROMPTS, type CohortResult, type CopilotResponse } from '../shared/contracts.js';
import { patient } from './data.js';

export const reviewQuestions = [
  'Which missing investigations would help distinguish the recorded historical patterns?',
  'Which medication, allergy and renal-function gaps need reconciliation?',
  'Are broad environmental similarities meaningful or incidental?',
  'Which differences and incomplete follow-up reduce cohort applicability?',
];
export function answerQuestion(question: string, cohort: CohortResult | null): CopilotResponse {
  const result: CopilotResponse = {
    mode: 'deterministic-demo',
    refused: false,
    answer: '',
    findings: [],
    reviewQuestions: [],
    limitations: [
      'Synthetic demonstration only. Requires qualified clinician review.',
      'Deterministic response templates, not a connected AI model.',
      'Similarity does not establish diagnosis, causation, or treatment safety.',
    ],
  };
  // Exact allowlist: free-form instructions never enter an LLM or execute tools.
  // Unknown requests fail closed, including paraphrased clinical recommendations.
  const index = PROMPTS.findIndex((p) => p.toLowerCase() === question.trim().toLowerCase());
  const fact = (statement: string, classification: string, evidenceIds: string[]) =>
    result.findings.push({ statement, classification, evidenceIds });
  if (index === -1 || index === 5) {
    result.refused = true;
    result.answer =
      'This demo cannot determine a diagnosis, recommend starting, stopping or changing medication, establish causality, or expose individual historical records. Historical treatment patterns cannot determine appropriate care. Patient-specific evidence, approved guidance and professional clinical judgment are required. Choose a supported evidence question to explore the synthetic record.';
  } else if (index === 0) {
    result.answer =
      'The record shows a change in temperature, not a confirmed explanation for the symptoms.';
    fact(
      'Temperature changed from 38.6 °C on January 14 to 38.2 °C on January 15, 2026 (−0.4 °C).',
      'Calculated metric',
      ['PAT-003'],
    );
    fact(
      'Fever, fatigue and dry cough were first recorded on January 12; January 15 is illness day 4.',
      'Recorded fact',
      ['PAT-001'],
    );
    fact('Confirmatory testing and a resolved outcome are unavailable.', 'Missing data', [
      'MISS-001',
    ]);
  } else if (index === 1 || index === 2) {
    if (!cohort || cohort.suppressed) {
      result.answer =
        'No reportable cohort is available. Find a comparable cohort or broaden the filters; protected small-cohort details are not disclosed.';
    } else {
      result.answer =
        index === 1
          ? 'The cohort was selected using versioned, deterministic comparison rules.'
          : 'These are recorded categories in synthetic historical cases, not a differential diagnosis for this patient.';
      fact(
        `${cohort.size} comparable cases; mean matching score ${cohort.meanScore}/100; mean record completeness ${cohort.completeness}%.`,
        'Calculated metric',
        [cohort.evidence[0].id],
      );
      if (index === 2) {
        const d = cohort.distributions[0];
        fact(
          d.suppressed
            ? 'Diagnostic distribution is withheld under the small-cell policy.'
            : d.rows.map((r) => `${r.label}: ${r.count} (${r.percent}%)`).join('; '),
          'Observed association',
          [d.evidenceId],
        );
      }
      fact(
        'Vaccination is unknown; medication compatibility and renal function are not modeled by the matching rules.',
        'Requires clinician review',
        ['MISS-001', cohort.evidence[0].id],
      );
    }
  } else if (index === 3) {
    result.answer = 'Missing values remain unknown; they are never treated as normal or negative.';
    for (const gap of patient.missing)
      fact(`${gap.label}: ${gap.detail}`, 'Missing data', [gap.evidenceId]);
  } else {
    result.answer =
      'Use these questions to structure professional review, not as an investigation order or treatment plan.';
    fact(
      'Current confirmation, exposure, medication reconciliation and outcome information is incomplete.',
      'Missing data',
      ['MISS-001'],
    );
    result.reviewQuestions = reviewQuestions;
  }
  return result;
}
