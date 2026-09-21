import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { emptyVisitDraft, parseVisitDraft } from '../shared/care.js';
import type { PatientResearchContext } from '../shared/patient-research.js';

// Additive, one-time fictional provisioning; never rewrite an authored visit or sharing grant.
export function seedPresentationVisit(
  database: Database.Database,
  patientId: string,
  doctorId: string,
) {
  database.transaction(() => {
    if (database.prepare('SELECT 1 FROM app_migrations WHERE version = 5').get()) return;
    const { total } = database
      .prepare<[string], { total: number }>(
        'SELECT count(*) AS total FROM visits WHERE patient_id = ?',
      )
      .get(patientId)!;
    // A full workspace is preserved, not pruned or allowed to exceed its capacity.
    if (total < 200) {
      const visitId = randomUUID();
      const data = JSON.stringify(
        parseVisitDraft({
          ...emptyVisitDraft(),
          measuredAt: '2026-01-20T10:00',
          diagnosis: 'Advanced heart failure',
          diagnosisStatus: 'confirmed',
          summary:
            'BUNDLED FICTIONAL PRESENTATION SCENARIO — not a real medical assessment. ' +
            'Seeded under the demo author Dr Avery Chen, not confirmed by a real clinician. ' +
            'Jordan is the serious-heart-condition example; Sam is the routine-care comparison. ' +
            'Invented history: reduced stamina over three months, breathlessness during short walks, ' +
            'tiredness during everyday tasks and ankle swelling. Fictional echocardiogram: left ventricular ' +
            'ejection fraction 25%; fictional clinician-assigned functional class NYHA III. ' +
            'These details are authored scenario text, not interpretations of personal readings. ' +
            'Presentation timeline: initial fictional assessment on January 6; fictional cardiology ' +
            'review on January 13; this finalized summary on January 20, 2026 (demo-local dates). ' +
            'Research pages link only the exact confirmed condition label to independent invented ' +
            'documentation aggregates and a fictional study. No treatment, prognosis or trial eligibility ' +
            'is recommended. Existing personal entries remain unchanged and may not describe this scenario.',
        }),
      );
      const publishedAt = '2026-01-20T10:00:00Z';
      database
        .prepare("INSERT INTO visits VALUES (?, ?, ?, ?, 'finalized', 1, ?)")
        .run(visitId, patientId, doctorId, data, publishedAt);
      database
        .prepare('INSERT INTO visit_revisions VALUES (?, 1, ?, ?, ?)')
        .run(
          visitId,
          data,
          'Bundled fictional presentation seed; not a real clinician assessment',
          publishedAt,
        );
    }
    database.prepare('INSERT INTO app_migrations VALUES (5)').run();
  })();
}

export const PATIENT_SCENARIO_VERSION = 'patient-scenarios-v1';

const scenarios = [
  {
    persona: 'SYN-USER-001',
    doctor: 'SYN-DOCTOR-001',
    ageBand: '40-49',
    date: '2026-01-18',
    diagnosis: 'Hypertension',
    presentation: 'Routine follow-up in a fictional blood-pressure documentation scenario.',
    history: 'A fictional routine review precedes the bundled confirmed-condition visit.',
  },
  {
    persona: 'SYN-USER-002',
    doctor: 'SYN-DOCTOR-001',
    ageBand: '60-69',
    date: '2026-01-20',
    diagnosis: 'Advanced heart failure',
    presentation:
      'Reduced stamina, breathlessness during short walks and ankle swelling in the bundled fictional story.',
    history:
      'The invented presentation includes an initial assessment on January 6 and a cardiology review on January 13.',
  },
  {
    persona: 'SYN-USER-003',
    doctor: 'SYN-DOCTOR-002',
    ageBand: '30-39',
    date: '2026-01-19',
    diagnosis: 'Asthma',
    presentation: 'Episodic cough and wheeze in a fictional respiratory documentation scenario.',
    history:
      'A separate fictional respiratory review supplements, but does not replace, the original provisional sample visit.',
  },
];

