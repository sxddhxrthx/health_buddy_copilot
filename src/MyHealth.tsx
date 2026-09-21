import { useEffect, useId, useRef, useState } from 'react';
import { Activity, FileText, HeartPulse, PersonStanding, Plus, RefreshCw } from 'lucide-react';
import { api, ApiError } from './api';
import type { Account, CareSnapshot, Person } from '../shared/care';
import { Sharing, Visits } from './Visits';
import { BodyMap } from './BodyMap';
import { HealthConnections } from './HealthConnections';
import {
  HEALTH_KINDS,
  GLUCOSE_CONTEXTS,
  emptyHealthDraft,
  parseHealthDraft,
  healthValue,
  trendKey,
  type HealthDraft,
  type HealthKind,
  type HealthRecord,
  type DemoReport,
} from '../shared/health';
import './health.css';

const dateTime = (value: string) => value.replace('T', ' · ');
const recordName = (record: HealthDraft) => record.label || HEALTH_KINDS[record.kind].label;
const sourceLabel = (record: HealthRecord) =>
  record.source === 'synthetic-checkup'
    ? 'Synthetic checkup fixture / not clinically verified'
    : record.source === 'manual'
      ? 'Manually entered · synthetic'
      : record.source === 'seed'
        ? 'Seeded synthetic entry'
        : 'Simulated report · user-confirmed, not clinically verified';

