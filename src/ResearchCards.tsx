import type { ReactNode } from 'react';
import type { Distribution } from '../shared/contracts';

export function Metric({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

export function DistributionCard({
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
