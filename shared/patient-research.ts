import type { Person } from './care.js';
import type { Distribution } from './contracts.js';

export type PatientResearchContext = {
  dataVersion: string;
  sourceId: string;
  ageBand: string;
  asOf: string;
  presentation: string;
  environment: string;
  medicationReview: string;
  allergyReview: string;
  timeline: { date: string; title: string; detail: string }[];
  missing: { label: string; detail: string }[];
  provenance: string;
};

export type ConfirmedConditionSource = {
  visitId: string;
  revision: number;
  diagnosis: string;
  measuredAt: string;
};
export type PatientResearch = {
  patient: Person;
  context?: PatientResearchContext;
  dataVersion: string;
  matchingVersion: string;
  fixtureTotal?: number;
  unmatched: ConfirmedConditionSource[];
  matches: {
    condition: string;
    sources: ConfirmedConditionSource[];
    cohort: {
      suppressed: boolean;
      total: number | null;
      followup: { label: string; count: number }[];
      distributions?: Distribution[];
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
