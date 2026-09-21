import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, HeartPulse, Layers3, X } from 'lucide-react';
import { healthValue, type DemoReport, type HealthRecord } from '../shared/health';
import {
  BODY_GROUPS,
  buildReportSeries,
  outsideReportRange,
  type BodyGroup,
  type ReportPoint,
  type ReportSeries,
} from '../shared/report-ranges';
import './body-map.css';
const BodyScene = lazy(() =>
  import('./BodyScene').then((module) => ({ default: module.BodyScene })),
);

const statusText = (point: ReportPoint) =>
  ({
    above: 'Above report range',
    below: 'Below report range',
    within: 'Within report range',
    unknown: point.reference ? 'Range not comparable' : 'No report range',
  })[point.status];
const dateLabel = (value: string) => value.replace('T', ' / ');
const sourceText = (record: HealthRecord) =>
  record.source === 'synthetic-checkup'
    ? `Synthetic checkup fixture / ${record.reportId}`
    : record.source === 'simulated-report'
      ? `Reviewed synthetic report / ${record.reportId}`
      : record.source === 'manual'
        ? 'Patient-entered transcription / unverified'
        : 'Seeded synthetic reading';

function RangeBadge({ point }: { point: ReportPoint }) {
  return (
    <span className={`range-badge range-${point.status}`}>
      {point.status === 'above' && <ArrowUp size={13} />}
      {point.status === 'below' && <ArrowDown size={13} />}
      {statusText(point)}
    </span>
  );
}

