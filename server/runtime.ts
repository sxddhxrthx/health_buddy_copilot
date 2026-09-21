import Database from 'better-sqlite3';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { getMigrations } from 'better-auth/db/migration';
import { randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { seedHealthRecords } from './health-data.js';
import { emptyVisitDraft } from '../shared/care.js';
import { seedPresentationVisit } from './presentation-seed.js';

export const DEMO_ACCOUNTS = [
  { email: 'sam@patient.example', name: 'Sam Taylor', role: 'patient', persona: 'SYN-USER-001' },
  { email: 'jordan@patient.example', name: 'Jordan Lee', role: 'patient', persona: 'SYN-USER-002' },
  { email: 'casey@patient.example', name: 'Casey Patel', role: 'patient', persona: 'SYN-USER-003' },
  {
    email: 'avery@doctor.example',
    name: 'Dr Avery Chen',
    role: 'doctor',
    persona: 'SYN-DOCTOR-001',
  },
  {
    email: 'riley@doctor.example',
    name: 'Dr Riley Shah',
    role: 'doctor',
    persona: 'SYN-DOCTOR-002',
  },
] as const;

export async function createRuntime(options: { directory?: string; baseURL?: string } = {}) {
  const directory = resolve(options.directory ?? process.env.RESEARCH_TWIN_DATA_DIR ?? '.local');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  if (process.platform === 'win32') {
    const identity = execFileSync('whoami', { encoding: 'utf8' }).trim();
    execFileSync(
      'icacls',
      [directory, '/inheritance:r', '/grant:r', `${identity}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F'],
      { stdio: 'pipe' },
    );
  }
  const secretFile = join(directory, 'auth-secret');
  const credentialsFile = join(directory, 'demo-accounts.json');
  const databaseFile = join(directory, 'research-twin.sqlite');
  if (existsSync(databaseFile) && (!existsSync(secretFile) || !existsSync(credentialsFile)))
    throw new Error(
      'Local authentication files are missing. Restore the matching database and authentication backup.',
    );
  if (!existsSync(secretFile))
    writeFileSync(secretFile, randomBytes(48).toString('base64url'), { mode: 0o600, flag: 'wx' });
  const secret = readFileSync(secretFile, 'utf8');
  const database = new Database(databaseFile);
  chmodSync(databaseFile, 0o600);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.pragma('busy_timeout = 5000');
  const baseURL = options.baseURL ?? process.env.APP_ORIGIN ?? 'http://localhost:5173';
  const auth = betterAuth({
    database,
    secret,
    baseURL,
    trustedOrigins: [baseURL],
    emailAndPassword: { enabled: true, minPasswordLength: 12 },
    user: {
      additionalFields: { role: { type: 'string', defaultValue: 'patient', input: false } },
    },
    session: {
      expiresIn: 8 * 60 * 60,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: new URL(baseURL).protocol === 'https:',
      ipAddress: { ipAddressHeaders: ['x-research-twin-client-ip'] },
    },
    databaseHooks: {
      session: {
        create: {
          before: async () => {
            database.prepare('DELETE FROM session WHERE expiresAt <= ?').run(Date.now());
            const count = database
              .prepare<[], { total: number }>('SELECT count(*) AS total FROM session')
              .get()!;
            if (count.total >= 200)
              throw new APIError('TOO_MANY_REQUESTS', {
                message: 'Demo session capacity reached.',
              });
          },
        },
      },
    },
    rateLimit: { enabled: true, window: 60, max: 30, storage: 'database' },
    logger: { disabled: true },
  });
  try {
    const migration = await getMigrations(auth.options);
    await migration.runMigrations();
    database.exec(`
      CREATE TABLE IF NOT EXISTS app_migrations (version INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY REFERENCES user(id), persona TEXT NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS health_records (
        id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES user(id), data TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS records_patient ON health_records(patient_id);
      CREATE TABLE IF NOT EXISTS imported_reports (
        patient_id TEXT NOT NULL REFERENCES user(id), report_id TEXT NOT NULL,
        PRIMARY KEY (patient_id, report_id)
      );
      CREATE TABLE IF NOT EXISTS sharing (
        patient_id TEXT NOT NULL REFERENCES user(id), doctor_id TEXT NOT NULL REFERENCES user(id),
        active INTEGER NOT NULL CHECK (active IN (0, 1)), updated_at TEXT NOT NULL,
        PRIMARY KEY (patient_id, doctor_id)
      );
      CREATE TABLE IF NOT EXISTS visits (
        id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES user(id),
        doctor_id TEXT NOT NULL REFERENCES user(id), data TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('draft', 'finalized')),
        revision INTEGER NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS visit_revisions (
        visit_id TEXT NOT NULL REFERENCES visits(id), revision INTEGER NOT NULL,
        data TEXT NOT NULL, reason TEXT NOT NULL, published_at TEXT NOT NULL,
        PRIMARY KEY (visit_id, revision)
      );
      INSERT OR IGNORE INTO app_migrations(version) VALUES (1);
      CREATE TRIGGER IF NOT EXISTS session_capacity BEFORE INSERT ON session
      WHEN (SELECT count(*) FROM session) >= 200
      BEGIN
        SELECT RAISE(ABORT, 'Demo session capacity reached.');
      END;
      INSERT OR IGNORE INTO app_migrations(version) VALUES (4);
    `);
    const credentials: { email: string; password: string }[] = existsSync(credentialsFile)
      ? JSON.parse(readFileSync(credentialsFile, 'utf8'))
      : DEMO_ACCOUNTS.map(({ email }) => ({
          email,
          password: randomBytes(24).toString('base64url'),
        }));
    if (!existsSync(credentialsFile))
      writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2), {
        mode: 0o600,
        flag: 'wx',
      });
    const ids = new Map<string, string>();
    for (const account of DEMO_ACCOUNTS) {
      let user = database.prepare('SELECT id FROM user WHERE email = ?').get(account.email) as
        { id: string } | undefined;
      if (!user) {
        const credential = credentials.find(({ email }) => email === account.email);
        if (!credential)
          throw new Error('Demo provisioning data is incomplete. Restore its backup.');
        const result = await auth.api.signUpEmail({
          body: { email: account.email, name: account.name, password: credential.password },
        });
        user = result.user;
        database.prepare('UPDATE user SET role = ? WHERE id = ?').run(account.role, user.id);
        database.prepare('DELETE FROM session WHERE userId = ?').run(user.id);
      }
      ids.set(account.email, user.id);
      if (!database.prepare('SELECT 1 FROM profiles WHERE user_id = ?').get(user.id)) {
        const userId = user.id;
        database.transaction(() => {
          database
            .prepare('INSERT INTO profiles(user_id, persona) VALUES (?, ?)')
            .run(userId, account.persona);
          if (account.role === 'patient') {
            for (const record of seedHealthRecords()) {
              const entry = { ...record, id: randomUUID() };
              database
                .prepare('INSERT INTO health_records VALUES (?, ?, ?)')
                .run(entry.id, userId, JSON.stringify(entry));
            }
          }
        })();
      }
    }
    if (!database.prepare('SELECT 1 FROM app_migrations WHERE version = 2').get()) {
      database.transaction(() => {
        for (const [patientEmail, doctorEmail] of [
          ['sam@patient.example', 'avery@doctor.example'],
          ['jordan@patient.example', 'avery@doctor.example'],
          ['casey@patient.example', 'riley@doctor.example'],
        ]) {
          database
            .prepare('INSERT INTO sharing VALUES (?, ?, 1, ?)')
            .run(ids.get(patientEmail), ids.get(doctorEmail), new Date().toISOString());
        }
        database.prepare('INSERT INTO app_migrations VALUES (2)').run();
      })();
    }
    if (!database.prepare('SELECT 1 FROM app_migrations WHERE version = 3').get()) {
      database.transaction(() => {
        const visitId = randomUUID();
        const data = JSON.stringify({
          ...emptyVisitDraft(),
          diagnosis: 'Fictional sample visit finding',
          diagnosisStatus: 'provisional',
          medication: 'Demo medicine - not for use',
          dose: 'Fictional dose text',
          route: 'Fictional route',
          frequency: 'Fictional schedule',
          duration: 'Fictional duration',
          summary:
            'Synthetic seeded documentation. Not a medical assessment or a valid prescription.',
        });
        database
          .prepare("INSERT INTO visits VALUES (?, ?, ?, ?, 'finalized', 1, ?)")
          .run(
            visitId,
            ids.get('casey@patient.example'),
            ids.get('riley@doctor.example'),
            data,
            '2026-01-15T10:00:00Z',
          );
        database
          .prepare('INSERT INTO visit_revisions VALUES (?, 1, ?, ?, ?)')
          .run(visitId, data, 'Seeded fictional visit', '2026-01-15T10:00:00Z');
        database.prepare('INSERT INTO app_migrations VALUES (3)').run();
      })();
    }
    seedPresentationVisit(
      database,
      ids.get('jordan@patient.example')!,
      ids.get('avery@doctor.example')!,
    );
    return { auth, database, baseURL, directory, close: () => database.close() };
  } catch (error) {
    database.close();
    throw error;
  }
}

export type Runtime = Awaited<ReturnType<typeof createRuntime>>;
