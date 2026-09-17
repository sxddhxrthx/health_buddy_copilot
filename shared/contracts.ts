export type Evidence = {
  id: string;
  title: string;
  classification: string;
  source: string;
  period: string;
  calculation: string;
  detail: string;
  limitations: string[];
};
export type PatientFact = { label: string; value: string; evidenceId: string };
export type PatientState = {
  id: string;
  name: string;
  ageBand: string;
  asOf: string;
  facts: PatientFact[];
  timeline: { date: string; title: string; detail: string; evidenceId: string }[];
  missing: { label: string; detail: string; evidenceId: string }[];
  evidence: Evidence[];
};
export type CohortFilters = {
  minScore: number;
  sameEnvironment: boolean;
  confirmedOnly: boolean;
  requireFollowup: boolean;
};
export const DEFAULT_FILTERS: CohortFilters = {
  minScore: 65,
  sameEnvironment: true,
  confirmedOnly: false,
  requireFollowup: false,
};
export const MATCH_VERSION = 'match-v1.0';
export const DATA_VERSION = 'synthetic-v1.0';
export const MIN_COHORT = 10;
export const MIN_CELL = 5;
export const WEIGHTS = {
  symptoms: 25,
  conditions: 20,
  course: 20,
  environment: 15,
  age: 10,
  quality: 10,
};
export type Distribution = {
  label: string;
  suppressed: boolean;
  rows: { label: string; count: number; percent: number }[];
  evidenceId: string;
};
export type CohortResult = {
  id: string;
  filters: CohortFilters;
  suppressed: boolean;
  size: number | null;
  total: number;
  eligible: number;
  meanScore: number | null;
  completeness: number | null;
  dimensions: { label: string; value: number; weight: number }[];
  distributions: Distribution[];
  comparisons: {
    area: string;
    patient: string;
    cohort: string;
    difference: string;
    evidenceId: string;
  }[];
  limitations: string[];
  evidence: Evidence[];
};
export type StudySnapshot = {
  name: string;
  protocol: string;
  target: number;
  enrolled: number;
  completedVisits: number;
  scheduledVisits: number;
  retained: number;
  sites: { name: string; enrolled: number; completed: number; scheduled: number }[];
  evidence: Evidence[];
};
export const PROMPTS = [
  'What changed in the patient’s condition?',
  'Why were these historical cases selected?',
  'Which diagnostic patterns were recorded in comparable cases?',
  'What information is missing?',
  'What questions should a clinician review?',
  'A matched case improved after a medicine. Should I prescribe the same medicine?',
] as const;
export type CopilotResponse = {
  mode: 'deterministic-demo';
  answer: string;
  refused: boolean;
  findings: { statement: string; classification: string; evidenceIds: string[] }[];
  reviewQuestions: string[];
  limitations: string[];
};
