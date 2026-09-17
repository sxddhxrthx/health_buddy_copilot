import {
  emptyHealthDraft,
  parseHealthDraft,
  type DemoReport,
  type HealthRecord,
} from './health.js';

export type Account = { id: string; name: string; email: string; role: 'patient' | 'doctor' };
export type Person = { id: string; name: string; persona: string };
export type SharingDoctor = Person & { active: boolean };
export type VisitDraft = {
  measuredAt: string;
  diagnosis: string;
  diagnosisStatus: 'provisional' | 'confirmed';
  medication: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
  summary: string;
};
export type Visit = {
  id: string;
  doctorId: string;
  doctorName: string;
  status: 'draft' | 'finalized';
  revision: number;
  draft: VisitDraft;
  history: { revision: number; draft: VisitDraft; reason: string; publishedAt: string }[];
};
export type CareSnapshot = {
  patient: Person;
  records: HealthRecord[];
  reports: DemoReport[];
  importedReportIds: string[];
  visits: Visit[];
};
export function emptyVisitDraft(): VisitDraft {
  return {
    measuredAt: '2026-01-15T10:00',
    diagnosis: '',
    diagnosisStatus: 'provisional',
    medication: '',
    dose: '',
    route: '',
    frequency: '',
    duration: '',
    instructions: '',
    summary: '',
  };
}
export function parseVisitDraft(input: unknown): VisitDraft {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid visit.');
  const raw = input as Record<string, unknown>;
  const result = emptyVisitDraft();
  for (const key of Object.keys(result) as (keyof VisitDraft)[]) {
    const value = raw[key];
    if (typeof value !== 'string' || value.length > (key === 'summary' ? 1500 : 500))
      throw new Error(`Invalid visit ${key}.`);
    Object.assign(result, { [key]: value.trim() });
  }
  parseHealthDraft({ ...emptyHealthDraft(), measuredAt: result.measuredAt, value: '0' });
  if (!['provisional', 'confirmed'].includes(result.diagnosisStatus))
    throw new Error('Choose a diagnosis status.');
  if (!result.diagnosis && !result.medication)
    throw new Error('Record a diagnosis or a fictional prescription.');
  if (result.medication && (!result.dose || !result.route || !result.frequency || !result.duration))
    throw new Error('Complete the dose, route, frequency and duration.');
  if (
    !result.medication &&
    [result.dose, result.route, result.frequency, result.duration, result.instructions].some(
      Boolean,
    )
  )
    throw new Error('A medicine name is required for prescription details.');
  return result;
}
