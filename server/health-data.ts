import {
  emptyHealthDraft,
  parseHealthDraft,
  type DemoReport,
  type HealthDraft,
  type HealthKind,
  type HealthRecord,
} from '../shared/health.js';

const draft = (
  kind: HealthKind,
  value: string,
  changes: Partial<HealthDraft> = {},
): HealthDraft => ({
  ...emptyHealthDraft(kind),
  value,
  ...changes,
});

export function reportsForPatient(patient: { name: string; persona: string }): DemoReport[] {
  return [
    {
      id: 'SYN-REPORT-001',
      title: 'Synthetic blood test report',
      date: '2026-01-14',
      original: `SYNTHETIC SAMPLE — NOT A REAL LAB REPORT\nDemo persona: ${patient.name} · ${patient.persona}\nCollected: January 14, 2026, 09:00 (demo local time)\n\nHemoglobin: 13.8 g/dL   Printed reference: 12.0–16.0\nHbA1c: 5.8 %           Printed reference: 4.0–5.6\n\nReference ranges are fictional report content, not app advice.`,
      fields: [
        {
          draft: draft('lab', '13.8', {
            measuredAt: '2026-01-14T09:00',
            label: 'Hemoglobin',
            unit: 'g/dL',
            referenceRange: '12.0–16.0',
          }),
          reviewNote: 'Check the value, unit and date against the sample.',
        },
        {
          draft: draft('lab', '5.8', {
            measuredAt: '2026-01-14T09:00',
            label: 'HbA1c',
            unit: '%',
            referenceRange: '',
          }),
          reviewNote:
            'Simulated missing field: enter the printed reference range (4.0–5.6) or leave unknown. Never infer a missing range.',
        },
      ],
    },
    {
      id: 'SYN-REPORT-002',
      title: 'Synthetic diagnosis note',
      date: '2026-01-12',
      original: `SYNTHETIC SAMPLE — NOT A REAL CLINICAL NOTE\nDemo persona: ${patient.name} · ${patient.persona}\nRecorded: January 12, 2026, 14:30 (demo local time)\n\nRecorded diagnosis: Seasonal allergic rhinitis\nStatus: Recorded in fictional visit note; not independently verified.\nNo treatment recommendation is included.`,
      fields: [
        {
          draft: draft('diagnosis', 'Seasonal allergic rhinitis', {
            measuredAt: '2026-01-12T14:30',
            label: 'Visit diagnosis',
            notes: 'Recorded in fictional visit note; not independently verified.',
          }),
          reviewNote: 'Transcription only. Confirmation does not establish or verify a diagnosis.',
        },
      ],
    },
  ];
}
export const demoReports = reportsForPatient({ name: 'Sam Taylor', persona: 'SYN-USER-001' });

export function seedHealthRecords(): HealthRecord[] {
  const records: HealthDraft[] = [];
  for (let day = 11; day <= 15; day++) {
    const date = `2026-01-${day}`;
    records.push(
      draft('glucose', String(96 + (day % 3) * 4), {
        measuredAt: `${date}T08:00`,
        context: 'Fasting',
      }),
      draft('bp', String(118 + (day % 3) * 2), {
        measuredAt: `${date}T08:10`,
        secondary: String(76 + (day % 3)),
        pulse: '72',
      }),
      draft('walking', (2 + (day % 3) * 0.5).toFixed(1), {
        measuredAt: `${date}T17:00`,
        duration: '35',
      }),
    );
  }
  records.push(draft('running', '3.2', { measuredAt: '2026-01-14T18:00', duration: '24' }));
  return records.map((record, i) => ({
    ...parseHealthDraft(record),
    id: `SYN-ENTRY-${i + 1}`,
    source: 'seed',
  }));
}
