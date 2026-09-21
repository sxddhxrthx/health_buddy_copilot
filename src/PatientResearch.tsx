import { useEffect, useState } from 'react';
import type { PatientResearch as Research } from '../shared/patient-research';
import { api } from './api';

export function PatientResearch({
  patientId,
  view,
  online,
  onPatient,
  onResearch,
}: {
  patientId: string;
  view: 'cohort' | 'study';
  online: boolean;
  onPatient: () => void;
  onResearch: (view: 'cohort' | 'study') => void;
}) {
  const [result, setResult] = useState<Research | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const load = () => {
      const current = ++generation;
      setResult(null);
      setError('');
      if (!online) return;
      void api<Research>(`care/patients/${encodeURIComponent(patientId)}/research`)
        .then((value) => {
          if (!cancelled && current === generation) setResult(value);
        })
        .catch((error: Error) => {
          if (!cancelled && current === generation) setError(error.message);
        });
    };
    load();
    window.addEventListener('focus', load);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', load);
    };
  }, [patientId, view, online, retry]);

  return (
    <div className="my-health">
      <section className="health-section" aria-label="Selected patient research">
        <h2>{result?.patient.name ?? 'Selected patient research'}</h2>
        <p>
          Synthetic-only demonstration. Associations use exact condition labels from finalized
          doctor-confirmed visits, never readings or personal entries. No diagnosis, severity
          detection, trial eligibility or treatment recommendation. Qualified human review required.
        </p>
        <p>
          Supported labels: Advanced heart failure, Hypertension, Type 2 diabetes, Asthma
          (case-insensitive).
        </p>
        <div className="health-actions">
          <button className="secondary" onClick={onPatient}>
            Return to Current patient
          </button>
          <button
            className="secondary"
            onClick={() => onResearch(view === 'cohort' ? 'study' : 'cohort')}
          >
            {view === 'cohort' ? 'View research details' : 'View cohort details'}
          </button>
        </div>
        {!online ? (
          <p role="status">Reconnect to load authorized patient research.</p>
        ) : error ? (
          <div className="error-banner" role="alert">
            {error}
            <button onClick={() => setRetry((value) => value + 1)}>Retry patient research</button>
          </div>
        ) : !result ? (
          <p role="status">Loading selected patient research…</p>
        ) : (
          <>
            <p>{result.patient.persona} / Fictional patient</p>
            {!result.matches.length && (
              <div role="status">
                {result.patient.persona === 'SYN-USER-001' && (
                  <section className="research-summary" aria-label="Routine-care comparison">
                    <h3>Routine-care comparison</h3>
                    <p>
                      Sam is the everyday-records example for this presentation. No supported
                      confirmed condition currently links this patient to a fictional study. This
                      does not establish that Sam is healthy or that readings are normal.
                    </p>
                    <p>
                      Compare this simpler view with Jordan’s bundled heart-condition scenario.
                      Return to Current patient to switch patients; existing entries stay separate.
                    </p>
                  </section>
                )}
                <p>
                  No matching synthetic cohort or associated study. No supported doctor-confirmed
                  condition is recorded in a current finalized visit.
                </p>
                <p>
                  Selecting {result.patient.name} does not create a condition or research match. For
                  a fictional demo match, return to Current patient, enter a supported label in
                  Diagnosis (fictional), choose Confirmed by author, acknowledge fictional-only
                  information, save the visit draft, and finalize it. Then reopen these details.
                  Readings and provisional or unfinalized visits do not produce matches.
                </p>
              </div>
            )}
            {result.unmatched.length > 0 && (
              <section aria-label="Unmatched confirmed conditions">
                <h3>No match for these recorded conditions</h3>
                <ul>
                  {result.unmatched.map((source) => (
                    <li key={source.visitId}>
                      {source.diagnosis} / visit {source.visitId}, revision {source.revision}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {result.matches.map((match) => (
              <article className="visit-record" key={match.condition} aria-label={match.condition}>
                <h3>{match.condition}</h3>
                {match.presentation && (
                  <section className="research-summary" aria-label="Presentation at a glance">
                    <span className="research-demo-label">
                      Fictional presentation • Not medical evidence
                    </span>
                    <h4>{match.presentation.headline}</h4>
                    <p>{match.presentation.explanation}</p>
                    <div className="research-highlights">
                      {match.presentation.highlights.map((item) => (
                        <div key={item.label}>
                          <h4>{item.label}</h4>
                          <p>{item.text}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {view === 'cohort' ? (
                  <>
                    <h4>Fictional condition-label cohort</h4>
                    {match.cohort.suppressed ? (
                      <p>Counts and follow-up cells suppressed: no reportable cohort.</p>
                    ) : (
                      <>
                        <p>{match.cohort.total} independently generated fictional cases</p>
                        <ul
                          className="research-bars"
                          aria-label="Fictional follow-up documentation"
                        >
                          {match.cohort.followup.map((cell) => (
                            <li key={cell.label}>
                              <span>
                                {cell.label}: <strong>{cell.count}</strong>
                                {match.cohort.total !== null && match.cohort.total > 0 && (
                                  <>
                                    {' '}
                                    of {match.cohort.total} (
                                    {Math.round((cell.count / match.cohort.total) * 100)}%)
                                  </>
                                )}
                              </span>
                              <meter
                                min={0}
                                max={match.cohort.total ?? 1}
                                value={cell.count}
                                aria-label={cell.label}
                              />
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <p>
                      Exact label association only; no clinical similarity score or diagnostic
                      probability. Follow-up categories are invented documentation patterns, not
                      outcomes or treatment evidence.
                    </p>
                    <p>Associated study: {match.study.id} — available in Research study.</p>
                  </>
                ) : (
                  <>
                    <h4>{match.study.title}</h4>
                    <p>
                      {match.study.id} / Bundled fictional study, not a real trial or publication
                    </p>
                    <p>{match.study.description}</p>
                    {match.presentation && (
                      <section className="research-study" aria-label="Study explained simply">
                        <h4>The question, in everyday language</h4>
                        <p>{match.presentation.studyQuestion}</p>
                        <h4>How this fictional study is organized</h4>
                        <p>{match.presentation.studyDesign}</p>
                        <ol>
                          {match.presentation.studySteps.map((step) => (
                            <li key={step.label}>
                              <strong>{step.label}</strong>
                              <p>{step.text}</p>
                            </li>
                          ))}
                        </ol>
                        <h4>What this cannot tell us</h4>
                        <p>{match.presentation.limitations}</p>
                      </section>
                    )}
                    <p>
                      Associated by recorded condition label only. No external registry, literature
                      search or model is connected.
                    </p>
                  </>
                )}
                <details>
                  <summary>Recorded condition sources</summary>
                  {match.sources.map((source) => (
                    <p key={source.visitId}>
                      {source.diagnosis} / {source.measuredAt.replace('T', ' ')} (demo local time)
                      {' / '}Finalized visit {source.visitId}, revision {source.revision}
                    </p>
                  ))}
                  <button className="secondary" onClick={onPatient}>
                    Review source visits in Current patient
                  </button>
                </details>
              </article>
            ))}
            <p className="card-footnote">
              Fixtures: {result.dataVersion} / Matching: {result.matchingVersion}. Alex Morgan
              reference data is not used.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