function EntryFields({
  draft,
  change,
  fixedKind = false,
}: {
  draft: HealthDraft;
  change: (draft: HealthDraft) => void;
  fixedKind?: boolean;
}) {
  const id = useId();
  const set = (key: keyof HealthDraft, value: string) => change({ ...draft, [key]: value });
  const input = (
    key: keyof HealthDraft,
    label: string,
    options: { type?: string; required?: boolean; maxLength?: number } = {},
  ) => (
    <label htmlFor={`${id}-${key}`}>
      {label}
      <input
        id={`${id}-${key}`}
        type={options.type ?? 'text'}
        value={draft[key]}
        required={options.required}
        maxLength={options.maxLength ?? 200}
        step={
          options.type === 'number'
            ? draft.kind === 'steps' && key === 'value'
              ? '1'
              : 'any'
            : undefined
        }
        min={options.type === 'number' ? '0' : undefined}
        onChange={(event) => set(key, event.target.value)}
      />
    </label>
  );
  const textual = draft.kind === 'diagnosis' || draft.kind === 'other';
  return (
    <div className="health-fields">
      <label htmlFor={`${id}-kind`}>
        Record type
        <select
          id={`${id}-kind`}
          value={draft.kind}
          disabled={fixedKind}
          onChange={(event) =>
            change({
              ...emptyHealthDraft(event.target.value as HealthKind),
              measuredAt: draft.measuredAt,
            })
          }
        >
          {Object.entries(HEALTH_KINDS).map(([key, spec]) => (
            <option value={key} key={key}>
              {spec.label}
            </option>
          ))}
        </select>
      </label>
      {input('measuredAt', 'Measured / recorded at (demo local time)', {
        type: 'datetime-local',
        required: true,
      })}
      {(draft.kind === 'lab' || textual) &&
        input('label', 'Test or record name', { required: true, maxLength: 80 })}
      {input('value', draft.kind === 'bp' ? 'Systolic' : textual ? 'Recorded finding' : 'Value', {
        type: textual ? 'text' : 'number',
        required: true,
      })}
      {draft.kind === 'bp' && (
        <>
          {input('secondary', 'Diastolic', { type: 'number', required: true })}
          {input('pulse', 'Pulse (bpm, optional)', { type: 'number' })}
        </>
      )}
      {!textual && (
        <label htmlFor={`${id}-unit`}>
          Unit
          <select
            id={`${id}-unit`}
            value={draft.unit}
            onChange={(event) => set('unit', event.target.value)}
          >
            {HEALTH_KINDS[draft.kind].units.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </label>
      )}
      {draft.kind === 'glucose' && (
        <label htmlFor={`${id}-context`}>
          Glucose context
          <select
            id={`${id}-context`}
            value={draft.context}
            onChange={(event) => set('context', event.target.value)}
          >
            {GLUCOSE_CONTEXTS.map((context) => (
              <option key={context}>{context}</option>
            ))}
          </select>
        </label>
      )}
      {(draft.kind === 'walking' || draft.kind === 'running') &&
        input('duration', 'Duration (minutes, optional)', { type: 'number' })}
      {!textual &&
        !['walking', 'running', 'steps'].includes(draft.kind) &&
        input('referenceRange', 'Printed reference range (optional)', { maxLength: 80 })}
      <label className="health-full" htmlFor={`${id}-notes`}>
        Notes (fictional only)
        <textarea
          id={`${id}-notes`}
          maxLength={500}
          value={draft.notes}
          onChange={(event) => set('notes', event.target.value)}
        />
      </label>
    </div>
  );
}

function Trends({ records }: { records: HealthRecord[] }) {
  const [selected, setSelected] = useState('');
  const numeric = records.filter((r) => !['diagnosis', 'other'].includes(r.kind));
  const groups = [...new Map(numeric.map((record) => [trendKey(record), record])).entries()];
  const key = groups.some(([key]) => key === selected) ? selected : groups[0]?.[0];
  const series = numeric
    .filter((r) => trendKey(r) === key)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt))
    .slice(-14);
  const values = series.flatMap((r) =>
    r.kind === 'bp' ? [Number(r.value), Number(r.secondary)] : [Number(r.value)],
  );
  const min = Math.min(...values),
    max = Math.max(...values);
  const x = (index: number) =>
    series.length === 1 ? 300 : 25 + (index * 550) / (series.length - 1);
  const y = (value: string) =>
    max === min ? 90 : 150 - ((Number(value) - min) / (max - min)) * 120;
  return (
    <section className="card health-section" aria-label="Health trends">
      <h2>Trends over time</h2>
      <p>
        Last 14 readings per series. Units, test names and glucose contexts stay separate; no
        clinical interpretation.
      </p>
      {groups.length ? (
        <>
          <label>
            Trend series
            <select value={key} onChange={(event) => setSelected(event.target.value)}>
              {groups.map(([key, r]) => (
                <option key={key} value={key}>
                  {recordName(r)} · {r.unit}
                  {r.context ? ` · ${r.context}` : ''}
                </option>
              ))}
            </select>
          </label>
          <svg
            className="health-chart"
            viewBox="0 0 600 180"
            role="img"
            aria-label={`${recordName(series[0])} trend. Exact readings are listed below.`}
          >
            <line x1="25" y1="150" x2="575" y2="150" stroke="#d6e3df" />
            <polyline
              points={series.map((r, i) => `${x(i)},${y(r.value)}`).join(' ')}
              fill="none"
              stroke="#147e71"
              strokeWidth="3"
            />
            {series[0].kind === 'bp' && (
              <polyline
                points={series.map((r, i) => `${x(i)},${y(r.secondary)}`).join(' ')}
                fill="none"
                stroke="#635aa7"
                strokeWidth="3"
                strokeDasharray="6 3"
              />
            )}
            {series.map((r, i) => (
              <circle key={r.id} cx={x(i)} cy={y(r.value)} r="4" fill="#147e71" />
            ))}
          </svg>
          <p>
            Chronological readings, equally spaced; vertical scale fits this series, not a clinical
            range. {series[0].kind === 'bp' && 'Solid teal: systolic; dashed purple: diastolic.'}
          </p>
          <details>
            <summary>Show exact trend readings</summary>
            <ul>
              {series.map((r) => (
                <li key={r.id}>
                  {dateTime(r.measuredAt)}: {healthValue(r)}
                </li>
              ))}
            </ul>
          </details>
        </>
      ) : (
        <p>No numeric records yet. Add a fictional reading to start a trend.</p>
      )}
    </section>
  );
}

