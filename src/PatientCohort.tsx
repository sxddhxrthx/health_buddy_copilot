import { useState } from 'react';
import {
  ArrowRight,
  ClipboardList,
  Layers3,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import type { PatientResearch } from '../shared/patient-research';
import { DistributionCard, Metric } from './ResearchCards';

export function PatientCohort({
  result,
  onPatient,
  onStudy,
  onRefresh,
}: {
  result: PatientResearch;
  onPatient: () => void;
  onStudy: () => void;
  onRefresh: () => void;
}) {
  const [condition, setCondition] = useState('');
  const match = result.matches.find((entry) => entry.condition === condition) ?? result.matches[0];
  const cohort = match?.cohort;
  const total = cohort?.total;
  const sourceLink = (
    <button className="citation" onClick={onPatient}>
      Review source visits in Current patient
    </button>
  );
  return (
    <>
      <section className="patient-banner" aria-label="Selected patient research">
        <div className="patient-identity">
          <div className="avatar">
            {result.patient.name
              .split(' ')
              .map((part) => part[0])
              .slice(0, 2)
              .join('')}
            <span />
          </div>
          <div>
            <div className="patient-title">
              <h2>{result.patient.name}</h2>
              <span className="pill">Synthetic patient</span>
            </div>
            <p>
              {result.patient.persona} <span>•</span> Finalized doctor-confirmed labels only
            </p>
          </div>
        </div>
        <button className="secondary" onClick={onPatient}>
          Return to Current patient
        </button>
      </section>
      <div className="content-grid">
        <div className="workspace-content">
          <section className="card">
            <div className="section-head">
              <div>
                <span className="section-icon teal">
                  <SlidersHorizontal size={18} />
                </span>
                <h2>Define the comparison</h2>
              </div>
              <span className="label">EXACT LABEL</span>
            </div>
            <fieldset className="filters">
              <legend className="sr-only">Cohort filters</legend>
              <div className="range-label">
                <label>
                  Recorded condition
                  <select
                    aria-label="Recorded condition"
                    value={match?.condition ?? ''}
                    disabled={!match}
                    onChange={(event) => setCondition(event.target.value)}
                  >
                    {!match && <option value="">No supported confirmed condition</option>}
                    {result.matches.map((entry) => (
                      <option key={entry.condition}>{entry.condition}</option>
                    ))}
                  </select>
                </label>
                <small>Exact condition-label association, not a clinical similarity score</small>
                <label>
                  Minimum matching score — unavailable
                  <input
                    aria-label="Minimum matching score"
                    type="range"
                    min="50"
                    max="95"
                    value="65"
                    disabled
                  />
                </label>
              </div>
              <div className="checkboxes">
                <label>
                  <input type="checkbox" checked disabled />
                  Finalized, doctor-confirmed labels only
                </label>
                <label>
                  <input type="checkbox" checked={false} disabled />
                  Same season &amp; climate (reference only)
                </label>
                <label>
                  <input type="checkbox" checked={false} disabled />
                  Recorded follow-up required (reference only)
                </label>
              </div>
            </fieldset>
            <div className="filter-footer">
              <span>
                <ShieldCheck size={14} />
                Minimum cohort 10 · small cells protected
              </span>
              <button className="primary" onClick={onRefresh}>
                <Search size={16} />
                Find comparable cohort
              </button>
            </div>
          </section>
          {!match ? (
            <section className="card empty" role="status">
              {result.patient.persona === 'SYN-USER-001' && (
                <>
                  <h3>Routine-care comparison</h3>
                  <p>This does not establish that Sam is healthy or that readings are normal.</p>
                </>
              )}
              <p>
                No matching synthetic cohort or associated study. No supported doctor-confirmed
                condition is recorded in a current finalized visit.
              </p>
              <p>
                Readings, drafts and prescriptions do not create research matches. Review finalized
                visits in Current patient.
              </p>
            </section>
          ) : (
            <>
              <section className="cohort-hero">
                <div>
                  <span className="eyebrow">
                    HEALTH TWIN BUDDY / {cohort?.suppressed ? 'COUNTS WITHHELD' : 'COHORT READY'}
                  </span>
                  <h2>
                    People like {result.patient.name.split(' ')[0]}.<br />
                    <span>Evidence you can inspect.</span>
                  </h2>
                  <p>
                    {result.fixtureTotal ?? 'Independent'} synthetic records{' '}
                    <ArrowRight size={12} /> {total ?? 'Withheld'} condition-associated cases
                  </p>
                  {sourceLink}
                </div>
                <div className="cohort-ring">
                  <strong>{total ?? '—'}</strong>
                  <span>condition-associated cases</span>
                  <ShieldCheck size={22} />
                </div>
              </section>
              <div className="metric-grid">
                <Metric
                  value="Exact label"
                  label="Matching method"
                  detail="Not a diagnosis probability"
                />
                <Metric
                  value={String(total ?? 'Withheld')}
                  label="Fictional cohort size"
                  detail="Selected patient not included"
                />
                <Metric
                  value="Aggregate only"
                  label="Disclosure boundary"
                  detail="No individual buddy records"
                />
              </div>
              <section className="card">
                <div className="section-head">
                  <div>
                    <span className="section-icon teal">
                      <Layers3 size={18} />
                    </span>
                    <h2>Why these cases?</h2>
                  </div>
                  {sourceLink}
                </div>
                <div className="dimension-grid">
                  <div>
                    <h3>{match.condition}</h3>
                    <p>{total ?? 'Count withheld'} independently generated fictional cases</p>
                    <p>
                      {match.sources.length} current finalized condition source(s). Association uses
                      only this recorded label, never readings, symptoms or prescriptions.
                    </p>
                  </div>
                </div>
                <p className="card-footnote">
                  Exact label association only; no clinical similarity score or diagnostic
                  probability.
                </p>
              </section>
              <section className="card">
                <div className="section-head">
                  <div>
                    <span className="section-icon blue">
                      <ClipboardList size={18} />
                    </span>
                    <h2>Differential evidence matrix</h2>
                  </div>
                </div>
                <div className="table-scroll">
                  <table>
                    <caption className="sr-only">
                      Current patient versus condition-label cohort, including important differences
                    </caption>
                    <thead>
                      <tr>
                        <th>Dimension</th>
                        <th>Current patient</th>
                        <th>Cohort evidence</th>
                        <th>Important difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <th>Recorded condition</th>
                        <td>{match.condition}</td>
                        <td>
                          {total ?? 'Withheld'} independent cases{sourceLink}
                        </td>
                        <td className="difference">
                          Same label does not establish clinical similarity.
                        </td>
                      </tr>
                      <tr>
                        <th>Documentation</th>
                        <td>{match.sources.length} finalized source(s)</td>
                        <td>Invented follow-up categories</td>
                        <td className="difference">
                          No personal readings, summaries or prescriptions compared.
                        </td>
                      </tr>
                      <tr>
                        <th>Associated study</th>
                        <td>Not enrolled</td>
                        <td>{match.study.id}</td>
                        <td className="difference">Fictional study; no eligibility assessment.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
              <div className="distribution-grid">
                <DistributionCard
                  distribution={{
                    label: 'Fictional follow-up documentation',
                    suppressed: cohort!.suppressed,
                    evidenceId: result.dataVersion,
                    rows: cohort!.followup.map((cell) => ({
                      ...cell,
                      percent: total ? Math.round((cell.count / total) * 100) : 0,
                    })),
                  }}
                  citation={<span className="label">{result.dataVersion}</span>}
                />
                {cohort?.distributions?.map((distribution) => (
                  <DistributionCard
                    key={distribution.label}
                    distribution={distribution}
                    citation={<span className="label">{result.dataVersion}</span>}
                  />
                ))}
              </div>
              {match.presentation && (
                <section className="card research-note" aria-label="Presentation at a glance">
                  <h3>{match.presentation.headline}</h3>
                  <p>{match.presentation.explanation}</p>
                </section>
              )}
              <section className="card">
                <div className="section-head">
                  <h3>Recorded condition sources</h3>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Recorded label</th>
                        <th>Demo-local date</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {match.sources.map((source) => (
                        <tr key={source.visitId}>
                          <td>{source.diagnosis}</td>
                          <td>{source.measuredAt.replace('T', ' ')}</td>
                          <td>
                            Finalized visit {source.visitId}, revision {source.revision}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sourceLink}
              </section>
            </>
          )}
          {result.unmatched.length > 0 && (
            <section className="card research-note" aria-label="Unmatched confirmed conditions">
              <h3>No match for these recorded conditions</h3>
              {result.unmatched.map((source) => (
                <p key={source.visitId}>
                  {source.diagnosis} / visit {source.visitId}, revision {source.revision}
                </p>
              ))}
            </section>
          )}
          <section className="notice limitations">
            <ShieldCheck size={20} />
            <div>
              <h3>Keep the limits in the picture</h3>
              <p>
                Synthetic-only demonstration. Counts describe invented documentation, not outcomes
                or treatment evidence. No diagnosis, severity detection or trial eligibility.
                Qualified human review required.
              </p>
              <p>
                Fixtures: {result.dataVersion} / Matching: {result.matchingVersion}. Personal
                records are not included in cohort counts.
              </p>
            </div>
          </section>
          <button className="secondary" onClick={onStudy}>
            View research details
            <ArrowRight size={14} />
          </button>
        </div>
        <aside className="copilot-panel" aria-label="Research Twin Copilot">
          <div className="copilot-header">
            <div className="copilot-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h2>Research Twin Copilot</h2>
              <span>Reference demo only</span>
            </div>
          </div>
          <div className="research-note">
            <p>
              Copilot is unavailable for selected-patient records. No model is connected and no Alex
              Morgan answers are used here.
            </p>
            <p>Review the recorded condition sources and fictional study instead.</p>
            <button className="secondary" onClick={onStudy}>
              View associated study
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
