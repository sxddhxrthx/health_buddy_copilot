import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Building2,
  ChevronRight,
  Database,
  Download,
  FlaskConical,
  LockKeyhole,
  Watch,
  X,
} from 'lucide-react';
import type { CareSnapshot } from '../shared/care';
import './health-connections.css';

const providers = [
  {
    name: 'Tata 1mg',
    detail: 'Lab reports',
    category: 'medical',
    initials: '1mg',
    color: '#a74c39',
  },
  {
    name: 'Apollo 24/7',
    detail: 'Labs and hospital records',
    category: 'medical',
    initials: 'A',
    color: '#176c86',
  },
  {
    name: 'Manipal Hospitals',
    detail: 'Hospital reports',
    category: 'medical',
    initials: 'M',
    color: '#2867a0',
  },
  {
    name: 'Cloudnine',
    detail: 'Hospital reports',
    category: 'medical',
    initials: 'C9',
    color: '#93605c',
  },
  {
    name: 'Dr Lal PathLabs',
    detail: 'Diagnostic reports',
    category: 'medical',
    initials: 'L',
    color: '#896a22',
  },
  {
    name: 'Metropolis',
    detail: 'Diagnostic reports',
    category: 'medical',
    initials: 'M',
    color: '#317954',
  },
  {
    name: 'Thyrocare',
    detail: 'Diagnostic reports',
    category: 'medical',
    initials: 'T',
    color: '#925649',
  },
  {
    name: 'Healthians',
    detail: 'Health checkups',
    category: 'medical',
    initials: 'H',
    color: '#326b83',
  },
  {
    name: 'Google Fit',
    detail: 'Legacy service / migration required',
    category: 'fitness',
    initials: 'G',
    color: '#397451',
  },
  {
    name: 'Health Connect',
    detail: 'Android health data',
    category: 'fitness',
    initials: 'HC',
    color: '#367b66',
  },
  {
    name: 'Fitbit',
    detail: 'Activity, sleep and heart rate',
    category: 'fitness',
    initials: 'F',
    color: '#247d85',
  },
  {
    name: 'Apple Health / Apple Watch',
    detail: 'HealthKit / device permission required',
    category: 'fitness',
    initials: 'A',
    color: '#864861',
  },
  {
    name: 'Samsung Health',
    detail: 'Activity and wearable readings',
    category: 'fitness',
    initials: 'S',
    color: '#46669a',
  },
  {
    name: 'Garmin Connect',
    detail: 'Activity and fitness readings',
    category: 'fitness',
    initials: 'G',
    color: '#46616f',
  },
] as const;

function ComingSoon({ provider, close }: { provider: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current!.showModal();
    return () => {
      dialog.current?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      className="connection-dialog"
      ref={dialog}
      aria-labelledby="connection-title"
      onCancel={close}
    >
      <header>
        <LockKeyhole size={24} />
        <button
          className="icon-button"
          title="Close connection notice"
          aria-label="Close connection notice"
          onClick={close}
          autoFocus
        >
          <X size={20} />
        </button>
      </header>
      <p>{provider}</p>
      <h2 id="connection-title">Coming soon</h2>
      <p>
        This provider is not connected. No login, credentials, device permissions or reports are
        requested or stored.
      </p>
      <button className="primary" onClick={close}>
        Got it
      </button>
    </dialog>
  );
}

export function HealthConnections({
  sample,
  disabled,
  load,
}: {
  sample: CareSnapshot['sampleCheckups'];
  disabled: boolean;
  load: () => void;
}) {
  const [category, setCategory] = useState<'medical' | 'fitness'>('medical');
  const [provider, setProvider] = useState('');
  return (
    <section className="health-connections" aria-label="Reports and connected apps">
      <div className="connection-heading">
        <div>
          <span className="body-overline">HEALTH RECORD SOURCES</span>
          <h2>
            <Database size={20} />
            Reports and connected apps
          </h2>
        </div>
        <span className="connection-state">
          <LockKeyhole size={14} />
          No providers connected
        </span>
      </div>
      <div className="sample-checkups">
        <div className="sample-symbol">
          <FlaskConical size={25} />
        </div>
        <div>
          <h3>{sample.profile}</h3>
          <p>
            {sample.measurements} measurements / {sample.dates.length} checkups / {sample.records}{' '}
            synthetic entries
          </p>
          <small>
            {sample.dates[0]} to {sample.dates.at(-1)} / Fictional values and reference intervals
          </small>
        </div>
        <button className="secondary" disabled={disabled || sample.loaded} onClick={load}>
          <Download size={16} />
          {sample.loaded ? 'Sample checkups loaded' : 'Load sample checkups'}
        </button>
      </div>
      <div className="connection-tabs" role="group" aria-label="Provider type">
        <button aria-pressed={category === 'medical'} onClick={() => setCategory('medical')}>
          <Building2 size={16} />
          Labs and hospitals
        </button>
        <button aria-pressed={category === 'fitness'} onClick={() => setCategory('fitness')}>
          <Watch size={16} />
          Fitness and wearables
        </button>
      </div>
      <div className="provider-grid">
        {providers
          .filter((item) => item.category === category)
          .map((item) => (
            <button
              className="provider-item"
              key={item.name}
              onClick={() => setProvider(item.name)}
              aria-label={`${item.name} / Coming soon`}
            >
              <span className="provider-mark" style={{ color: item.color }}>
                {item.initials}
              </span>
              <span>
                <strong>{item.name}</strong>
                <small>{item.detail}</small>
                <span className="provider-soon">Coming soon</span>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
      </div>
      <p className="connection-footnote">
        <Activity size={14} />
        Provider options are previews, not active integrations or partnerships.
      </p>
      {provider && <ComingSoon provider={provider} close={() => setProvider('')} />}
    </section>
  );
}