function History({ series, reports }: { series: ReportSeries; reports: DemoReport[] }) {
  const [pointId, setPointId] = useState(series.points.at(-1)!.record.id);
  const active =
    series.points.find((point) => point.record.id === pointId) ?? series.points.at(-1)!;
  const values = series.points
    .flatMap((point) => [point.value, point.range?.lower, point.range?.upper])
    .filter((value): value is number => value !== undefined);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.15, Math.abs(maximum) * 0.03, 0.1);
  const bottom = minimum < 0 ? minimum - padding : Math.max(0, minimum - padding);
  const top = maximum + padding;
  const firstTime = series.points[0].time;
  const lastTime = series.points.at(-1)!.time;
  const horizontal = (point: ReportPoint) =>
    lastTime === firstTime ? 350 : 66 + ((point.time - firstTime) / (lastTime - firstTime)) * 578;
  const vertical = (value: number) => 204 - ((value - bottom) / (top - bottom)) * 158;
  const ticks = [bottom, (bottom + top) / 2, top];
  const sourceReport = reports.find((report) => report.id === active.record.reportId);
  const titleId = useId();
  return (
    <section className="body-history" aria-labelledby={titleId}>
      <div className="body-section-title">
        <div>
          <span className="body-overline">READING HISTORY</span>
          <h3 id={titleId}>
            {series.label} / {series.unit}
          </h3>
          {series.context && <p>{series.context}</p>}
        </div>
        <span>{series.points.length} readings</span>
      </div>
      <svg
        className="body-history-chart"
        viewBox="0 0 680 260"
        role="img"
        aria-label={`${series.label}: values versus demo-local time in ${series.unit}`}
      >
        <title>
          {series.label} history, {series.unit}. Exact values and each report range are in the table
          below.
        </title>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1="66"
              x2="644"
              y1={vertical(tick)}
              y2={vertical(tick)}
              className="history-grid"
            />
            <text x="56" y={vertical(tick) + 4} textAnchor="end">
              {Number(tick.toPrecision(4))}
            </text>
          </g>
        ))}
        <text x="66" y="23">
          {series.unit}
        </text>
        <polyline
          className="history-line"
          points={series.points
            .map((point) => `${horizontal(point)},${vertical(point.value)}`)
            .join(' ')}
        />
        {series.points.map((point) => (
          <g key={point.record.id}>
            {point.range?.lower !== undefined && point.range?.upper !== undefined && (
              <line
                className="history-range"
                x1={horizontal(point)}
                x2={horizontal(point)}
                y1={vertical(point.range.lower)}
                y2={vertical(point.range.upper)}
              />
            )}
            {[point.range?.lower, point.range?.upper]
              .filter((bound): bound is number => bound !== undefined)
              .map((bound, index) => (
                <line
                  key={index}
                  className="history-range-cap"
                  x1={horizontal(point) - 7}
                  x2={horizontal(point) + 7}
                  y1={vertical(bound)}
                  y2={vertical(bound)}
                />
              ))}
            <circle
              data-reading-id={point.record.id}
              data-time={point.record.measuredAt}
              className={`history-point range-${point.status}`}
              cx={horizontal(point)}
              cy={vertical(point.value)}
              r={active.record.id === point.record.id ? 6 : 4}
            >
              <title>{`${dateLabel(point.record.measuredAt)}: ${point.value} ${series.unit}; range ${point.reference || 'not recorded'}; ${statusText(point)}`}</title>
            </circle>
          </g>
        ))}
        <text x="66" y="228">
          {series.points[0].record.measuredAt.slice(0, 10)}
        </text>
        <text x="644" y="228" textAnchor="end">
          {series.points.at(-1)!.record.measuredAt.slice(0, 10)}
        </text>
        <text x="350" y="250" textAnchor="middle">
          Recorded date (demo local time)
        </text>
      </svg>
      <p className="body-chart-key">
        <span className="chart-key-line" />
        Recorded value
        <span className="chart-key-range" />
        That reading's supplied range / bound
      </p>
      <div className="body-history-scroll">
        <table aria-label={`${series.label} exact history`}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Value</th>
              <th>Report range</th>
              <th>Comparison</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {series.points.map((point) => (
              <tr
                key={point.record.id}
                className={active.record.id === point.record.id ? 'selected-reading' : ''}
              >
                <th scope="row">
                  <button
                    type="button"
                    className="reading-date"
                    aria-pressed={active.record.id === point.record.id}
                    onClick={() => setPointId(point.record.id)}
                  >
                    {dateLabel(point.record.measuredAt)}
                  </button>
                </th>
                <td>
                  {point.value} {series.unit}
                </td>
                <td>{point.reference || 'Not recorded'}</td>
                <td>
                  <RangeBadge point={point} />
                </td>
                <td>{sourceText(point.record)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <details className="body-source" key={active.record.id}>
        <summary>Source details / {dateLabel(active.record.measuredAt)}</summary>
        <p>{sourceText(active.record)}</p>
        <p>Original recorded entry: {healthValue(active.record)}</p>
        <p>Original range text: {active.record.referenceRange || 'Not recorded'}</p>
        {active.record.notes && <p>{active.record.notes}</p>}
        {sourceReport && <pre>{sourceReport.original}</pre>}
      </details>
    </section>
  );
}

export function BodyMap({
  records,
  reports,
  patientName,
  online,
  close,
}: {
  records: HealthRecord[];
  reports: DemoReport[];
  patientName: string;
  online: boolean;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const noticeId = useId();
  const series = buildReportSeries(records);
  const flagged = series.filter((item) => item.latest.some(outsideReportRange));
  const unknown = series.filter((item) => item.latest.some((point) => point.status === 'unknown'));
  const [group, setGroup] = useState<BodyGroup>(flagged[0]?.group ?? 'general');
  const [preview, setPreview] = useState<BodyGroup | null>(null);
  const [selected, setSelected] = useState(flagged[0]?.key ?? '');
  const [onlyOutside, setOnlyOutside] = useState(true);
  const [threeDimensional, setThreeDimensional] = useState(true);
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const [search, setSearch] = useState('');
  const qualitative = records
    .filter((record) => record.source === 'synthetic-checkup' && record.kind === 'other')
    .filter(
      (record, index, all) =>
        !all.some(
          (other, otherIndex) =>
            other.label === record.label &&
            (other.measuredAt > record.measuredAt ||
              (other.measuredAt === record.measuredAt && otherIndex < index)),
        ),
    );
  const groupSeries = series.filter((item) => item.group === group);
  const visible = groupSeries.filter(
    (item) =>
      (!onlyOutside || item.latest.some(outsideReportRange)) &&
      `${item.label} ${item.unit}`.toLowerCase().includes(search.toLowerCase()),
  );
  const active = visible.find((item) => item.key === selected) ?? visible[0];
  const highlighted = preview ?? group;
  const previewSeries = flagged.filter((item) => item.group === highlighted);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const element = dialog.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  function selectGroup(next: BodyGroup) {
    setGroup(next);
    setSelected('');
    setPreview(null);
  }
  function region(next: BodyGroup, side?: string) {
    const count = flagged.filter((item) => item.group === next).length;
    return (
      <button
        type="button"
        className={`body-region region-${next}${side ? ` region-${side}` : ''}${count ? ' is-flagged' : ''}${group === next ? ' is-selected' : ''}`}
        aria-label={`${BODY_GROUPS[next].label}${side ? ` / ${side}` : ''}: ${count} outside-range series`}
        aria-pressed={group === next}
        title={BODY_GROUPS[next].label}
        onMouseEnter={() => setPreview(next)}
        onMouseLeave={() => setPreview(null)}
        onFocus={() => setPreview(next)}
        onBlur={() => setPreview(null)}
        onClick={() => selectGroup(next)}
      >
        {next === 'circulation' ? <HeartPulse size={32} /> : <span className="body-organ-shape" />}
      </button>
    );
  }
  return (
    <dialog
      ref={dialog}
      className="body-map-dialog"
      aria-labelledby={headingId}
      aria-describedby={noticeId}
      onCancel={close}
    >
      <header className="body-map-header">
        <div>
          <span className="body-overline">PATIENT RECORDS / {patientName}</span>
          <h2 id={headingId}>Body map</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Close body map"
          title="Close body map"
          autoFocus
          onClick={close}
        >
          <X size={22} />
        </button>
      </header>
      <div className="body-map-content">
        <p id={noticeId} className="body-map-notice">
          Synthetic data only. Highlights compare saved readings with supplied report ranges, not
          diagnoses or organ health. Hotspot size is flagged-test count, not severity. Gray does not
          mean healthy.
        </p>
        {!online && (
          <p role="status" className="notice">
            Offline / last loaded in-memory records. New report data requires a connection.
          </p>
        )}
        <p className="body-latest-note">
          Latest recorded reading per named test, unit and context; dates may differ between tests.
          Tied latest readings are all shown.
        </p>
        <div className="body-map-summary" aria-label="Latest report comparison summary">
          <span>
            <strong>{flagged.length}</strong> outside-range series
          </span>
          <span>
            <strong>{unknown.length}</strong> with missing or unclear ranges
          </span>
          <span>
            <strong>{series.length}</strong> recorded series
          </span>
        </div>
        <div className="body-map-layout">
          <section className="body-visual" aria-label="Body regions">
            <div className="body-dimension-switch" role="group" aria-label="Body view mode">
              <button
                type="button"
                aria-pressed={threeDimensional}
                disabled={sceneUnavailable}
                onClick={() => setThreeDimensional(true)}
              >
                3D anatomy
              </button>
              <button
                type="button"
                aria-pressed={!threeDimensional}
                onClick={() => setThreeDimensional(false)}
              >
                2D map
              </button>
            </div>
            {sceneUnavailable && (
              <p role="status">
                3D unavailable in this browser. The 2D map and exact readings remain available.
              </p>
            )}
            {threeDimensional ? (
              <Suspense
                fallback={
                  <div className="body-scene-loading" role="status">
                    Loading body model...
                  </div>
                }
              >
                <BodyScene
                  counts={{
                    circulation: flagged.filter((item) => item.group === 'circulation').length,
                    liver: flagged.filter((item) => item.group === 'liver').length,
                    kidneys: flagged.filter((item) => item.group === 'kidneys').length,
                    general: flagged.filter((item) => item.group === 'general').length,
                  }}
                  selected={group}
                  onSelect={selectGroup}
                  onPreview={setPreview}
                  onUnavailable={() => {
                    setSceneUnavailable(true);
                    setThreeDimensional(false);
                  }}
                />
              </Suspense>
            ) : (
              <div className="body-anatomy">
                <img
                  src="/body-silhouette.png"
                  alt="Schematic front-facing human body"
                  width="330"
                  height="748"
                />
                <span className="body-orientation">FRONT / SCHEMATIC</span>
                {region('circulation')}
                {region('liver')}
                {region('kidneys', 'right')}
                {region('kidneys', 'left')}
              </div>
            )}
            <button
              type="button"
              className={`body-general${flagged.some((item) => item.group === 'general') ? ' is-flagged' : ''}`}
              onClick={() => selectGroup('general')}
              onMouseEnter={() => setPreview('general')}
              onMouseLeave={() => setPreview(null)}
              aria-pressed={group === 'general'}
            >
              <Layers3 size={19} />
              <span>
                General and systemic<small>Vitamins, HbA1c and other readings</small>
              </span>
              <strong>{flagged.filter((item) => item.group === 'general').length}</strong>
            </button>
            <div className="body-preview" aria-live="polite">
              <h3>{BODY_GROUPS[highlighted].label}</h3>
              {previewSeries.length ? (
                <ul>
                  {previewSeries.flatMap((item) =>
                    item.latest.filter(outsideReportRange).map((point) => (
                      <li key={`${item.key}-${point.record.id}`}>
                        <strong>{item.label}</strong>: {point.value} {item.unit} /{' '}
                        {statusText(point).toLowerCase()}
                      </li>
                    )),
                  )}
                </ul>
              ) : (
                <p>No flagged latest readings in this group.</p>
              )}
            </div>
          </section>
          <div className="body-map-readings">
            <nav className="body-group-nav" aria-label="Report groups">
              {(Object.keys(BODY_GROUPS) as BodyGroup[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={group === key}
                  onClick={() => selectGroup(key)}
                >
                  {BODY_GROUPS[key].label}
                  <span>{flagged.filter((item) => item.group === key).length}</span>
                </button>
              ))}
            </nav>
            <section className="body-results" aria-label="Latest readings in selected group">
              <div className="body-section-title">
                <div>
                  <h3>{BODY_GROUPS[group].label}</h3>
                  <p>{BODY_GROUPS[group].detail}</p>
                </div>
                <label className="body-filter">
                  <input
                    type="checkbox"
                    checked={onlyOutside}
                    onChange={(event) => setOnlyOutside(event.target.checked)}
                  />
                  Outside range only
                </label>
              </div>
              <label className="body-search">
                Find a measurement
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Test name or unit"
                />
              </label>
              {!series.length ? (
                <p className="body-empty">No numeric readings recorded.</p>
              ) : !visible.length ? (
                <p className="body-empty">
                  {onlyOutside
                    ? 'No latest readings outside a comparable report range in this group.'
                    : 'No recorded readings in this group.'}
                </p>
              ) : (
                <div className="body-reading-list">
                  {visible.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="body-reading"
                      aria-label={`View ${item.label} history / ${item.unit}${item.context ? ` / ${item.context}` : ''}`}
                      aria-pressed={active?.key === item.key}
                      onClick={() => setSelected(item.key)}
                    >
                      <span className="body-reading-title">
                        <strong>{item.label}</strong>
                        <small>
                          {item.unit}
                          {item.context ? ` / ${item.context}` : ''}
                        </small>
                      </span>
                      <span className="body-reading-values">
                        {item.latest.map((point) => (
                          <span key={point.record.id}>
                            <strong>
                              {point.value} {item.unit}
                            </strong>
                            <RangeBadge point={point} />
                            <small>
                              Report range: {point.reference || 'Not recorded'} /{' '}
                              {dateLabel(point.record.measuredAt)}
                            </small>
                          </span>
                        ))}
                      </span>
                      <ChevronRight size={18} />
                    </button>
                  ))}
                </div>
              )}
            </section>
            {active && <History key={active.key} series={active} reports={reports} />}
            {group === 'general' && qualitative.length > 0 && (
              <section className="body-qualitative" aria-label="Qualitative report findings">
                <h3>Qualitative report findings</h3>
                <p>Source text only / not included in hotspot counts.</p>
                {qualitative.map((record) => (
                  <details key={record.id}>
                    <summary>{record.label}</summary>
                    <p>{record.value}</p>
                    <small>
                      {dateLabel(record.measuredAt)} / {record.reportId}
                    </small>
                  </details>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
