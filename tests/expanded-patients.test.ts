import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRuntime } from '../server/runtime.js';

test('old three-patient stores upgrade additively and never reseed existing profiles or grants', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'research-twin-upgrade-'));
  let runtime: Awaited<ReturnType<typeof createRuntime>> | undefined;
  try {
    runtime = await createRuntime({ directory });
    const db = runtime.database;
    // Model the old store using only this isolated test database; no developer data is touched.
    db.exec(`CREATE TEMP TABLE added AS SELECT user_id AS id FROM profiles WHERE persona >= 'SYN-USER-004';
      DELETE FROM visit_revisions WHERE visit_id IN (SELECT id FROM visits WHERE patient_id IN (SELECT id FROM added));
      DELETE FROM visits WHERE patient_id IN (SELECT id FROM added);
      DELETE FROM health_records WHERE patient_id IN (SELECT id FROM added);
      DELETE FROM sharing WHERE patient_id IN (SELECT id FROM added);
      DELETE FROM profiles WHERE user_id IN (SELECT id FROM added);
      DELETE FROM account WHERE userId IN (SELECT id FROM added);
      DELETE FROM user WHERE id IN (SELECT id FROM added);
      DELETE FROM app_migrations WHERE version = 7; DROP TABLE added;
      UPDATE sharing SET active = 0;`);
    const credentialsFile = join(directory, 'demo-accounts.json');
    const originalCredentials = (
      JSON.parse(readFileSync(credentialsFile, 'utf8')) as { email: string; password: string }[]
    ).filter((entry) => !entry.email.startsWith('synthetic-'));
    writeFileSync(credentialsFile, JSON.stringify(originalCredentials), { mode: 0o600 });
    const originals = ['health_records', 'visits', 'visit_revisions', 'sharing'].map((table) => ({
      table,
      rows: db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[],
    }));
    runtime.close();
    runtime = undefined;
    runtime = await createRuntime({ directory });
    for (const original of originals) {
      const current = runtime.database.prepare(`SELECT * FROM ${original.table}`).all();
      for (const row of original.rows)
        assert.ok(
          current.some((entry) => JSON.stringify(entry) === JSON.stringify(row)),
          `${original.table} original preserved`,
        );
    }
    const credentials = JSON.parse(readFileSync(credentialsFile, 'utf8')) as {
      email: string;
      password: string;
    }[];
    assert.equal(credentials.length, 202);
    for (const original of originalCredentials)
      assert.deepEqual(
        credentials.find((entry) => entry.email === original.email),
        original,
      );
    assert.equal(
      runtime.database
        .prepare<[], { total: number }>("SELECT count(*) AS total FROM user WHERE role = 'patient'")
        .get()!.total,
      200,
    );
    const patient = runtime.database
      .prepare<[], { user_id: string }>(
        "SELECT user_id FROM profiles WHERE persona = 'SYN-USER-004'",
      )
      .get()!.user_id;
    runtime.database.prepare('UPDATE sharing SET active = 0 WHERE patient_id = ?').run(patient);
    runtime.database.prepare('DELETE FROM health_records WHERE patient_id = ?').run(patient);
    const visits = runtime.database
      .prepare('SELECT * FROM visits WHERE patient_id = ?')
      .all(patient);
    runtime.close();
    runtime = undefined;
    runtime = await createRuntime({ directory });
    assert.deepEqual(
      runtime.database.prepare('SELECT * FROM visits WHERE patient_id = ?').all(patient),
      visits,
    );
    assert.equal(
      runtime.database
        .prepare<[string], { total: number }>(
          'SELECT count(*) AS total FROM health_records WHERE patient_id = ?',
        )
        .get(patient)!.total,
      0,
    );
    assert.equal(
      runtime.database
        .prepare<[string], { total: number }>(
          'SELECT count(*) AS total FROM sharing WHERE patient_id = ? AND active = 1',
        )
        .get(patient)!.total,
      0,
    );
  } finally {
    runtime?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
