import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Capacitor } from '@capacitor/core';
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Clock3,
  Database,
  ExternalLink,
  FileText,
  FlaskConical,
  HeartPulse,
  Layers3,
  LoaderCircle,
  LogOut,
  Microscope,
  Play,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {
  DEFAULT_FILTERS,
  MATCH_VERSION,
  PROMPTS,
  type CohortFilters,
  type CohortResult,
  type CopilotResponse,
  type Distribution,
  type Evidence,
  type PatientState,
  type StudySnapshot,
} from '../shared/contracts';
import { api } from './api';
import { DoctorWorkspace, MyHealth } from './MyHealth';
import { PatientResearch } from './PatientResearch';
import type { Account } from '../shared/care';

type Tab = 'patient' | 'cohort' | 'study' | 'health' | 'reference';
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
const dateLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={wide ? 'modal wide' : 'modal'}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <div>
          <span className="eyebrow">RESEARCH TWIN / SYNTHETIC DEMO</span>
          <h2>{title}</h2>
        </div>
        <button className="icon-button" onClick={close} aria-label="Close dialog" autoFocus>
          <X size={22} />
        </button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}

function PwaStatus() {
  // Do not mount the registration hook in a native shell. `immediate: false`
  // delays registration but does not disable it.
  return Capacitor.isNativePlatform() ? null : <BrowserPwaStatus />;
}

function BrowserPwaStatus() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(matchMedia('(display-mode: standalone)').matches);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({ immediate: true });
  useEffect(() => {
    const available = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', done);
    return () => {
      window.removeEventListener('beforeinstallprompt', available);
      window.removeEventListener('appinstalled', done);
    };
  }, []);
  return (
    <>
      {needRefresh && (
        <button className="secondary" onClick={() => void updateServiceWorker(true)}>
          <RefreshCw size={16} />
          Update available
        </button>
      )}
      {!installed && (
        <button
          className="secondary install-button"
          onClick={async () => {
            if (!installEvent) {
              setHelp(true);
              return;
            }
            await installEvent.prompt();
            await installEvent.userChoice;
            setInstallEvent(null);
          }}
        >
          <Smartphone size={16} />
          Install app
        </button>
      )}
      {help && (
        <Modal title="Your workspace, on any screen" close={() => setHelp(false)}>
          <p>
            <strong>Android / desktop:</strong> Open the deployed HTTPS site in Chrome or Edge and
            use the browser’s install option when available.
          </p>
          <p>
            <strong>iPhone / iPad:</strong> Open in Safari, tap Share, then Add to Home Screen.
          </p>
          <p className="notice">
            Installability requires a production build served over HTTPS (or localhost). Only the
            app shell works offline. Patient, cohort and Copilot responses are not cached.
          </p>
          <p>
            Native Android and iOS store packaging is planned using Capacitor. This demo is not an
            app-store release.
          </p>
        </Modal>
      )}
    </>
  );
}

