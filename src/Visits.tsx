import { useEffect, useRef, useState } from 'react';
import { Check, FilePenLine, Save } from 'lucide-react';
import { api } from './api';
import {
  emptyVisitDraft,
  parseVisitDraft,
  type Account,
  type SharingDoctor,
  type Visit,
  type VisitDraft,
} from '../shared/care';

type Mutation = (
  body: Record<string, unknown>,
  message: string,
  success?: () => void,
) => Promise<void>;

function VisitContent({ draft }: { draft: VisitDraft }) {
  return (
    <div className="visit-content">
      <time>{draft.measuredAt.replace('T', ' / ')} (demo local time)</time>
      {draft.diagnosis && (
        <div>
          <h4>Diagnosis recorded by doctor</h4>
          <p>{draft.diagnosis}</p>
          <p>Status: {draft.diagnosisStatus}</p>
        </div>
      )}
      {draft.medication && (
        <div>
          <h4>Fictional prescription</h4>
          <dl className="visit-prescription">
            <dt>Medicine</dt>
            <dd>{draft.medication}</dd>
            <dt>Dose</dt>
            <dd>{draft.dose}</dd>
            <dt>Route</dt>
            <dd>{draft.route}</dd>
            <dt>Frequency</dt>
            <dd>{draft.frequency}</dd>
            <dt>Duration</dt>
            <dd>{draft.duration}</dd>
            <dt>Instructions</dt>
            <dd>{draft.instructions || 'None recorded'}</dd>
          </dl>
        </div>
      )}
      {draft.summary && (
        <div>
          <h4>Visit summary</h4>
          <p>{draft.summary}</p>
        </div>
      )}
    </div>
  );
}

export function Visits({
  visits,
  account,
  disabled,
  mutate,
  onDirtyChange,
}: {
  visits: Visit[];
  account: Account;
  disabled: boolean;
  mutate: Mutation;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState(emptyVisitDraft);
  const [editing, setEditing] = useState<Visit | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const form = useRef<HTMLFormElement>(null);
  const dirty = editing !== null || JSON.stringify(draft) !== JSON.stringify(emptyVisitDraft());
  useEffect(() => {
    onDirtyChange?.(dirty);
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      onDirtyChange?.(false);
      window.removeEventListener('beforeunload', warn);
    };
  }, [dirty, onDirtyChange]);
  function clear() {
    setDraft(emptyVisitDraft());
    setEditing(null);
    setReason('');
    setConfirmed(false);
    setError('');
  }
  function field(key: keyof VisitDraft, label: string, required = false, type = 'text') {
    return (
      <label>
        {label}
        <input
          type={type}
          value={draft[key]}
          required={required}
          maxLength={500}
          onChange={(event) => {
            setDraft({ ...draft, [key]: event.target.value });
            setConfirmed(false);
          }}
        />
      </label>
    );
  }
  return (
    <section className="health-section" aria-label="Doctor visit records">
      <h2>{account.role === 'doctor' ? 'Visits and documentation' : 'Your doctor visits'}</h2>
      <p>Fictional clinician-authored records. Not medical advice or a valid prescription.</p>
      {account.role === 'doctor' && (
        <form
          ref={form}
          aria-label="Visit documentation"
          onSubmit={(event) => {
            event.preventDefault();
            if (!confirmed) return;
            try {
              const validated = parseVisitDraft(draft);
              setError('');
              void mutate(
                {
                  action: editing ? (editing.status === 'finalized' ? 'amend' : 'save') : 'create',
                  visitId: editing?.id,
                  revision: editing?.revision,
                  draft: validated,
                  reason,
                },
                editing?.status === 'finalized' ? 'Amendment published.' : 'Visit draft saved.',
                clear,
              );
            } catch (error) {
              setError((error as Error).message);
            }
          }}
        >
          <h3>
            {editing
              ? editing.status === 'finalized'
                ? 'Amend finalized visit'
                : 'Edit visit draft'
              : 'Current visit'}
          </h3>
          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}
          <fieldset disabled={disabled}>
            <div className="health-fields">
              {field('measuredAt', 'Visit date and time', true, 'datetime-local')}
              {field('diagnosis', 'Diagnosis (fictional)')}
              <label>
                Diagnosis status
                <select
                  value={draft.diagnosisStatus}
                  onChange={(event) => {
                    setDraft({
                      ...draft,
                      diagnosisStatus: event.target.value as VisitDraft['diagnosisStatus'],
                    });
                    setConfirmed(false);
                  }}
                >
                  <option value="provisional">Provisional</option>
                  <option value="confirmed">Confirmed by author</option>
                </select>
              </label>
              {field('medication', 'Medicine (fictional)')}
              {field('dose', 'Dose', !!draft.medication)}
              {field('route', 'Route', !!draft.medication)}
              {field('frequency', 'Frequency', !!draft.medication)}
              {field('duration', 'Duration', !!draft.medication)}
              {field('instructions', 'Prescription instructions')}
              <label className="health-full">
                Visit summary
                <textarea
                  maxLength={1500}
                  value={draft.summary}
                  onChange={(event) => {
                    setDraft({ ...draft, summary: event.target.value });
                    setConfirmed(false);
                  }}
                />
              </label>
              {editing?.status === 'finalized' && (
                <label className="health-full">
                  Amendment reason
                  <input
                    required
                    maxLength={500}
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      setConfirmed(false);
                    }}
                  />
                </label>
              )}
            </div>
            <label className="health-check">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I confirm this visit contains fictional demo information only.
            </label>
            <div className="health-actions">
              <button className="primary" disabled={!confirmed}>
                <Save size={16} />
                {editing?.status === 'finalized' ? 'Publish amendment' : 'Save visit draft'}
              </button>
              {dirty && (
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    if (window.confirm('Discard unsaved visit changes?')) clear();
                  }}
                >
                  Cancel visit edit
                </button>
              )}
            </div>
          </fieldset>
        </form>
      )}
      {!visits.length && <p>No {account.role === 'patient' ? 'finalized ' : ''}visits yet.</p>}
      {visits.map((visit) => (
        <article
          className="visit-record"
          key={visit.id}
          aria-label={`Visit by ${visit.doctorName}`}
        >
          <div className="health-actions">
            <h3>{visit.doctorName}</h3>
            <span className="pill">
              {visit.status === 'draft' ? 'Private draft' : 'Finalized'} / revision {visit.revision}
            </span>
          </div>
          <VisitContent draft={visit.draft} />
          {account.role === 'doctor' && visit.doctorId === account.id && (
            <div className="health-actions">
              <button
                className="secondary"
                disabled={disabled || dirty}
                onClick={() => {
                  setEditing(visit);
                  setDraft({ ...visit.draft });
                  setConfirmed(false);
                  form.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
                }}
              >
                <FilePenLine size={16} />
                {visit.status === 'draft' ? 'Edit visit draft' : 'Amend visit'}
              </button>
              {visit.status === 'draft' && (
                <button
                  className="primary"
                  disabled={disabled || dirty}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Finalize this fictional visit and publish it to the patient? Later corrections will preserve the original.',
                      )
                    )
                      void mutate(
                        { action: 'finalize', visitId: visit.id, revision: visit.revision },
                        'Visit finalized and published.',
                      );
                  }}
                >
                  <Check size={16} />
                  Finalize visit
                </button>
              )}
            </div>
          )}
          {visit.history.length > 0 && (
            <details>
              <summary>Published revision history ({visit.history.length})</summary>
              {visit.history.map((entry) => (
                <div className="visit-revision" key={entry.revision}>
                  <strong>Revision {entry.revision}</strong>
                  <p>{entry.reason}</p>
                  <p>Published: {entry.publishedAt}</p>
                  <VisitContent draft={entry.draft} />
                </div>
              ))}
            </details>
          )}
        </article>
      ))}
    </section>
  );
}

