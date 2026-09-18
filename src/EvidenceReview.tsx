import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import {
  REVIEW_SCENARIOS,
  REVIEW_WARNING,
  type ReviewReport,
  type ReviewScenario,
  type ReviewStatus,
} from '../shared/review';

export function EvidenceReview({ patientId, online }: { patientId: string; online: boolean }) {
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [scenario, setScenario] = useState<ReviewScenario>('cardiology');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const pending = useRef<AbortController | null>(null);
  const path = `care/patients/${encodeURIComponent(patientId)}/evidence-review`;
  const output = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    const refresh = () => {
      const current = ++generation.current;
      pending.current?.abort();
      const controller = new AbortController();
      pending.current = controller;
      setReport(null);
      setConfirmed(false);
      setStatus(null);
      setBusy(false);
      setError('');
      if (!online) return;
      void api<ReviewStatus>(
        path,
        undefined,
        AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
      )
        .then((next) => {
          if (disposed || generation.current !== current) return;
          setStatus(next);
          if (next.scenarios.length) setScenario(next.scenarios[0]);
        })
        .catch(() => {
          if (!disposed && generation.current === current)
            setError('Evidence-review status unavailable. Refresh to retry.');
        });
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      disposed = true;
      generation.current++;
      pending.current?.abort();
      window.removeEventListener('focus', refresh);
    };
  }, [path, online, retry]);
  useEffect(() => {
    if (report) output.current?.focus();
  }, [report]);
  function cancel() {
    generation.current++;
    pending.current?.abort();
    setBusy(false);
    setReport(null);
    setConfirmed(false);
  }
  async function generate() {
    if (!confirmed || !online || !status?.available || !status.snapshotVersion || busy) return;
    const current = ++generation.current;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setReport(null);
    setError('');
    try {
      const next = await api<ReviewReport>(
        path,
        {
          scenario,
          snapshotVersion: status.snapshotVersion,
          syntheticOnly: true,
        },
        AbortSignal.any([controller.signal, AbortSignal.timeout(65000)]),
      );
      if (generation.current !== current) return;
      if (
        next.patientId !== patientId ||
        next.snapshotVersion !== status.snapshotVersion ||
        next.scenario !== scenario
      )
        throw new Error('Review snapshot changed.');
      setReport(next);
    } catch {
      if (generation.current === current) {
        setReport(null);
        setStatus(null);
        setError(
          'No draft available. Access, records, or local inference may have changed. Refresh before retrying.',
        );
      }
    } finally {
      if (generation.current === current) {
        setBusy(false);
        setConfirmed(false);
      }
    }
  }
  return (
    <section className="card health-section" aria-label="Evidence review">
      <h2>Local evidence-review pilot</h2>
      <p>{REVIEW_WARNING}</p>
      {!online && (
        <p role="status">Offline. Evidence review is unavailable; no drafts are cached.</p>
      )}
      {online && !status && !error && <p role="status">Checking review availability…</p>}
      {status && <p role="status">{status.message}</p>}
      {error && <p role="alert">{error}</p>}
      <button
        className="secondary"
        disabled={!online || busy}
        onClick={() => setRetry((n) => n + 1)}
      >
        Refresh review status
      </button>
      {status?.available && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void generate();
          }}
        >
          <fieldset disabled={!online || busy}>
            <label>
              Review scenario
              <select
                value={scenario}
                onChange={(event) => {
                  setScenario(event.target.value as ReviewScenario);
                  setReport(null);
                  setConfirmed(false);
                }}
              >
                {status.scenarios.map((key) => (
                  <option key={key} value={key}>
                    {REVIEW_SCENARIOS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="health-check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I confirm these are fictional records and authorize this local review of the selected
              snapshot.
            </label>
            <button type="submit" className="primary" disabled={!confirmed}>
              Generate evidence-review draft
            </button>
          </fieldset>
        </form>
      )}
      {busy && (
        <div role="status">
          Reviewing locally… <button onClick={cancel}>Cancel review</button>
        </div>
      )}
      {report && (
        <div
          ref={output}
          tabIndex={-1}
          aria-label="Evidence-review draft"
          style={{ overflowWrap: 'anywhere' }}
        >
          <h3>Unverified evidence-review draft</h3>
          <p>{report.warning}</p>
          <p>
            Scenario: {REVIEW_SCENARIOS[report.scenario]} · Generated: {report.generatedAt}
          </p>
          {(['patient', 'literature', 'cohort'] as const).map((kind) => (
            <section key={kind}>
              <h4>
                {kind === 'patient'
                  ? 'Recorded facts — not clinically verified'
                  : kind === 'literature'
                    ? 'Selected reviewed literature — verify applicability'
                    : 'Fictional cohort observations — not medical evidence'}
              </h4>
              {!report.sources.some((s) => s.kind === kind) && <p>No sources selected.</p>}
              {report.sources
                .filter((s) => s.kind === kind)
                .map((source) => (
                  <details key={source.id}>
                    <summary>
                      {source.id}: {source.title}
                    </summary>
                    <p>{source.text}</p>
                    {source.url?.startsWith('https://') && (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        Inspect original source
                      </a>
                    )}
                  </details>
                ))}
            </section>
          ))}
          <h4>Questions for qualified review</h4>
          <ul>
            {report.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
          <h4>Limitations and missing information</h4>
          <ul>
            {report.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <details>
            <summary>Snapshot and provenance versions</summary>
            <p>Snapshot: {report.snapshotVersion}</p>
            <ul>
              {Object.entries(report.versions).map(([key, value]) => (
                <li key={key}>
                  {key}: {value}
                </li>
              ))}
            </ul>
          </details>
          <button className="secondary" onClick={() => setReport(null)}>
            Discard draft
          </button>
        </div>
      )}
    </section>
  );
}
