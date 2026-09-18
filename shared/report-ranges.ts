import { HEALTH_KINDS, trendKey, type HealthRecord } from './health.js';

export const BODY_GROUPS = {
  circulation: {
    label: 'Heart and circulation',
    detail: 'Blood pressure, heart rate and lipid readings',
  },
  liver: {
    label: 'Liver-related tests',
    detail: 'SGPT / ALT, SGOT / AST and other liver-panel readings',
  },
  kidneys: {
    label: 'Kidney-related tests',
    detail: 'Creatinine, urea and other kidney-panel readings',
  },
  general: {
    label: 'General and systemic',
    detail: 'Vitamins, HbA1c and readings without a single body location',
  },
} as const;
export type BodyGroup = keyof typeof BODY_GROUPS;
export type RangeStatus = 'above' | 'below' | 'within' | 'unknown';
export type ReportRange = {
  lower?: number;
  upper?: number;
  includeLower: boolean;
  includeUpper: boolean;
};
export type ReportPoint = {
  record: HealthRecord;
  value: number;
  reference: string;
  range: ReportRange | null;
  status: RangeStatus;
  time: number;
};
export type ReportSeries = {
  key: string;
  label: string;
  unit: string;
  context: string;
  group: BodyGroup;
  points: ReportPoint[];
  latest: ReportPoint[];
};

export function parseReportRange(text: string, unit: string): ReportRange | null {
  if (!text.trim() || !unit || unit === 'Other' || unit === 'Not applicable') return null;
  let range = text.trim();
  if (range.endsWith(unit)) range = range.slice(0, -unit.length).trim();
  const number = '(-?(?:\\d+(?:\\.\\d+)?|\\.\\d+))';
  const interval = new RegExp(`^${number}\\s*(?:-|\\u2013|\\u2014|to)\\s*${number}$`, 'i').exec(
    range,
  );
  if (interval) {
    const lower = Number(interval[1]);
    const upper = Number(interval[2]);
    return Number.isFinite(lower) && Number.isFinite(upper) && lower <= upper
      ? { lower, upper, includeLower: true, includeUpper: true }
      : null;
  }
  const bound = new RegExp(`^(<=|>=|<|>|\\u2264|\\u2265)\\s*${number}$`).exec(range);
  if (!bound || !Number.isFinite(Number(bound[2]))) return null;
  const inclusive = ['<=', '>=', '\u2264', '\u2265'].includes(bound[1]);
  return bound[1].startsWith('<') || bound[1] === '\u2264'
    ? { upper: Number(bound[2]), includeLower: true, includeUpper: inclusive }
    : { lower: Number(bound[2]), includeLower: inclusive, includeUpper: true };
}

export function compareReportRange(value: number, range: ReportRange | null): RangeStatus {
  if (!Number.isFinite(value) || !range) return 'unknown';
  if (
    range.lower !== undefined &&
    (value < range.lower || (!range.includeLower && value === range.lower))
  )
    return 'below';
  if (
    range.upper !== undefined &&
    (value > range.upper || (!range.includeUpper && value === range.upper))
  )
    return 'above';
  return 'within';
}

export function bodyGroupFor(label: string): BodyGroup {
  const name = label.trim().toLowerCase().replace(/\s+/g, ' ');
  if (
    [
      'creatinine',
      'serum creatinine',
      'creatinine, serum',
      'urea',
      'blood urea',
      'bun',
      'blood urea nitrogen',
      'egfr',
      'uric acid',
      'cystatin c',
      'urine albumin/creatinine ratio',
      'bun/creatinine ratio',
      'urine white blood cells',
      'urine red blood cells',
      'urine protein',
    ].includes(name)
  )
    return 'kidneys';
  if (
    [
      'sgpt',
      'alt',
      'sgpt (alt)',
      'alt (sgpt)',
      'alanine aminotransferase',
      'sgot',
      'ast',
      'sgot (ast)',
      'ast (sgot)',
      'aspartate aminotransferase',
      'bilirubin',
      'total bilirubin',
      'direct bilirubin',
      'alkaline phosphatase',
      'alp',
      'ggt',
      'indirect bilirubin',
      'albumin',
      'globulin',
      'total protein',
      'albumin/globulin ratio',
    ].includes(name)
  )
    return 'liver';
  if (
    [
      'cholesterol',
      'total cholesterol',
      'hdl',
      'hdl cholesterol',
      'ldl',
      'ldl cholesterol',
      'triglycerides',
      'heart rate',
      'pulse',
      'systolic blood pressure',
      'diastolic blood pressure',
      'vldl cholesterol',
      'non-hdl cholesterol',
      'total cholesterol/hdl ratio',
      'ldl/hdl ratio',
      'apolipoprotein a1',
      'apolipoprotein b',
      'lipoprotein(a)',
      'high sensitivity troponin i',
      'nt-probnp',
    ].includes(name)
  )
    return 'circulation';
  return 'general';
}

export function buildReportSeries(records: HealthRecord[]): ReportSeries[] {
  const series = new Map<string, ReportSeries>();
  for (const record of records) {
    if (['diagnosis', 'other', 'walking', 'running', 'steps'].includes(record.kind)) continue;
    const time = Date.parse(`${record.measuredAt}:00Z`);
    if (!Number.isFinite(time)) continue;
    const label = record.label || HEALTH_KINDS[record.kind].label;
    const pairedRanges = record.kind === 'bp' ? record.referenceRange.split(/\s*\/\s*/) : [];
    const parts =
      record.kind === 'bp'
        ? [
            {
              key: 'systolic',
              label: 'Systolic blood pressure',
              value: record.value,
              unit: record.unit,
              reference: pairedRanges.length === 2 ? pairedRanges[0] : '',
            },
            {
              key: 'diastolic',
              label: 'Diastolic blood pressure',
              value: record.secondary,
              unit: record.unit,
              reference: pairedRanges.length === 2 ? pairedRanges[1] : '',
            },
            ...(record.pulse
              ? [{ key: 'pulse', label: 'Pulse', value: record.pulse, unit: 'bpm', reference: '' }]
              : []),
          ]
        : [
            {
              key: 'value',
              label,
              value: record.value,
              unit: record.unit,
              reference: record.referenceRange,
            },
          ];
    for (const part of parts) {
      if (!/^\d+(?:\.\d+)?$/.test(part.value)) continue;
      const value = Number(part.value);
      if (!Number.isFinite(value)) continue;
      const key = JSON.stringify([trendKey(record), part.key]);
      const range = parseReportRange(part.reference, part.unit);
      const point: ReportPoint = {
        record,
        value,
        reference: part.reference,
        range,
        status: compareReportRange(value, range),
        time,
      };
      const existing = series.get(key);
      if (existing) existing.points.push(point);
      else
        series.set(key, {
          key,
          label: part.label,
          unit: part.unit,
          context: record.context,
          group: bodyGroupFor(part.label),
          points: [point],
          latest: [],
        });
    }
  }
  return [...series.values()]
    .map((group) => {
      group.points.sort(
        (first, second) =>
          first.time - second.time || first.record.id.localeCompare(second.record.id),
      );
      group.latest = group.points.filter((point) => point.time === group.points.at(-1)!.time);
      return group;
    })
    .sort(
      (first, second) =>
        first.label.localeCompare(second.label) || first.unit.localeCompare(second.unit),
    );
}

export const outsideReportRange = (point: ReportPoint) =>
  point.status === 'above' || point.status === 'below';
