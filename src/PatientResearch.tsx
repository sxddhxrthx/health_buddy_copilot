import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, FlaskConical, Users } from 'lucide-react';
import type { PatientResearch as Research } from '../shared/patient-research';
import { api } from './api';
import { PatientCohort } from './PatientCohort';

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

  if (view === 'cohort' && online && !error && result) {
    return (
      <PatientCohort
        result={result}
        onPatient={onPatient}
        onStudy={() => onResearch('study')}
        onRefresh={() => setRetry((value) => value + 1)}
      />
    );
  }

  return (
    <div className="my-health patient-research">
      <section className="research-content" aria-label="Selected patient research">
        {result && online && !error ? (
          <section className="patient-banner" aria-label="Research patient summary">
            <div className="patient-identity">
              <div className="avatar" aria-hidden="true">
                {result.patient.name
                  .split(' ')
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <div className="patient-title">
                  <h2>{result.patient.name}</h2>
                  <span className="pill">Synthetic patient</span>
                </div>
                <p>
                  {result.patient.persona}
                  {result.context && (
                    <>
                      {' '}
                      / Age band {result.context.ageBand} / Scenario date {result.context.asOf}
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="encounter">
              <BookOpen size={18} aria-hidden="true" />
              <div>
                {result.matches.length} associated fictional{' '}
                {result.matches.length === 1 ? 'study' : 'studies'}
                <small>Not enrolled / No eligibility assessment</small>
              </div>
            </div>
          </section>
        ) : (
          <h2>Selected patient research</h2>
        )}
        <div className="health-actions">
          <button className="secondary" onClick={onPatient}>
            <ArrowLeft size={16} />
            Return to Current patient
          </button>
          <button
            className="secondary"
            onClick={() => onResearch(view === 'cohort' ? 'study' : 'cohort')}
          >
            {view === 'cohort' ? <FlaskConical size={16} /> : <Users size={16} />}
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
            <p className="notice">
              Fictional demonstration only. Exact condition labels from current finalized,
              author-confirmed visits link to independent invented studies. No readings-based
              diagnosis, eligibility or treatment recommendation. Qualified human review required.
            </p>
            {!result.matches.length && (
              <div className="health-section" role="status">
                <h3>No associated study</h3>
                <p>
                  No matching synthetic cohort or associated study. No supported doctor-confirmed
                  condition is recorded in a current finalized visit.
                </p>
                <p>
                  Missing associations do not establish that this patient is healthy. Scenario
                  background, readings, provisional diagnoses and drafts are not confirmation.
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
                    {!match.cohort.suppressed && (
                      <dl
                        className="research-metrics"
                        aria-label="Independent fictional study counts"
                      >
                        <div>
                          <dt>Independent fictional cases</dt>
                          <dd>{match.cohort.total}</dd>
                        </div>
                        {match.cohort.followup.map((cell) => (
                          <div key={cell.label}>
                            <dt>{cell.label}</dt>
                            <dd>{cell.count}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
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
                      The selected patient is not enrolled or included in these counts. Associated
                      by recorded condition label only. No external registry, literature search or
                      model is connected.
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
            {result.context ? (
              <details className="research-context" id="patient-scenario-source">
                <summary>Fictional patient context and data gaps</summary>
                <p className="research-demo-label">
                  {result.context.sourceId} / {result.context.dataVersion}
                </p>
                <p>{result.context.provenance}</p>
                <dl className="research-context-facts">
                  <div>
                    <dt>Presentation</dt>
                    <dd>{result.context.presentation}</dd>
                  </div>
                  <div>
                    <dt>Environment</dt>
                    <dd>{result.context.environment}</dd>
                  </div>
                  <div>
                    <dt>Medication review</dt>
                    <dd>{result.context.medicationReview}</dd>
                  </div>
                  <div>
                    <dt>Allergy review</dt>
                    <dd>{result.context.allergyReview}</dd>
                  </div>
                </dl>
                <h3>Scenario timeline</h3>
                <ol className="research-context-timeline">
                  {result.context.timeline.map((event) => (
                    <li key={`${event.date}:${event.title}`}>
                      <time dateTime={event.date}>{event.date}</time>
                      <div>
                        <h4>{event.title}</h4>
                        <p>{event.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <h3>Information not established by this fixture</h3>
                <dl className="research-context-facts">
                  {result.context.missing.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{item.detail}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ) : (
              <p>Additional fictional patient context is not recorded.</p>
            )}
            <p className="card-footnote">
              Fixtures: {result.dataVersion} / Matching: {result.matchingVersion}. Independent
              fictional data, not medical evidence.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