export default function App({
  account,
  onLogout,
}: {
  account: Account;
  onLogout: () => Promise<void>;
}) {
  const [patient, setPatient] = useState<PatientState | null>(null);
  const [study, setStudy] = useState<StudySnapshot | null>(null);
  const [tab, setTab] = useState<Tab>(account.role === 'patient' ? 'health' : 'patient');
  const [dirtyVisit, setDirtyVisit] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [referenceMode, setReferenceMode] = useState(false);
  function navigate(next: Tab) {
    if (next !== tab && dirtyVisit && !window.confirm('Discard unsaved visit changes?')) return;
    setTab(next);
    setReferenceMode(next === 'reference');
    setGuide(null);
  }
  const [filters, setFilters] = useState<CohortFilters>({ ...DEFAULT_FILTERS });
  const [cohort, setCohort] = useState<CohortResult | null>(null);
  const [matching, setMatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const [answer, setAnswer] = useState<CopilotResponse | null>(null);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');
  const [thinking, setThinking] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [briefBusy, setBriefBusy] = useState(false);
  const [guide, setGuide] = useState<number | null>(null);
  const [about, setAbout] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    if (account.role === 'patient') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [p, s] = await Promise.all([api<PatientState>('patient'), api<StudySnapshot>('study')]);
      setPatient(p);
      setStudy(s);
    } catch {
      setError(
        'Cannot reach the demo API. Check your connection and that the server is running, then retry.',
      );
    } finally {
      setLoading(false);
    }
  }, [account.role]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const yes = () => setOnline(true),
      no = () => setOnline(false);
    window.addEventListener('online', yes);
    window.addEventListener('offline', no);
    return () => {
      window.removeEventListener('online', yes);
      window.removeEventListener('offline', no);
    };
  }, []);
  const allEvidence = [
    ...(patient?.evidence ?? []),
    ...(cohort?.evidence ?? []),
    ...(study?.evidence ?? []),
  ];
  function openEvidence(id: string) {
    const e = allEvidence.find((e) => e.id === id);
    if (e) setEvidence(e);
  }
  function cite(id: string) {
    return (
      <button
        className="citation"
        onClick={() => openEvidence(id)}
        aria-label={`Open evidence ${id}`}
      >
        <FileText size={12} />
        {id.startsWith('COHORT') ? id.split('-').at(-1) : id}
        <ExternalLink size={10} />
      </button>
    );
  }
  async function findComparable() {
    setMatching(true);
    setError('');
    setAnswer(null);
    setAsked('');
    setCohort(null);
    try {
      setCohort(await api<CohortResult>('cohort', filters));
      setTab('cohort');
    } catch (error) {
      setError((error as Error).message + ' Retry finding the cohort.');
    } finally {
      setMatching(false);
    }
  }
  async function ask(prompt: string) {
    if (!prompt.trim() || thinking || matching) return;
    setThinking(true);
    setError('');
    setAnswer(null);
    setAsked(prompt);
    setQuestion('');
    try {
      setAnswer(
        await api<CopilotResponse>('copilot', {
          question: prompt,
          filters: cohort?.filters ?? null,
        }),
      );
    } catch (error) {
      setError((error as Error).message + ' Select the question again to retry.');
    } finally {
      setThinking(false);
    }
  }
  useEffect(() => {
    if (answer) answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [answer]);
  async function generateBrief() {
    setBriefBusy(true);
    setError('');
    try {
      const result = await api<{ markdown: string }>('brief', { filters: cohort?.filters ?? null });
      setBrief(result.markdown);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBriefBusy(false);
    }
  }
  function changeFilter<K extends keyof CohortFilters>(key: K, value: CohortFilters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setCohort(null);
    setAnswer(null);
    setAsked('');
  }
  function startGuide(step: number) {
    setReferenceMode(true);
    setGuide(step);
    setTab(step === 0 ? 'reference' : 'cohort');
    if (step === 3) void ask(PROMPTS[5]);
    if (step === 4) void ask(PROMPTS[4]);
  }
  const busy = matching || thinking;
  const guideSteps = [
    [
      'Reconstruct the patient',
      'Explore the timeline and the amber missing-data cards. Select any evidence chip to inspect the original synthetic source.',
    ],
    [
      'Find people like this patient',
      'Select Find comparable cohort. Every score comes from deterministic rules; no individual historical record leaves the API.',
    ],
    [
      'Make uncertainty visible',
      'Inspect similarities, differences and recorded patterns. Open a calculation and change filters to see reproducible results.',
    ],
    [
      'Show the safety boundary',
      'The medication prompt is sent to the Copilot panel. The demo refuses to turn historical treatment into advice.',
    ],
    [
      'Close with human review',
      'Review the suggested questions, then prepare a source-linked brief. Visit Research study to show the wider research workspace.',
    ],
  ];

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <a className="brand" href="#workspace" aria-label="Research Twin home">
          <span className="brand-mark">
            <Activity size={25} />
          </span>
          <span>
            research<span className="brand-light">twin</span>
            <small>HEALTH & RESEARCH WORKSPACE</small>
          </span>
        </a>
        <div className="workspace-label">
          WORKSPACE <span>01</span>
        </div>
        <nav aria-label="Main navigation">
          {account.role === 'patient' && (
            <button
              className={tab === 'health' ? 'nav-item active' : 'nav-item'}
              onClick={() => {
                navigate('health');
              }}
              aria-current={tab === 'health' ? 'page' : undefined}
            >
              <Activity size={19} />
              My Health
            </button>
          )}
          {account.role === 'doctor' && (
            <>
              <button
                className={tab === 'patient' ? 'nav-item active' : 'nav-item'}
                onClick={() => navigate('patient')}
                aria-current={tab === 'patient' ? 'page' : undefined}
              >
                <HeartPulse size={19} />
                Current patient
                <span className="nav-dot" />
              </button>
              <button
                className={tab === 'cohort' || tab === 'reference' ? 'nav-item active' : 'nav-item'}
                onClick={() => navigate('cohort')}
                aria-current={tab === 'cohort' || tab === 'reference' ? 'page' : undefined}
              >
                <Users size={19} />
                Buddy cohort
                {cohort && !cohort.suppressed && <span className="nav-count">{cohort.size}</span>}
              </button>
              <button
                className={tab === 'study' ? 'nav-item active' : 'nav-item'}
                onClick={() => navigate('study')}
                aria-current={tab === 'study' ? 'page' : undefined}
              >
                <FlaskConical size={19} />
                Research study
              </button>
            </>
          )}
        </nav>
        {account.role === 'doctor' && (
          <div className="sidebar-note">
            <div className="orb">
              <Layers3 size={34} />
            </div>
            <h3>
              People like this patient.
              <br />
              Not another person.
            </h3>
            <p>Comparable evidence, without exposing an individual.</p>
            <span>
              <ShieldCheck size={14} />
              Aggregate-only demo
            </span>
          </div>
        )}
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setAbout(true)}>
            <CircleHelp size={18} />
            About this demo
          </button>
          <div className="profile">
            <span>RT</span>
            <div>
              {account.name}
              <small>{account.role === 'patient' ? 'Patient' : 'Doctor'} workspace</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />
            <strong>
              {tab === 'health'
                ? 'My Health · demo persona'
                : tab === 'patient'
                  ? 'Shared patient records'
                  : tab === 'cohort'
                    ? 'Health Twin Buddy'
                    : 'Clinical research'}
            </strong>
          </div>
          <div className="top-actions">
            <span className="demo-badge">
              <span />
              Synthetic demo
            </span>
            <PwaStatus />
            <button
              className="secondary"
              title="Sign out"
              aria-label="Sign out"
              disabled={!online}
              onClick={() => {
                if (!dirtyVisit || window.confirm('Discard unsaved visit changes and sign out?'))
                  void onLogout();
              }}
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </header>
        <main id="workspace">
          {!online && (
            <div className="notice offline" role="status">
              <WifiOff size={18} />
              <span>
                You are offline. The app shell is available; new research requests require a
                connection. Any visible results are the last in-memory synthetic snapshot.
              </span>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                onClick={() => {
                  if (!patient) void load();
                  else setError('');
                }}
              >
                {!patient ? 'Retry' : 'Dismiss'}
              </button>
            </div>
          )}
          <section className="page-heading">
            <div>
              <span className="eyebrow">CONNECTED CONTEXT. REVIEWABLE EVIDENCE.</span>
              <h1>
                {tab === 'health'
                  ? 'My Health'
                  : tab === 'patient'
                    ? 'Current patient'
                    : tab === 'cohort'
                      ? 'Buddy cohort'
                      : tab === 'reference'
                        ? 'Reference patient'
                        : 'Research study'}
              </h1>
              <p>
                {tab === 'health'
                  ? `${account.name} / Patient workspace`
                  : tab === 'patient'
                    ? `${account.name} / Doctor workspace`
                    : tab === 'cohort'
                      ? 'Discover comparable historical patterns—not a diagnosis.'
                      : 'A living view of one synthetic clinical study.'}
              </p>
            </div>
            {tab !== 'health' && tab !== 'patient' && (!selectedPatient || referenceMode) && (
              <button className="secondary" onClick={() => startGuide(0)} disabled={busy}>
                <Play size={15} />
                Guided demo<span className="muted">5 min</span>
              </button>
            )}
          </section>
          {guide !== null && (
            <section className="guide" aria-label="Guided demo">
              <span className="guide-number">0{guide + 1}</span>
              <div>
                <strong>{guideSteps[guide][0]}</strong>
                <p>{guideSteps[guide][1]}</p>
              </div>
              <div className="guide-actions">
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => (guide === 4 ? setGuide(null) : startGuide(guide + 1))}
                >
                  {guide === 4 ? 'Finish' : 'Next'}
                  <ArrowRight size={14} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Close guided demo"
                  onClick={() => setGuide(null)}
                >
                  <X size={18} />
                </button>
              </div>
            </section>
          )}
          {tab === 'health' ? (
            <MyHealth online={online} account={account} />
          ) : tab === 'patient' ? (
            <DoctorWorkspace
              account={account}
              online={online}
              dirty={dirtyVisit}
              onDirtyChange={setDirtyVisit}
              selected={selectedPatient}
              onSelect={setSelectedPatient}
              onResearch={(view) => navigate(view)}
            />
          ) : loading ? (
            <div className="startup" role="status">
              <LoaderCircle className="spin" />
              <h2>Assembling the synthetic workspace…</h2>
              <p>Patient context, provenance and research data.</p>
            </div>
          ) : patient && study ? (
            <>
              <section className="notice reference-notice" aria-label="Reference research boundary">
                <strong>Reference research demo / Alex Morgan</strong>
                <p>
                  This fixed fictional scenario is separate from your shared patients. Matching,
                  Copilot answers and review briefs do not use their records.
                </p>
                {selectedPatient && !referenceMode && (tab === 'cohort' || tab === 'study') && (
                  <p>
                    These comparison controls and study metrics use reference-demo data only. They
                    do not filter or describe the selected patient. See the separate{' '}
                    <a href="#selected-patient-research">selected-patient details</a> below.
                  </p>
                )}
                {!selectedPatient && (
                  <p>
                    Select a shared patient in Current patient for patient-specific synthetic
                    cohorts and associated studies.
                  </p>
                )}
                {tab !== 'reference' && (
                  <button className="secondary" onClick={() => navigate('reference')}>
                    <BookOpen size={16} />
                    View reference patient
                  </button>
                )}
              </section>
              <section className="patient-banner">
                <div className="patient-identity">
                  <div className="avatar">
                    AM
                    <span />
                  </div>
                  <div>
                    <div className="patient-title">
                      <h2>
                        {selectedPatient && !referenceMode ? 'Reference patient: ' : ''}
                        {patient.name}
                      </h2>
                      <span className="pill">Synthetic patient</span>
                    </div>
                    <p>
                      {patient.id} <span>•</span> Age band {patient.ageBand} <span>•</span> Snapshot{' '}
                      {dateLabel(patient.asOf)}, 2026
                    </p>
                  </div>
                </div>
                <div className="encounter">
                  <span className="pulse-dot" />
                  <div>
                    Active review<small>Winter febrile presentation · day 4</small>
                  </div>
                </div>
              </section>
              <div className="content-grid">
                <div className="workspace-content">
                  {tab === 'reference' && (
                    <>
                      <section className="card">
                        <div className="section-head">
                          <div>
                            <span className="section-icon teal">
                              <HeartPulse size={18} />
                            </span>
                            <h2>Current Patient Twin</h2>
                          </div>
                          <span className="label">RECORDED FACTS</span>
                        </div>
                        <div className="facts-grid">
                          {patient.facts.map((f, i) => (
                            <article key={f.label} className="fact">
                              <span className="fact-icon">
                                {
                                  [
                                    <Activity />,
                                    <ClipboardList />,
                                    <FileText />,
                                    <HeartPulse />,
                                    <Layers3 />,
                                    <ShieldCheck />,
                                  ][i]
                                }
                              </span>
                              <div>
                                <h3>{f.label}</h3>
                                <p>{f.value}</p>
                                {cite(f.evidenceId)}
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                      <section className="card">
                        <div className="section-head">
                          <div>
                            <span className="section-icon blue">
                              <Clock3 size={18} />
                            </span>
                            <h2>A longitudinal view</h2>
                          </div>
                          <span className="label">JAN 2026</span>
                        </div>
                        <div className="timeline">
                          {patient.timeline.map((event, i) => (
                            <article
                              key={event.date}
                              className={i === 3 ? 'timeline-event latest' : 'timeline-event'}
                            >
                              <time dateTime={event.date}>{dateLabel(event.date)}</time>
                              <span className="timeline-dot" />
                              <div>
                                <h3>
                                  {event.title}
                                  {i === 3 && <span className="tiny-tag">LATEST</span>}
                                </h3>
                                <p>{event.detail}</p>
                                {cite(event.evidenceId)}
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                      <section className="card gaps">
                        <div className="section-head">
                          <div>
                            <span className="section-icon amber">
                              <CircleHelp size={18} />
                            </span>
                            <h2>What we don’t know matters</h2>
                          </div>
                          <span className="pill amber">
                            {patient.missing.length} areas to review
                          </span>
                        </div>
                        <div className="gap-grid">
                          {patient.missing.map((g) => (
                            <div key={g.label}>
                              <h3>{g.label}</h3>
                              <p>{g.detail}</p>
                              {cite(g.evidenceId)}
                            </div>
                          ))}
                        </div>
                        <p className="card-footnote">
                          Missing data is never interpreted as normal, negative, or not applicable.
                        </p>
                      </section>
                      <section className="cohort-callout">
                        <div className="callout-icon">
                          <Users size={29} />
                        </div>
                        <div>
                          <span className="eyebrow">HEALTH TWIN BUDDY</span>
                          <h2>Put this patient’s context in perspective.</h2>
                          <p>Explore a comparable cohort, with the differences kept in view.</p>
                        </div>
                        <button
                          className="primary"
                          disabled={busy || !online}
                          onClick={() => void findComparable()}
                        >
                          {matching ? (
                            <LoaderCircle className="spin" size={17} />
                          ) : (
                            <Search size={17} />
                          )}
                          Find comparable cohort
                          <ArrowRight size={16} />
                        </button>
                      </section>
                    </>
                  )}
                  {tab === 'cohort' && (
                    <>
                      <section className="card">
                        <div className="section-head">
                          <div>
                            <span className="section-icon teal">
                              <SlidersHorizontal size={18} />
                            </span>
                            <h2>Define the comparison</h2>
                          </div>
                          <span className="label">{MATCH_VERSION}</span>
                        </div>
                        <fieldset className="filters" disabled={busy}>
                          <legend className="sr-only">Cohort filters</legend>
                          <label className="range-label">
                            Minimum matching score <strong>{filters.minScore}/100</strong>
                            <input
                              aria-label="Minimum matching score"
                              type="range"
                              min="50"
                              max="95"
                              step="5"
                              value={filters.minScore}
                              onChange={(e) => changeFilter('minScore', Number(e.target.value))}
                            />
                            <small>Comparability indicator, not a disease probability</small>
                          </label>
                          <div className="checkboxes">
                            {(
                              [
                                ['sameEnvironment', 'Same season & climate'],
                                ['confirmedOnly', 'Laboratory-confirmed only'],
                                ['requireFollowup', 'Recorded follow-up required'],
                              ] as const
                            ).map(([key, label]) => (
                              <label key={key}>
                                <input
                                  type="checkbox"
                                  checked={filters[key]}
                                  onChange={(e) => changeFilter(key, e.target.checked)}
                                />
                                {label}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        <div className="filter-footer">
                          <span>
                            <ShieldCheck size={14} />
                            Minimum cohort 10 · small cells protected
                          </span>
                          <button
                            className="primary"
                            disabled={busy || !online}
                            onClick={() => void findComparable()}
                          >
                            {matching ? (
                              <LoaderCircle size={16} className="spin" />
                            ) : (
                              <Search size={16} />
                            )}
                            Find comparable cohort
                          </button>
                        </div>
                      </section>
                      {matching ? (
                        <div className="card empty" role="status">
                          <LoaderCircle className="spin" size={35} />
                          <h2>Comparing synthetic records</h2>
                          <p>Applying eligibility, matching and disclosure rules…</p>
                        </div>
                      ) : !cohort ? (
                        <div className="card empty">
                          <div className="empty-visual">
                            <Users size={42} />
                            <ShieldCheck size={23} />
                          </div>
                          <h2>A cohort, not a single “buddy.”</h2>
                          <p>
                            Select your comparison criteria, then find comparable cases.
                            <br />
                            Only aggregate evidence is returned to this workspace.
                          </p>
                        </div>
                      ) : cohort.suppressed ? (
                        <div className="card empty">
                          <ShieldCheck size={38} />
                          <h2>Privacy boundary reached</h2>
                          <p>
                            The selected cohort is below the minimum reportable size.
                            <br />
                            Its count, scores and distributions are withheld. Broaden your filters.
                          </p>
                          {cite(cohort.evidence[0].id)}
                        </div>
                      ) : (
                        <>
                          <section className="cohort-hero">
                            <div>
                              <span className="eyebrow">HEALTH TWIN BUDDY / COHORT READY</span>
                              <h2>
                                People like Alex.
                                <br />
                                <span>Evidence you can inspect.</span>
                              </h2>
                              <p>
                                {cohort.total} synthetic records <ArrowRight size={12} />{' '}
                                {cohort.eligible} eligible <ArrowRight size={12} /> {cohort.size}{' '}
                                comparable
                              </p>
                              {cite(cohort.evidence[0].id)}
                            </div>
                            <div className="cohort-ring">
                              <strong>{cohort.size}</strong>
                              <span>comparable cases</span>
                              <ShieldCheck size={22} />
                            </div>
                          </section>
                          <div className="metric-grid">
                            <Metric
                              value={`${cohort.meanScore}/100`}
                              label="Mean matching score"
                              detail="Not a diagnosis probability"
                            />
                            <Metric
                              value={`${cohort.completeness}%`}
                              label="Record completeness"
                              detail="Mean of recorded quality values"
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
                              {cite(cohort.evidence[0].id)}
                            </div>
                            <div className="dimension-grid">
                              {cohort.dimensions.map((d) => (
                                <div key={d.label}>
                                  <div className="bar-label">
                                    <span>{d.label}</span>
                                    <strong>{d.value}%</strong>
                                  </div>
                                  <div className="bar-track">
                                    <span style={{ width: `${d.value}%` }} />
                                  </div>
                                  <small>{d.weight}% scoring weight</small>
                                </div>
                              ))}
                            </div>
                            <p className="card-footnote">
                              Dimension values are average agreement scores. Weights are fixed and
                              versioned in v1; clinical validity has not been established.
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
                                  Current patient versus comparable cohort, including important
                                  differences
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
                                  {cohort.comparisons.map((c) => (
                                    <tr key={c.area}>
                                      <th>{c.area}</th>
                                      <td>{c.patient}</td>
                                      <td>
                                        {c.cohort}
                                        {cite(c.evidenceId)}
                                      </td>
                                      <td className="difference">{c.difference}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </section>
                          <div className="distribution-grid">
                            {cohort.distributions.map((d) => (
                              <DistributionCard
                                key={d.label}
                                distribution={d}
                                citation={cite(d.evidenceId)}
                              />
                            ))}
                          </div>
                          <section className="notice limitations">
                            <ShieldCheck size={20} />
                            <div>
                              <h3>Keep the limits in the picture</h3>
                              <ul>
                                {cohort.limitations.map((l) => (
                                  <li key={l}>{l}</li>
                                ))}
                              </ul>
                            </div>
                          </section>
                        </>
                      )}
                    </>
                  )}
                  {tab === 'study' && (
                    <>
                      <section className="study-hero">
                        <span className="study-symbol">
                          <Microscope size={54} />
                        </span>
                        <span className="eyebrow">SYNTHETIC OBSERVATIONAL STUDY</span>
                        <h2>{study.name}</h2>
                        <p>{study.protocol}</p>
                        <span className="pill">Fictional study · not a registered trial</span>
                      </section>
                      <div className="metric-grid">
                        <Metric
                          value={`${study.enrolled}/${study.target}`}
                          label="Participant enrollment"
                          detail={`${Math.round((study.enrolled / study.target) * 100)}% of synthetic target`}
                        />
                        <Metric
                          value={`${Math.round((study.retained / study.enrolled) * 100)}%`}
                          label="Recorded retention"
                          detail={`${study.retained} of ${study.enrolled} participants`}
                        />
                        <Metric
                          value={`${((study.completedVisits / study.scheduledVisits) * 100).toFixed(1)}%`}
                          label="Visit completion"
                          detail={`${study.completedVisits} of ${study.scheduledVisits} visits`}
                        />
                      </div>
                      <section className="card">
                        <div className="section-head">
                          <div>
                            <span className="section-icon blue">
                              <FlaskConical size={18} />
                            </span>
                            <h2>Research site snapshot</h2>
                          </div>
                          {cite('STUDY-001')}
                        </div>
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                <th>Synthetic site</th>
                                <th>Enrolled</th>
                                <th>Visits completed</th>
                                <th>Completion</th>
                              </tr>
                            </thead>
                            <tbody>
                              {study.sites.map((s) => (
                                <tr key={s.name}>
                                  <th>{s.name}</th>
                                  <td>{s.enrolled}</td>
                                  <td>
                                    {s.completed} / {s.scheduled}
                                  </td>
                                  <td>
                                    <span className="pill">
                                      {((s.completed / s.scheduled) * 100).toFixed(1)}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                      <section className="card research-note">
                        <BookOpen size={28} />
                        <h2>Operational context, not autonomous oversight.</h2>
                        <p>
                          These deterministic metrics support review. Visit completion is not a
                          judgment of protocol compliance. The demo does not determine trial
                          eligibility, classify adverse events, or recommend changing a study.
                        </p>
                        {cite('STUDY-001')}
                        <p className="card-footnote">
                          External literature, real trial registries, and live study systems are not
                          connected.
                        </p>
                      </section>
                    </>
                  )}
                </div>
                <aside className="copilot-panel" aria-label="Research Twin Copilot">
                  <div className="copilot-header">
                    <span className="copilot-icon">
                      <Sparkles size={20} />
                    </span>
                    <div>
                      <h2>Research Twin Copilot</h2>
                      <span>
                        <span className="status-dot" />
                        Evidence-linked exploration
                      </span>
                    </div>
                  </div>
                  <div className="copilot-mode">
                    <Database size={13} />
                    Deterministic demo · no AI model connected
                  </div>
                  <div className="copilot-body">
                    <div className="copilot-intro">
                      <h3>
                        Better questions.
                        <br />A more complete picture.
                      </h3>
                      <p>
                        Explore what is known, what differs, and what needs a clinician’s review.
                      </p>
                    </div>
                    <div className="suggestions">
                      <span className="eyebrow">EXPLORE THE EVIDENCE</span>
                      {PROMPTS.slice(0, 5).map((p, i) => (
                        <button key={p} onClick={() => void ask(p)} disabled={busy || !online}>
                          <span>
                            {
                              [
                                <Activity />,
                                <Users />,
                                <Layers3 />,
                                <CircleHelp />,
                                <ClipboardList />,
                              ][i]
                            }
                          </span>
                          {p}
                          <ChevronRight size={14} />
                        </button>
                      ))}
                    </div>
                    <div className="copilot-response" ref={answerRef} aria-live="polite">
                      {asked && <div className="asked">{asked}</div>}
                      {thinking && (
                        <div className="thinking">
                          <LoaderCircle size={16} className="spin" />
                          Reviewing synthetic evidence…
                        </div>
                      )}
                      {answer && (
                        <div className={answer.refused ? 'answer refused' : 'answer'}>
                          <span className="answer-label">
                            {answer.refused ? <ShieldCheck size={15} /> : <Sparkles size={15} />}{' '}
                            {answer.refused
                              ? 'CLINICAL & PRIVACY BOUNDARY'
                              : 'GROUNDED DEMO RESPONSE'}
                          </span>
                          <p>{answer.answer}</p>
                          {answer.findings.map((f, i) => (
                            <div className="finding" key={i}>
                              <span className="classification">{f.classification}</span>
                              <p>{f.statement}</p>
                              <div className="citations">
                                {f.evidenceIds.map((id) => (
                                  <span key={id}>{cite(id)}</span>
                                ))}
                              </div>
                            </div>
                          ))}
                          {answer.reviewQuestions.length > 0 && (
                            <ul>
                              {answer.reviewQuestions.map((q) => (
                                <li key={q}>{q}</li>
                              ))}
                            </ul>
                          )}
                          <div className="answer-limitations">
                            {answer.limitations.map((l) => (
                              <p key={l}>{l}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      className="safety-prompt"
                      disabled={busy || !online}
                      onClick={() => void ask(PROMPTS[5])}
                    >
                      <ShieldCheck size={16} />
                      <span>Test the prescribing safety boundary</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  <form
                    className="question-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void ask(question);
                    }}
                  >
                    <label className="sr-only" htmlFor="question">
                      Ask about the synthetic evidence
                    </label>
                    <input
                      id="question"
                      value={question}
                      maxLength={1000}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask about this evidence…"
                      disabled={busy || !online}
                    />
                    <button
                      className="send"
                      aria-label="Send question"
                      disabled={!question.trim() || busy || !online}
                    >
                      <Send size={17} />
                    </button>
                  </form>
                  <p className="copilot-disclaimer">
                    Supported questions use fixed templates. Other requests are declined. Do not
                    enter real patient information.
                  </p>
                  <div className="brief-button-wrap">
                    <button
                      className="secondary"
                      disabled={briefBusy || busy || !online}
                      onClick={() => void generateBrief()}
                    >
                      {briefBusy ? (
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <FileText size={16} />
                      )}
                      Prepare review brief
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </aside>
              </div>
              <footer className="workspace-footer">
                <span>
                  <ShieldCheck size={14} />
                  Synthetic data only · Human review required
                </span>
                <span>Not for diagnosis, prescribing, or patient care.</span>
              </footer>
            </>
          ) : (
            !loading && (
              <div className="startup">
                <Database size={32} />
                <h2>The workspace needs a connection</h2>
                <p>No patient or cohort data is stored for offline use.</p>
                <button className="primary" onClick={() => void load()}>
                  Retry connection
                </button>
              </div>
            )
          )}
          {selectedPatient && !referenceMode && (tab === 'cohort' || tab === 'study') && (
            <section
              id="selected-patient-research"
              aria-labelledby="selected-patient-research-title"
            >
              <div className="page-heading">
                <div>
                  <span className="eyebrow">SEPARATE SYNTHETIC PATIENT ASSOCIATIONS</span>
                  <h2 id="selected-patient-research-title">
                    {tab === 'cohort'
                      ? 'Selected-patient cohort details'
                      : 'Selected-patient research details'}
                  </h2>
                  <p>
                    Finalized condition-label associations only. Reference comparison filters, study
                    metrics and Copilot do not apply to this section.
                  </p>
                </div>
              </div>
              <PatientResearch
                key={`${selectedPatient}:${tab}`}
                patientId={selectedPatient}
                view={tab}
                online={online}
                onPatient={() => navigate('patient')}
                onResearch={(view) => navigate(view)}
              />
            </section>
          )}
        </main>
      </div>
      {evidence && (
        <Modal title={evidence.title} close={() => setEvidence(null)}>
          <div className="evidence-tags">
            <span className="pill">{evidence.classification}</span>
            <span className="pill amber">Synthetic evidence</span>
          </div>
          <dl className="evidence-details">
            <dt>Evidence identifier</dt>
            <dd>{evidence.id}</dd>
            <dt>Source / provenance</dt>
            <dd>{evidence.source}</dd>
            <dt>Date window</dt>
            <dd>{evidence.period}</dd>
            <dt>Recorded evidence</dt>
            <dd>{evidence.detail}</dd>
            <dt>Transformation / calculation</dt>
            <dd className="calculation">{evidence.calculation}</dd>
          </dl>
          <div className="notice">
            <h3>Limitations</h3>
            <ul>
              {evidence.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
      {brief && (
        <Modal title="Clinician review brief" close={() => setBrief(null)} wide>
          <div className="brief-toolbar">
            <p>Source-linked Markdown · synthetic snapshot only</p>
            <button
              className="primary"
              onClick={() => {
                const url = URL.createObjectURL(new Blob([brief], { type: 'text/markdown' }));
                const a = document.createElement('a');
                a.href = url;
                a.download = 'research-twin-review.md';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              <ArrowDownToLine size={16} />
              Download .md
            </button>
          </div>
          <pre className="brief-preview">{brief}</pre>
        </Modal>
      )}
      {about && (
        <Modal title="Transparent by design" close={() => setAbout(false)}>
          <p>
            Research Twin connects a current patient’s context to comparable historical cohorts and
            research operations. This first release is a synthetic-data hackathon prototype.
          </p>
          <ul className="about-list">
            <li>
              <Check size={17} />
              Source-linked patient facts and timeline
            </li>
            <li>
              <Check size={17} />
              Server-side deterministic matching and aggregate suppression
            </li>
            <li>
              <Check size={17} />
              Bounded, explicitly labeled Copilot templates
            </li>
            <li>
              <Check size={17} />
              Installable PWA, with a Capacitor packaging foundation
            </li>
          </ul>
          <div className="notice">
            <strong>Not connected yet</strong>
            <p>
              Azure AI Foundry, Fabric, FHIR, live literature and production governance. No real
              patient data should be entered. Minimum-size controls alone are not a production
              privacy guarantee.
            </p>
          </div>
          <p>
            Fixed scenario date: January 15, 2026. Synthetic outcomes are fictional and do not
            establish medical evidence.
          </p>
        </Modal>
      )}
    </div>
  );
}

function Metric({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
function DistributionCard({
  distribution: d,
  citation,
}: {
  distribution: Distribution;
  citation: ReactNode;
}) {
  return (
    <section className="card distribution">
      <div className="section-head">
        <h3>{d.label}</h3>
        {citation}
      </div>
      <span className="label">OBSERVED SYNTHETIC PATTERN</span>
      {d.suppressed ? (
        <p className="notice">
          Entire distribution withheld: at least one observed cell is too small to disclose.
        </p>
      ) : (
        <div className="distribution-bars">
          {d.rows.map((r) => (
            <div key={r.label}>
              <div className="bar-label">
                <span>{r.label}</span>
                <strong>
                  {r.count} <small>({r.percent}%)</small>
                </strong>
              </div>
              <div className="bar-track">
                <span style={{ width: `${r.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="card-footnote">
        Descriptive records only. No causal or patient-specific inference.
      </p>
    </section>
  );
}
