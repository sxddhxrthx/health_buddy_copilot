import type { Person } from './care.js';

export type ConfirmedConditionSource = {
  visitId: string;
  revision: number;
  diagnosis: string;
  measuredAt: string;
};
export type PatientResearch = {
  patient: Person;
  dataVersion: string;
  matchingVersion: string;
  unmatched: ConfirmedConditionSource[];
  matches: {
    condition: string;
    sources: ConfirmedConditionSource[];
    cohort: {
      suppressed: boolean;
      total: number | null;
      followup: { label: string; count: number }[];
    };
    study: { id: string; title: string; description: string };
    presentation?: {
      headline: string;
      explanation: string;
      highlights: { label: string; text: string }[];
      studyQuestion: string;
      studyDesign: string;
      studySteps: { label: string; text: string }[];
      limitations: string;
    };
  }[];
};
