import type { Evidence, PatientState, StudySnapshot } from '../shared/contracts.js';
import { DATA_VERSION } from '../shared/contracts.js';

export const patient: PatientState = {
  id: 'SYN-CURRENT-001',
  name: 'Alex Morgan',
  ageBand: '50–59',
  asOf: '2026-01-15',
  facts: [
    {
      label: 'Presenting symptoms',
      value: 'Fever, fatigue, dry cough · day 4',
      evidenceId: 'PAT-001',
    },
    {
      label: 'Chronic conditions',
      value: 'Diabetes · hypertension · dyslipidemia',
      evidenceId: 'PAT-002',
    },
    {
      label: 'Recorded medications',
      value: 'Metformin · lisinopril · atorvastatin',
      evidenceId: 'PAT-002',
    },
    {
      label: 'Latest observations',
      value: '38.2 °C · SpO₂ 97% · pulse 92 bpm',
      evidenceId: 'PAT-003',
    },
    {
      label: 'Environmental context',
      value: 'Winter · temperate climate · urban setting',
      evidenceId: 'ENV-001',
    },
    {
      label: 'Allergy record',
      value: 'No allergy entry available · not verified',
      evidenceId: 'MISS-001',
    },
  ],
  timeline: [
    {
      date: '2026-01-08',
      title: 'Routine care review',
      detail: 'Chronic conditions and medication list recorded. Reconciliation is not documented.',
      evidenceId: 'PAT-002',
    },
    {
      date: '2026-01-12',
      title: 'Symptoms first recorded',
      detail: 'Patient-reported fever, fatigue, and dry cough. No specific exposure documented.',
      evidenceId: 'PAT-001',
    },
    {
      date: '2026-01-14',
      title: 'Initial observations',
      detail: 'Temperature 38.6 °C; oxygen saturation 97%. Synthetic encounter record.',
      evidenceId: 'PAT-003',
    },
    {
      date: '2026-01-15',
      title: 'Follow-up encounter',
      detail:
        'Temperature 38.2 °C; persistent fatigue. Confirmatory testing and follow-up outcomes unavailable.',
      evidenceId: 'PAT-003',
    },
  ],
  missing: [
    {
      label: 'Confirmatory testing',
      detail: 'No pathogen-confirmation result is available.',
      evidenceId: 'MISS-001',
    },
    {
      label: 'Vaccination & exposure history',
      detail: 'Vaccination status and specific exposures are not documented.',
      evidenceId: 'MISS-001',
    },
    {
      label: 'Medication & allergy reconciliation',
      detail: 'Medication list is seven days old; allergies are unverified.',
      evidenceId: 'MISS-001',
    },
    {
      label: 'Renal function & outcomes',
      detail: 'No recent renal-function measurement or resolved outcome is available.',
      evidenceId: 'MISS-001',
    },
  ],
  evidence: [
    {
      id: 'PAT-001',
      title: 'Symptom onset and course',
      classification: 'Recorded fact',
      source: 'Synthetic Encounter / SYN-ENC-012',
      period: '2026-01-12 – 2026-01-15',
      calculation: 'Inclusive illness day = UTC date difference + 1 = 4.',
      detail: 'Fever, fatigue and dry cough recorded on January 12. Exposure unspecified.',
      limitations: ['Patient-reported onset; no diagnostic inference.'],
    },
    {
      id: 'PAT-002',
      title: 'Conditions and medication context',
      classification: 'Recorded fact',
      source: 'Synthetic Condition + MedicationRequest / SYN-REVIEW-008',
      period: '2026-01-08',
      calculation: 'Source-faithful display; no medication recommendation.',
      detail:
        'Diabetes, hypertension, dyslipidemia. Metformin, lisinopril and atorvastatin recorded.',
      limitations: [
        'Not reconciled at current encounter.',
        'Dose, adherence and contraindications are not established.',
      ],
    },
    {
      id: 'PAT-003',
      title: 'Longitudinal observations',
      classification: 'Recorded fact',
      source: 'Synthetic Observation / SYN-OBS-014 + SYN-OBS-015',
      period: '2026-01-14 – 2026-01-15',
      calculation: 'Temperature difference = 38.2 − 38.6 = −0.4 °C.',
      detail: 'Jan 14: 38.6 °C, SpO₂ 97%. Jan 15: 38.2 °C, SpO₂ 97%, pulse 92 bpm.',
      limitations: ['Two observations do not establish recovery or a diagnosis.'],
    },
    {
      id: 'ENV-001',
      title: 'Broad environmental context',
      classification: 'Recorded fact',
      source: 'Synthetic context / SYN-ENV-WINTER',
      period: '2026-01-12 – 2026-01-15',
      calculation: 'Manually assigned winter / temperate / urban categories.',
      detail:
        'Broad synthetic context only. No location, weather service or live environmental feed is used.',
      limitations: ['Environmental overlap is not evidence of causation.'],
    },
    {
      id: 'MISS-001',
      title: 'Patient record completeness review',
      classification: 'Missing data',
      source: 'Synthetic patient schema / SYN-CURRENT-001',
      period: 'As of 2026-01-15',
      calculation: 'Required-field presence check; no missing value is imputed.',
      detail:
        'Confirmation, vaccination, exposure, verified allergies, reconciliation, recent renal function and outcome fields are absent.',
      limitations: ['Missing does not mean normal, negative or not applicable.'],
    },
  ],
};

