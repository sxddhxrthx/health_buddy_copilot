export const HEALTH_KINDS = {
  glucose: { label: 'Glucose', units: ['mg/dL', 'mmol/L'] },
  bp: { label: 'Blood pressure', units: ['mmHg'] },
  walking: { label: 'Walking', units: ['km', 'mi'] },
  running: { label: 'Running', units: ['km', 'mi'] },
  steps: { label: 'Steps', units: ['steps'] },
  weight: { label: 'Weight', units: ['kg', 'lb'] },
  temperature: { label: 'Temperature', units: ['°C', '°F'] },
  oxygen: { label: 'Oxygen saturation', units: ['%'] },
  lab: {
    label: 'Laboratory result',
    units: [
      'g/dL',
      'mg/dL',
      'mmol/L',
      '%',
      '10^9/L',
      'U/L',
      'IU/L',
      'ng/mL',
      'pg/mL',
      'nmol/L',
      'bpm',
      'mmHg',
      '10^12/L',
      'fL',
      'pg',
      'mg/L',
      'ug/dL',
      'ug/L',
      'ng/L',
      'ng/dL',
      'mIU/L',
      'uIU/mL',
      'IU/mL',
      'ratio',
      'mL/min/1.73m2',
      'mOsm/kg',
      'mg/g',
      'mm/hr',
      'seconds',
      'cells/HPF',
      'pH',
      'Other',
    ],
  },
  diagnosis: { label: 'Recorded diagnosis', units: ['Not applicable'] },
  other: { label: 'Other health record', units: ['Not applicable'] },
} as const;
export type HealthKind = keyof typeof HEALTH_KINDS;
export const GLUCOSE_CONTEXTS = ['Fasting', 'Before meal', 'After meal', 'Unspecified'] as const;
export type HealthDraft = {
  kind: HealthKind;
  measuredAt: string;
  value: string;
  secondary: string;
  pulse: string;
  duration: string;
  unit: string;
  label: string;
  context: string;
  notes: string;
  referenceRange: string;
};
export type HealthRecord = HealthDraft & {
  id: string;
  source: 'manual' | 'simulated-report' | 'seed' | 'synthetic-checkup';
  reportId?: string;
};
export type DemoReport = {
  id: string;
  title: string;
  date: string;
  original: string;
  fields: { draft: HealthDraft; reviewNote: string }[];
};
export type HealthSession = { id: string; records: HealthRecord[]; importedReportIds: string[] };
export function emptyHealthDraft(kind: HealthKind = 'glucose'): HealthDraft {
  return {
    kind,
    measuredAt: '2026-01-15T08:00',
    value: '',
    secondary: '',
    pulse: '',
    duration: '',
    unit: HEALTH_KINDS[kind].units[0],
    label: '',
    context: 'Unspecified',
    notes: '',
    referenceRange: '',
  };
}

// Technical input checks only: these bounds are not clinical thresholds.
export function parseHealthDraft(input: unknown): HealthDraft {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid health entry.');
  const raw = input as Record<string, unknown>;
  if (typeof raw.kind !== 'string' || !Object.hasOwn(HEALTH_KINDS, raw.kind))
    throw new Error('Choose a supported record type.');
  const kind = raw.kind as HealthKind;
  const text = (key: string, max: number) => {
    if (typeof raw[key] !== 'string' || raw[key].length > max)
      throw new Error(`Invalid ${key} (maximum ${max} characters).`);
    return raw[key].trim();
  };
  const measuredAt = text('measuredAt', 16);
  const date = new Date(`${measuredAt}:00Z`);
  if (
    !/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(measuredAt) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 16) !== measuredAt
  )
    throw new Error('Enter a valid demo date and time (2000–2099).');
  const unit = text('unit', 30);
  if (!(HEALTH_KINDS[kind].units as readonly string[]).includes(unit))
    throw new Error('Choose a supported unit.');
  const numeric = (key: string, optional = false, max = 1000000) => {
    const value = text(key, 20);
    if (optional && !value) return '';
    if (!/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value)) || Number(value) > max)
      throw new Error(`Enter a non-negative numeric ${key} (up to ${max}).`);
    return String(Number(value));
  };
  const isText = kind === 'diagnosis' || kind === 'other';
  const value = isText
    ? text('value', 200)
    : numeric('value', false, kind === 'oxygen' ? 100 : 1000000);
  if (!value) throw new Error('Enter a value or recorded finding.');
  if (kind === 'steps' && !Number.isInteger(Number(value)))
    throw new Error('Steps must be a whole number.');
  const label = kind === 'lab' || isText ? text('label', 80) : '';
  if ((kind === 'lab' || isText) && !label) throw new Error('Enter a test or record name.');
  const context = kind === 'glucose' ? text('context', 30) : '';
  if (kind === 'glucose' && !(GLUCOSE_CONTEXTS as readonly string[]).includes(context))
    throw new Error('Choose a glucose measurement context.');
  return {
    kind,
    measuredAt,
    value,
    unit,
    label,
    context,
    secondary: kind === 'bp' ? numeric('secondary') : '',
    pulse: kind === 'bp' ? numeric('pulse', true, 1000) : '',
    duration: kind === 'walking' || kind === 'running' ? numeric('duration', true, 1440) : '',
    referenceRange:
      !isText && !['walking', 'running', 'steps'].includes(kind) ? text('referenceRange', 80) : '',
    notes: text('notes', 500),
  };
}

export function healthValue(record: HealthDraft) {
  return `${record.value}${record.kind === 'bp' ? ` / ${record.secondary}` : ''}${record.unit === 'Not applicable' ? '' : ` ${record.unit}`}`;
}

// Never combine different units, tests or glucose contexts into one trend.
export function trendKey(record: HealthDraft) {
  return [record.kind, record.unit, record.label, record.context].join('|');
}