export function seedPatientResearchScenarios(database: Database.Database) {
  database.transaction(() => {
    const hasScenarioContextTable = database
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'patient_research_context'",
      )
      .get();
    database.exec(`
      CREATE TABLE IF NOT EXISTS patient_research_context (
        patient_id TEXT PRIMARY KEY REFERENCES user(id), data TEXT NOT NULL
      );
    `);
    if (
      hasScenarioContextTable &&
      database.prepare('SELECT 1 FROM app_migrations WHERE version = 6').get()
    )
      return;
    for (const scenario of scenarios) {
      const patient = database
        .prepare<[string], { id: string }>(
          "SELECT user.id FROM user JOIN profiles ON profiles.user_id = user.id WHERE profiles.persona = ? AND user.role = 'patient'",
        )
        .get(scenario.persona);
      if (!patient) continue;
      const doctor = database
        .prepare<[string], { id: string }>(
          "SELECT user.id FROM user JOIN profiles ON profiles.user_id = user.id WHERE profiles.persona = ? AND user.role = 'doctor'",
        )
        .get(scenario.doctor);
      if (!doctor) throw new Error('Fictional scenario author is unavailable.');
      const context: PatientResearchContext = {
        dataVersion: PATIENT_SCENARIO_VERSION,
        sourceId: `SYN-SCENARIO-${scenario.persona}`,
        ageBand: scenario.ageBand,
        asOf: scenario.date,
        presentation: scenario.presentation,
        environment:
          'Winter / temperate / urban. Author-assigned fictional context, not location data.',
        medicationReview:
          'No medication reconciliation is established by this seed. Existing fictional prescriptions remain in Current patient.',
        allergyReview:
          'Allergies are unverified. Missing documentation does not mean no allergies.',
        timeline: [
          { date: '2026-01-15', title: 'Fictional scenario background', detail: scenario.history },
          {
            date: scenario.date,
            title: 'Bundled research scenario',
            detail:
              'Scenario context supplied for the synthetic demonstration. Current finalized visits, not this background text, determine study associations.',
          },
        ],
        missing: [
          {
            label: 'Medication and allergy reconciliation',
            detail:
              'Neither reconciliation nor verified allergy status is supplied by this fixture.',
          },
          {
            label: 'Vaccination, exposure and confirmatory testing',
            detail: 'Not supplied by this fixture; absence is not a negative result.',
          },
          {
            label: 'Follow-up outcomes',
            detail: 'No patient outcome is inferred from readings or independent study counts.',
          },
        ],
        provenance:
          'Bundled fictional scenario, not a real clinician assessment. Background is a fixed seed snapshot, not inferred from personal entries and not updated by visit amendments.',
      };
      database
        .prepare('INSERT OR IGNORE INTO patient_research_context VALUES (?, ?)')
        .run(patient.id, JSON.stringify(context));
      const visits = database
        .prepare<[string], { data: string; status: string }>(
          'SELECT data, status FROM visits WHERE patient_id = ?',
        )
        .all(patient.id);
      const hasScenario = visits.some((visit) => {
        const draft = parseVisitDraft(JSON.parse(visit.data));
        return (
          visit.status === 'finalized' &&
          draft.diagnosisStatus === 'confirmed' &&
          draft.diagnosis.toLowerCase() === scenario.diagnosis.toLowerCase()
        );
      });
      if (hasScenario || visits.length >= 200 || scenario.persona === 'SYN-USER-002') continue;
      const visitId = randomUUID();
      const data = JSON.stringify(
        parseVisitDraft({
          ...emptyVisitDraft(),
          measuredAt: `${scenario.date}T10:00`,
          diagnosis: scenario.diagnosis,
          diagnosisStatus: 'confirmed',
          summary:
            `BUNDLED FICTIONAL RESEARCH SCENARIO / ${PATIENT_SCENARIO_VERSION}. ` +
            `${scenario.presentation} ${scenario.history} ` +
            'This invented confirmed label is a demo association key, not a real medical assessment. ' +
            'No diagnosis is inferred from personal readings. No medication, treatment, eligibility or outcome is recommended. ' +
            'Existing entries, visits and sharing grants remain unchanged.',
        }),
      );
      const publishedAt = `${scenario.date}T10:00:00Z`;
      database
        .prepare("INSERT INTO visits VALUES (?, ?, ?, ?, 'finalized', 1, ?)")
        .run(visitId, patient.id, doctor.id, data, publishedAt);
      database
        .prepare('INSERT INTO visit_revisions VALUES (?, 1, ?, ?, ?)')
        .run(
          visitId,
          data,
          `Bundled fictional scenario / ${PATIENT_SCENARIO_VERSION}; not a real clinician assessment`,
          publishedAt,
        );
    }
    database.prepare('INSERT OR IGNORE INTO app_migrations VALUES (6)').run();
  })();
}