export function Sharing({ disabled }: { disabled: boolean }) {
  const [doctors, setDoctors] = useState<SharingDoctor[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    api<SharingDoctor[]>('care/sharing')
      .then((value) => {
        if (!cancelled) {
          setDoctors(value);
          setError('');
        }
      })
      .catch((error: Error) => {
        if (!cancelled) setError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);
  return (
    <section className="health-section" aria-label="Doctor sharing">
      <h2>Sharing with your doctors</h2>
      <p>
        Sharing includes all current and future records and finalized visits. Stopping sharing
        blocks future access; it cannot retract information already viewed.
      </p>
      {error && (
        <div role="alert" className="error-banner">
          {error}
          <button disabled={busy || disabled} onClick={() => setRetry((value) => value + 1)}>
            Retry sharing
          </button>
        </div>
      )}
      {doctors.map((doctor) => (
        <label className="health-check" key={doctor.id}>
          <input
            type="checkbox"
            disabled={disabled || busy}
            checked={doctor.active}
            onChange={async () => {
              if (
                lock.current ||
                !window.confirm(
                  doctor.active
                    ? `Stop sharing with ${doctor.name}?`
                    : `Share all fictional records, including future records, with ${doctor.name}?`,
                )
              )
                return;
              lock.current = true;
              setBusy(true);
              setError('');
              try {
                await api('care/sharing', {
                  doctorId: doctor.id,
                  active: !doctor.active,
                  syntheticOnly: true,
                });
                setDoctors(await api<SharingDoctor[]>('care/sharing'));
              } catch (error) {
                setError((error as Error).message);
              } finally {
                lock.current = false;
                setBusy(false);
              }
            }}
          />
          Share all records with {doctor.name}
        </label>
      ))}
    </section>
  );
}