export function MyHealth({
  online,
  account,
  patientId,
  onDirtyChange,
}: {
  online: boolean;
  account: Account;
  patientId?: string;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const readOnly = account.role === 'doctor';
  const [session, setSession] = useState<CareSnapshot | null>(null);
  const [reports, setReports] = useState<DemoReport[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const generation = useRef(0);
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState(emptyHealthDraft());
  const [editing, setEditing] = useState<string>();
  const [fictional, setFictional] = useState(false);
  const [reportId, setReportId] = useState('SYN-REPORT-001');
  const [sourceReportId, setSourceReportId] = useState('');
  const [extracted, setExtracted] = useState<HealthDraft[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [bodyMapOpen, setBodyMapOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const sourceRef = useRef<HTMLElement>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setSession(null);
    setError('');
    const load = () => {
      if (lock.current) return;
      const request = ++generation.current;
      void api<CareSnapshot>(
        readOnly ? `care/patients/${patientId}` : 'health-demo',
        readOnly ? undefined : { action: 'read' },
      )
        .then((next) => {
          if (!cancelled && request === generation.current) {
            setSession(next);
            setReports(next.reports);
            setError('');
          }
        })
        .catch((error: Error) => {
          if (!cancelled && request === generation.current) {
            setError(error.message);
            if (readOnly) setSession(null);
          }
        })
        .finally(() => {
          if (!cancelled && request === generation.current) setLoading(false);
        });
    };
    load();
    window.addEventListener('focus', load);
    window.addEventListener('online', load);
    return () => {
      cancelled = true;
      generation.current++;
      window.removeEventListener('focus', load);
      window.removeEventListener('online', load);
    };
  }, [retry, patientId, readOnly]);

  async function mutate(body: Record<string, unknown>, message: string, success?: () => void) {
    if (lock.current || !session || !online) return;
    lock.current = true;
    const request = ++generation.current;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const next = await api<CareSnapshot>(
        readOnly ? `care/patients/${patientId}/visits` : 'health-demo',
        {
          ...body,
          syntheticOnly: true,
        },
      );
      if (request !== generation.current) return;
      setSession(next);
      setStatus(message);
      success?.();
    } catch (error) {
      if (request === generation.current) {
        setError((error as Error).message);
        if (readOnly && error instanceof ApiError && [403, 404].includes(error.status))
          setSession(null);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function clearEntry() {
    setDraft(emptyHealthDraft());
    setEditing(undefined);
    setFictional(false);
  }
  const selectedReport = reports.find(
    (report) => report.id === reportId && report.fields.length > 0,
  );
  const imported = session?.importedReportIds.includes(reportId);
  const records = [...(session?.records ?? [])].sort((a, b) =>
    b.measuredAt.localeCompare(a.measuredAt),
  );
  const visible = records.filter(
    (r) =>
      (filter === 'all' || r.kind === filter) &&
      `${recordName(r)} ${r.value} ${r.notes} ${r.reportId ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const disabled = busy || !online;
  function chooseReport(id: string) {
    setReportId(id);
    setExtracted(null);
    setConfirmed(false);
  }

  return (
    <div className="my-health">
      <section className="patient-banner" aria-label="Patient summary">
        <div className="patient-identity">
          <div className="avatar">
            <HeartPulse size={22} />
          </div>
          <div>
            <h2>{session?.patient.name ?? 'Patient records'}</h2>
            <p>{session?.patient.persona} · Synthetic persona · January 2026</p>
          </div>
        </div>
        <div className="patient-banner-actions">
          <span className="pill">Synthetic only</span>
          <button
            type="button"
            className="secondary patient-body-map"
            disabled={busy || loading || !session}
            aria-haspopup="dialog"
            onClick={() => setBodyMapOpen(true)}
          >
            <PersonStanding size={18} />
            Body map
          </button>
        </div>
      </section>
      <div className="notice">
        <strong>Practice with fictional data only. Do not enter real health information.</strong>
        <p>
          Records are stored in the local demo database. No actual OCR or real uploads.
          {readOnly
            ? ' Patient-entered records are read-only and not clinically verified.'
            : ' Only you can change your personal entries. Finalized doctor visits cannot be edited or deleted here.'}{' '}
          Personal records never enter reference matching or research cohorts.
        </p>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button disabled={busy || !online} onClick={() => setRetry((n) => n + 1)}>
            {readOnly ? 'Retry patient records' : 'Retry My Health'}
          </button>
        </div>
      )}
      <div role="status" aria-live="polite">
        {busy ? 'Saving demo changes…' : status}
      </div>
      {loading ? (
        <p role="status">Loading personal health demo…</p>
      ) : !session ? (
        <p>No patient records are available. Check your connection and access.</p>
      ) : (
        <>
          <div className="health-actions">
            <span>
              {records.length} synthetic records · demo-local dates (no timezone conversion)
            </span>
            {!readOnly && (
              <button
                className="secondary"
                disabled={disabled}
                onClick={() => {
                  if (
                    window.confirm(
                      'Reset your fictional personal entries? Added entries and imports will be removed. Doctor visits and sharing choices will be kept.',
                    )
                  )
                    void mutate({ action: 'reset' }, 'Demo reset to seeded records.', () => {
                      clearEntry();
                      setExtracted(null);
                      setConfirmed(false);
                      setSearch('');
                      setFilter('all');
                    });
                }}
              >
                <RefreshCw size={16} />
                Reset demo records
              </button>
            )}
          </div>
          <section className="health-summary" aria-label="Latest health readings">
            {(['glucose', 'bp', 'walking', 'running'] as const).map((kind) => {
              const record = records.find((r) => r.kind === kind);
              return (
                <article className="card" key={kind}>
                  <HeartPulse size={18} />
                  <h3>{HEALTH_KINDS[kind].label}</h3>
                  <strong>{record ? healthValue(record) : 'No entries'}</strong>
                  <p>
                    {record ? dateTime(record.measuredAt) : 'Add a fictional reading'}
                    {record?.context && ` · ${record.context}`}
                  </p>
                </article>
              );
            })}
          </section>
          {!readOnly && (
            <HealthConnections
              sample={session.sampleCheckups}
              disabled={disabled}
              load={() => {
                if (
                  window.confirm(
                    `Add ${session.sampleCheckups.records} fictional checkup entries for ${session.patient.name}? Existing entries and visits will be kept. No provider is contacted.`,
                  )
                )
                  void mutate(
                    { action: 'load-checkups', confirmed: true },
                    'Synthetic checkups loaded. Body map is ready.',
                    () => setBodyMapOpen(true),
                  );
              }}
            />
          )}
          <Visits
            visits={session.visits}
            account={account}
            disabled={disabled}
            mutate={mutate}
            onDirtyChange={onDirtyChange}
          />
          {!readOnly && <Sharing disabled={disabled} />}
          <div className="health-columns">
            {!readOnly && (
              <form
                className="card health-section"
                ref={formRef}
                aria-label="Manual health entry"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!fictional) return;
                  try {
                    const record = parseHealthDraft(draft);
                    void mutate(
                      { action: 'save', record, recordId: editing },
                      editing ? 'Demo entry updated.' : 'Demo entry saved.',
                      clearEntry,
                    );
                  } catch (error) {
                    setError((error as Error).message);
                  }
                }}
              >
                <h2>
                  <Plus size={18} />
                  {editing ? 'Edit health entry' : 'Add a daily health entry'}
                </h2>
                <p>
                  Manual entry · fictional values only. Validation checks format, not medical
                  meaning.
                </p>
                <fieldset disabled={disabled}>
                  <EntryFields
                    draft={draft}
                    change={(draft) => {
                      setDraft(draft);
                      setFictional(false);
                    }}
                    fixedKind={!!editing}
                  />
                  <label className="health-check">
                    <input
                      type="checkbox"
                      required
                      checked={fictional}
                      onChange={(e) => setFictional(e.target.checked)}
                    />
                    I am entering fictional demo data only.
                  </label>
                  <div className="health-actions">
                    <button className="primary" disabled={!fictional} type="submit">
                      {editing ? 'Save changes' : 'Save demo entry'}
                    </button>
                    {editing && (
                      <button type="button" className="secondary" onClick={clearEntry}>
                        Cancel edit
                      </button>
                    )}
                  </div>
                </fieldset>
              </form>
            )}
            <Trends records={records} />
          </div>
          {!readOnly && (
            <section className="card health-section" aria-label="Synthetic report library">
              <h2>
                <FileText size={18} />
                Report library & simulated scanning
              </h2>
              <p>
                Bundled fictional samples only. No camera or file upload is enabled. “Simulate
                extraction” loads predefined fields, not OCR.
              </p>
              <fieldset disabled={disabled}>
                <label>
                  Sample report
                  <select value={reportId} onChange={(e) => chooseReport(e.target.value)}>
                    {reports
                      .filter((report) => report.fields.length > 0)
                      .map((report) => (
                        <option key={report.id} value={report.id}>
                          {report.title}
                          {session.importedReportIds.includes(report.id) ? ' · imported' : ''}
                        </option>
                      ))}
                  </select>
                </label>
                {selectedReport && (
                  <div className="health-columns report-review">
                    <div>
                      <h3>Original synthetic sample · {selectedReport.id}</h3>
                      <pre className="health-report">{selectedReport.original}</pre>
                      <button
                        className="secondary"
                        type="button"
                        disabled={imported}
                        onClick={() => {
                          setExtracted(selectedReport.fields.map((field) => ({ ...field.draft })));
                          setConfirmed(false);
                          setStatus('Simulated fields ready. Review and correct before saving.');
                        }}
                      >
                        Simulate extraction
                      </button>
                      {imported && (
                        <p role="status">
                          Already imported. Edit or delete individual results in the timeline. Reset
                          the demo to import again.
                        </p>
                      )}
                    </div>
                    <div>
                      {!extracted ? (
                        <p>
                          Preview the sample, then simulate extraction. Nothing is added to your
                          records until you confirm.
                        </p>
                      ) : (
                        <form
                          aria-label="Review simulated extraction"
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (!confirmed) return;
                            try {
                              const records = extracted.map(parseHealthDraft);
                              void mutate(
                                { action: 'import', reportId, records, confirmed: true },
                                'Report results saved after user review. Not clinically verified.',
                                () => {
                                  setExtracted(null);
                                  setConfirmed(false);
                                },
                              );
                            } catch (error) {
                              setError((error as Error).message);
                            }
                          }}
                        >
                          <h3>Review extracted fields · simulation</h3>
                          {extracted.map((draft, index) => (
                            <div className="health-extraction" key={`${reportId}-${index}`}>
                              <p className="notice">{selectedReport.fields[index].reviewNote}</p>
                              <EntryFields
                                draft={draft}
                                fixedKind
                                change={(draft) => {
                                  setExtracted(
                                    extracted.map((old, i) => (i === index ? draft : old)),
                                  );
                                  setConfirmed(false);
                                }}
                              />
                            </div>
                          ))}
                          <label className="health-check">
                            <input
                              type="checkbox"
                              checked={confirmed}
                              required
                              onChange={(event) => setConfirmed(event.target.checked)}
                            />
                            I reviewed all fields against this synthetic sample. This is not
                            clinical verification.
                          </label>
                          <div className="health-actions">
                            <button
                              className="primary"
                              disabled={!confirmed || imported}
                              type="submit"
                            >
                              Confirm and save report
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => {
                                setExtracted(null);
                                setConfirmed(false);
                              }}
                            >
                              Cancel extraction
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </fieldset>
            </section>
          )}
          {session.importedReportIds.length > 0 && (
            <section
              className="health-section"
              ref={sourceRef}
              aria-label={readOnly ? 'Shared source reports' : 'Saved source reports'}
            >
              <h2>{readOnly ? 'Shared source reports' : 'Saved source reports'}</h2>
              {reports
                .filter((report) => session.importedReportIds.includes(report.id))
                .map((report) => (
                  <details key={report.id} open={sourceReportId === report.id}>
                    <summary>
                      {report.title} / {report.id}
                    </summary>
                    <pre className="health-report">{report.original}</pre>
                  </details>
                ))}
            </section>
          )}
          <section className="card health-section" aria-label="Health record timeline">
            <h2>
              <Activity size={18} />
              Health record timeline
            </h2>
            <div className="health-fields">
              <label>
                Search records
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Test, finding, note or report ID"
                />
              </label>
              <label>
                Filter record type
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">All records</option>
                  {Object.entries(HEALTH_KINDS).map(([key, spec]) => (
                    <option value={key} key={key}>
                      {spec.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p>{visible.length} matching records</p>
            {!visible.length && (
              <p>No matching records. Add a fictional entry or clear the filters.</p>
            )}
            <div className="health-records">
              {visible.map((record) => (
                <article key={record.id} aria-label={`${recordName(record)} ${record.measuredAt}`}>
                  <div>
                    <time>{dateTime(record.measuredAt)}</time>
                    <h3>{recordName(record)}</h3>
                    <strong>{healthValue(record)}</strong>
                    <p>{sourceLabel(record)}</p>
                    {record.context && <p>Context: {record.context}</p>}
                    {record.pulse && <p>Pulse: {record.pulse} bpm</p>}
                    {record.duration && <p>Duration: {record.duration} minutes</p>}
                    {(record.kind === 'lab' || record.referenceRange) && (
                      <p>
                        Printed reference range: {record.referenceRange || 'Not recorded'} (source
                        text, not app interpretation)
                      </p>
                    )}
                    {record.notes && <p>{record.notes}</p>}
                    {record.reportId && (
                      <button
                        className="health-source"
                        onClick={() => {
                          setSourceReportId(record.reportId!);
                          sourceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                      >
                        View source {record.reportId}
                      </button>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="health-actions">
                      <button
                        className="secondary"
                        disabled={disabled}
                        onClick={() => {
                          setDraft({ ...record });
                          setEditing(record.id);
                          setFictional(false);
                          formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          formRef.current
                            ?.querySelector<HTMLInputElement>('input')
                            ?.focus({ preventScroll: true });
                        }}
                      >
                        Edit entry
                      </button>
                      <button
                        className="secondary"
                        disabled={disabled}
                        onClick={() => {
                          if (window.confirm(`Delete this synthetic ${recordName(record)} entry?`))
                            void mutate(
                              { action: 'delete', recordId: record.id },
                              'Demo entry deleted.',
                              () => {
                                if (editing === record.id) clearEntry();
                              },
                            );
                        }}
                      >
                        Delete entry
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
          {bodyMapOpen && (
            <BodyMap
              records={records}
              reports={reports}
              patientName={session.patient.name}
              online={online}
              close={() => setBodyMapOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

export function DoctorWorkspace({
  account,
  online,
  dirty,
  onDirtyChange,
  selected,
  onSelect,
  onResearch,
}: {
  account: Account;
  online: boolean;
  dirty: boolean;
  onDirtyChange: (dirty: boolean) => void;
  selected: string;
  onSelect: (id: string) => void;
  onResearch: (view: 'cohort' | 'study') => void;
}) {
  const [patients, setPatients] = useState<Person[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const load = () => {
      const current = ++generation;
      void api<Person[]>('care/patients')
        .then((value) => {
          if (!cancelled && current === generation) {
            setPatients(value);
            setError('');
            if (selected && !value.some((person) => person.id === selected)) onSelect('');
          }
        })
        .catch((error: Error) => {
          if (!cancelled && current === generation) {
            setPatients([]);
            onSelect('');
            setError(error.message);
          }
        });
    };
    load();
    window.addEventListener('focus', load);
    window.addEventListener('online', load);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', load);
      window.removeEventListener('online', load);
    };
  }, [retry, selected, onSelect]);
  return (
    <div className="my-health">
      <section className="health-section" aria-label="Shared patient selection">
        <label>
          Search shared patients
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label>
          Current patient
          <select
            value={selected}
            disabled={!online}
            onChange={(event) => {
              if (!dirty || window.confirm('Discard unsaved visit changes and switch patients?'))
                onSelect(event.target.value);
            }}
          >
            <option value="">Choose a shared patient</option>
            {patients
              .filter(
                (person) =>
                  person.id === selected ||
                  `${person.name} ${person.persona}`.toLowerCase().includes(search.toLowerCase()),
              )
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name} / {person.persona}
                </option>
              ))}
          </select>
        </label>
        {error && (
          <div role="alert" className="error-banner">
            {error}
            <button disabled={!online} onClick={() => setRetry((value) => value + 1)}>
              Retry patient list
            </button>
          </div>
        )}
        {!patients.length && !error && <p>No patients are currently sharing with you.</p>}
        {selected && (
          <div className="health-actions" aria-label="Selected patient research navigation">
            <button className="secondary" onClick={() => onResearch('cohort')}>
              View cohort details
            </button>
            <button className="secondary" onClick={() => onResearch('study')}>
              View research details
            </button>
          </div>
        )}
      </section>
      {selected && (
        <MyHealth
          key={selected}
          account={account}
          online={online}
          patientId={selected}
          onDirtyChange={onDirtyChange}
        />
      )}
    </div>
  );
}
