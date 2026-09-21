import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { emptyVisitDraft, parseVisitDraft } from '../shared/care.js';

const firstNames = [
  'Robin',
  'Jamie',
  'Drew',
  'Cameron',
  'Quinn',
  'Rowan',
  'Skyler',
  'Reese',
  'Ari',
  'Emery',
  'Finley',
  'Sage',
  'Blair',
  'Dakota',
  'Kendall',
  'Lane',
  'Parker',
  'Remy',
  'Shiloh',
  'Tatum',
];
const lastNames = [
  'Brooks',
  'Rivera',
  'Ellis',
  'Kim',
  'Reed',
  'Santos',
  'Bell',
  'Gray',
  'Singh',
  'Woods',
];

export const EXPANDED_PATIENTS = Array.from({ length: 197 }, (_, index) => {
  const number = String(index + 4).padStart(3, '0');
  return {
    email: `synthetic-${number}@patient.example`,
    name: `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length)]}`,
    role: 'patient' as const,
    persona: `SYN-USER-${number}`,
  };
});

// Called only inside a new profile's provisioning transaction. Never runs on an existing profile.
export function seedExpandedPatient(database: Database.Database, patientId: string, index: number) {
  const doctors = database
    .prepare("SELECT id FROM user WHERE role = 'doctor' ORDER BY email")
    .all() as { id: string }[];
  if (doctors.length !== 2)
    throw new Error('Demo doctors must be provisioned before new patients.');
  for (const doctor of doctors) {
    database
      .prepare('INSERT INTO sharing VALUES (?, ?, 1, ?)')
      .run(patientId, doctor.id, '2026-01-20T10:00:00Z');
  }
  const conditions = ['Advanced heart failure', 'Hypertension', 'Type 2 diabetes', 'Asthma'];
  for (let visit = 0; visit < 2; visit++) {
    const day = visit === 0 ? '06' : '20';
    const diagnosis = conditions[(index + (index % 5 === 0 ? visit : 0)) % conditions.length];
    const data = JSON.stringify(
      parseVisitDraft({
        ...emptyVisitDraft(),
        measuredAt: `2026-01-${day}T10:00`,
        diagnosis,
        diagnosisStatus: 'confirmed',
        summary: `BUNDLED FICTIONAL SCENARIO ${index + 4} — ${visit === 0 ? 'Initial documentation' : 'Follow-up documentation'}. ${diagnosis} is an authored demo label, not a real clinician assessment or an interpretation of personal readings. Personal records and independent research fixtures remain separate. No treatment or trial eligibility recommendation.`,
      }),
    );
    const id = randomUUID();
    const published = `2026-01-${day}T10:00:00Z`;
    database
      .prepare("INSERT INTO visits VALUES (?, ?, ?, ?, 'finalized', 1, ?)")
      .run(id, patientId, doctors[index % doctors.length].id, data, published);
    database
      .prepare('INSERT INTO visit_revisions VALUES (?, 1, ?, ?, ?)')
      .run(
        id,
        data,
        'Bundled fictional population seed v1; not a real clinician assessment',
        published,
      );
  }
}