// Server-only synthetic rows. They are never included in API responses or web assets.
export type HistoricalCase = {
  id: string;
  symptoms: string[];
  conditions: string[];
  duration: number;
  season: string;
  climate: string;
  ageBand: string;
  completeness: number;
  confirmed: boolean;
  followup: boolean;
  provenance: boolean;
  year: number;
  diagnosis: string;
  investigation: string;
  treatment: string;
  outcome: string;
};
export function generateCases(count = 480, seed = 2026): HistoricalCase[] {
  let state = seed >>> 0;
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const choose = <T>(values: T[]) => values[Math.floor(rand() * values.length)];
  return Array.from({ length: count }, (_, i) => {
    const followup = rand() > 0.2;
    return {
      id: `SYN-HIST-${i.toString().padStart(4, '0')}`,
      symptoms: rand() < 0.85 ? ['fever', 'fatigue', 'cough'] : ['fatigue'],
      conditions:
        rand() < 0.7
          ? ['diabetes', 'hypertension', 'dyslipidemia']
          : choose([['diabetes'], ['hypertension'], []]),
      duration: choose([2, 3, 4, 5, 6, 8]),
      season: rand() < 0.75 ? 'winter' : 'summer',
      climate: rand() < 0.8 ? 'temperate' : 'tropical',
      ageBand: rand() < 0.7 ? '50–59' : '60–69',
      completeness: choose([0.5, 0.7, 0.8, 0.9, 1]),
      confirmed: rand() < 0.65,
      followup,
      provenance: rand() > 0.05,
      year: rand() < 0.95 ? 2025 : 2021,
      diagnosis: choose([
        'Recorded viral respiratory illness',
        'Recorded bacterial respiratory illness',
        'Unspecified febrile illness',
      ]),
      investigation: choose(['Pathogen testing', 'Blood panel', 'Imaging']),
      treatment: choose([
        'Supportive care recorded',
        'Antimicrobial category recorded',
        'No treatment category recorded',
      ]),
      outcome: followup
        ? choose(['Improvement recorded', 'Symptoms persisted', 'Further evaluation recorded'])
        : 'Follow-up unavailable',
    };
  });
}
export const historicalCases = generateCases();

export function getStudy(): StudySnapshot {
  const participants = Array.from({ length: 120 }, (_, i) => ({
    site: i % 3,
    retained: i % 10 !== 0,
    scheduled: 3,
    completed: i % 5 === 0 ? 2 : 3,
  }));
  const sites = ['North research site', 'Central research site', 'South research site'].map(
    (name, site) => {
      const rows = participants.filter((p) => p.site === site);
      return {
        name,
        enrolled: rows.length,
        completed: rows.reduce((n, p) => n + p.completed, 0),
        scheduled: rows.reduce((n, p) => n + p.scheduled, 0),
      };
    },
  );
  const evidence: Evidence = {
    id: 'STUDY-001',
    title: 'WINTER-26 operational snapshot',
    classification: 'Calculated metric',
    source: `Synthetic study participant generator / ${DATA_VERSION}`,
    period: 'As of 2026-01-15',
    calculation:
      'Enrollment = participant count; retention = active / enrolled; visit completion = completed / scheduled. Group by broad synthetic site.',
    detail: '120 enrolled; target 150; 108 retained; 336 of 360 scheduled visits completed.',
    limitations: [
      'Fictional observational study, not a registered trial.',
      'Visit completion does not establish protocol compliance or study safety.',
      'No autonomous eligibility or adverse-event classification.',
    ],
  };
  return {
    name: 'WINTER-26',
    protocol: 'Observational respiratory-context study · protocol v1.0',
    target: 150,
    enrolled: participants.length,
    retained: participants.filter((p) => p.retained).length,
    completedVisits: sites.reduce((n, s) => n + s.completed, 0),
    scheduledVisits: sites.reduce((n, s) => n + s.scheduled, 0),
    sites,
    evidence: [evidence],
  };
}
