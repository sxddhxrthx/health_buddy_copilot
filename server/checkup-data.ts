import {
  emptyHealthDraft,
  parseHealthDraft,
  type DemoReport,
  type HealthRecord,
} from '../shared/health.js';

export const CHECKUP_VERSION = 'checkups-v1';
export const CHECKUP_DATES = ['2025-07-15', '2025-10-15', '2026-01-15'] as const;
type SampleTest = {
  label: string;
  unit: string;
  lower: number;
  upper: number;
  value: number;
  panel: string;
};
type Entry = [label: string, unit: string, lower: number, upper: number, value: number];
const panel = (name: string, rows: Entry[]): SampleTest[] =>
  rows.map(([label, unit, lower, upper, value]) => ({
    label,
    unit,
    lower,
    upper,
    value,
    panel: name,
  }));

export const CHECKUP_TESTS: SampleTest[] = [
  ...panel('Blood count', [
    ['Hemoglobin', 'g/dL', 12, 16, 14.2],
    ['Red blood cell count', '10^12/L', 3.8, 5.5, 4.7],
    ['Hematocrit', '%', 36, 48, 42],
    ['MCV', 'fL', 80, 100, 89],
    ['MCH', 'pg', 27, 33, 30],
    ['MCHC', 'g/dL', 32, 36, 34],
    ['RDW-CV', '%', 11, 15, 13],
    ['RDW-SD', 'fL', 37, 54, 43],
    ['White blood cell count', '10^9/L', 4, 11, 7],
    ['Platelet count', '10^9/L', 150, 450, 265],
    ['Mean platelet volume', 'fL', 7, 12, 9.5],
    ['Platelet distribution width', 'fL', 9, 17, 12],
    ['Plateletcrit', '%', 0.15, 0.4, 0.25],
    ['Neutrophils', '%', 40, 75, 58],
    ['Lymphocytes', '%', 20, 45, 31],
    ['Monocytes', '%', 2, 10, 6],
    ['Eosinophils', '%', 1, 6, 4],
    ['Basophils', '%', 0, 2, 1],
    ['Absolute neutrophils', '10^9/L', 1.5, 7.5, 4.06],
    ['Absolute lymphocytes', '10^9/L', 1, 4, 2.17],
    ['Absolute monocytes', '10^9/L', 0.2, 1, 0.42],
    ['Absolute eosinophils', '10^9/L', 0.02, 0.5, 0.28],
    ['Absolute basophils', '10^9/L', 0, 0.2, 0.07],
    ['Reticulocytes', '%', 0.5, 2.5, 1.2],
  ]),
  ...panel('Lipids and circulation', [
    ['Total cholesterol', 'mg/dL', 120, 200, 176],
    ['LDL cholesterol', 'mg/dL', 0, 100, 88],
    ['HDL cholesterol', 'mg/dL', 40, 90, 60],
    ['Triglycerides', 'mg/dL', 30, 150, 140],
    ['VLDL cholesterol', 'mg/dL', 5, 30, 28],
    ['Non-HDL cholesterol', 'mg/dL', 0, 130, 116],
    ['Total cholesterol/HDL ratio', 'ratio', 0, 4.5, 2.93],
    ['LDL/HDL ratio', 'ratio', 0, 3, 1.47],
    ['Apolipoprotein A1', 'mg/dL', 110, 200, 150],
    ['Apolipoprotein B', 'mg/dL', 50, 100, 78],
    ['Lipoprotein(a)', 'mg/dL', 0, 30, 18],
    ['Heart rate', 'bpm', 60, 100, 72],
    ['Systolic blood pressure', 'mmHg', 90, 120, 112],
    ['Diastolic blood pressure', 'mmHg', 60, 80, 74],
    ['High sensitivity troponin I', 'ng/L', 0, 16, 3],
    ['NT-proBNP', 'pg/mL', 0, 125, 48],
  ]),
  ...panel('Liver and proteins', [
    ['SGPT', 'U/L', 0, 40, 24],
    ['SGOT', 'U/L', 0, 40, 22],
    ['GGT', 'U/L', 8, 60, 28],
    ['Alkaline phosphatase', 'U/L', 40, 130, 78],
    ['Total bilirubin', 'mg/dL', 0.2, 1.2, 0.7],
    ['Direct bilirubin', 'mg/dL', 0, 0.3, 0.2],
    ['Indirect bilirubin', 'mg/dL', 0.1, 0.9, 0.5],
    ['Total protein', 'g/dL', 6, 8.3, 7.2],
    ['Albumin', 'g/dL', 3.5, 5, 4.2],
    ['Globulin', 'g/dL', 2, 3.5, 3],
    ['Albumin/globulin ratio', 'ratio', 1, 2.5, 1.4],
    ['Lactate dehydrogenase', 'U/L', 120, 250, 165],
  ]),
  ...panel('Kidney and electrolytes', [
    ['Creatinine', 'mg/dL', 0.6, 1.2, 0.9],
    ['Blood urea', 'mg/dL', 15, 40, 27],
    ['Blood urea nitrogen', 'mg/dL', 7, 20, 12.6],
    ['BUN/creatinine ratio', 'ratio', 10, 20, 14],
    ['eGFR', 'mL/min/1.73m2', 90, 130, 110],
    ['Uric acid', 'mg/dL', 2.5, 7, 4.8],
    ['Sodium', 'mmol/L', 135, 145, 140],
    ['Potassium', 'mmol/L', 3.5, 5.1, 4.2],
    ['Chloride', 'mmol/L', 98, 107, 102],
    ['Bicarbonate', 'mmol/L', 22, 29, 25],
    ['Anion gap', 'mmol/L', 8, 16, 13],
    ['Serum osmolality', 'mOsm/kg', 275, 295, 286],
    ['Cystatin C', 'mg/L', 0.6, 1.1, 0.82],
    ['Urine albumin/creatinine ratio', 'mg/g', 0, 30, 12],
  ]),
  ...panel('Vitamins and minerals', [
    ['Vitamin A', 'ug/dL', 20, 60, 40],
    ['Vitamin B1', 'nmol/L', 70, 180, 120],
    ['Vitamin B2', 'nmol/L', 5, 50, 25],
    ['Vitamin B3', 'ng/mL', 0.5, 8.5, 4.5],
    ['Vitamin B5', 'ng/mL', 12, 100, 48],
    ['Vitamin B6', 'ng/mL', 5, 50, 20],
    ['Vitamin B7', 'ng/mL', 0.2, 1, 0.5],
    ['Folate (B9)', 'ng/mL', 4, 20, 10],
    ['Vitamin B12', 'pg/mL', 200, 900, 480],
    ['Vitamin C', 'mg/dL', 0.4, 2, 1],
    ['Vitamin D', 'ng/mL', 30, 100, 42],
    ['Vitamin E', 'mg/L', 5, 18, 10],
    ['Vitamin K1', 'ng/mL', 0.1, 2.2, 0.8],
    ['Calcium', 'mg/dL', 8.5, 10.5, 9.4],
    ['Ionized calcium', 'mmol/L', 1.12, 1.32, 1.22],
    ['Phosphorus', 'mg/dL', 2.5, 4.5, 3.4],
    ['Magnesium', 'mg/dL', 1.7, 2.4, 2.1],
    ['Iron', 'ug/dL', 50, 170, 95],
    ['Ferritin', 'ng/mL', 20, 250, 82],
    ['Total iron binding capacity', 'ug/dL', 250, 450, 320],
    ['Transferrin saturation', '%', 20, 50, 29.7],
    ['Zinc', 'ug/dL', 60, 120, 88],
    ['Copper', 'ug/dL', 70, 140, 105],
    ['Selenium', 'ug/L', 70, 150, 108],
  ]),
  ...panel('Glucose and endocrine', [
    ['Fasting glucose', 'mg/dL', 70, 100, 88],
    ['Post-meal glucose', 'mg/dL', 70, 140, 118],
    ['HbA1c', '%', 4, 5.6, 5.2],
    ['Fasting insulin', 'uIU/mL', 2, 25, 8],
    ['C-peptide', 'ng/mL', 0.8, 3.8, 2],
    ['TSH', 'mIU/L', 0.4, 4.5, 2.1],
    ['Free T3', 'pg/mL', 2, 4.4, 3.1],
    ['Free T4', 'ng/dL', 0.8, 1.8, 1.2],
    ['Total T3', 'ng/dL', 80, 200, 120],
    ['Total T4', 'ug/dL', 5, 12, 8],
    ['Morning cortisol', 'ug/dL', 5, 25, 13],
    ['Parathyroid hormone', 'pg/mL', 15, 65, 38],
  ]),
  ...panel('Inflammation and specialist assays', [
    ['C-reactive protein', 'mg/L', 0, 5, 1.2],
    ['High sensitivity CRP', 'mg/L', 0, 3, 1],
    ['ESR', 'mm/hr', 0, 20, 9],
    ['Procalcitonin', 'ng/mL', 0, 0.1, 0.03],
    ['Prothrombin time', 'seconds', 11, 14, 12.5],
    ['INR', 'ratio', 0.8, 1.2, 1],
    ['APTT', 'seconds', 25, 35, 30],
    ['Fibrinogen', 'mg/dL', 200, 400, 290],
    ['D-dimer', 'ng/mL', 0, 500, 180],
    ['Creatine kinase', 'U/L', 30, 200, 95],
    ['Amylase', 'U/L', 30, 110, 66],
    ['Lipase', 'U/L', 13, 60, 31],
    ['Immunoglobulin G', 'mg/dL', 700, 1600, 1100],
    ['Immunoglobulin A', 'mg/dL', 70, 400, 190],
    ['Immunoglobulin M', 'mg/dL', 40, 230, 110],
    ['Total IgE', 'IU/mL', 0, 100, 35],
  ]),
  ...panel('Urine microscopy', [
    ['Urine pH', 'pH', 4.5, 8, 6],
    ['Urine specific gravity', 'ratio', 1.005, 1.03, 1.015],
    ['Urine white blood cells', 'cells/HPF', 0, 5, 2],
    ['Urine red blood cells', 'cells/HPF', 0, 3, 1],
    ['Urine epithelial cells', 'cells/HPF', 0, 5, 2],
    ['Urine protein', 'mg/dL', 0, 15, 5],
    ['Urine glucose', 'mg/dL', 0, 15, 0],
    ['Urine urobilinogen', 'mg/dL', 0.2, 1, 0.5],
  ]),
];

const scenarioValues: Record<string, Record<string, [number, number, number]>> = {
  'SYN-USER-001': {
    'Total cholesterol': [184, 216, 252],
    'LDL cholesterol': [99, 134, 166],
    'HDL cholesterol': [59, 48, 38],
    Triglycerides: [130, 170, 240],
    'Apolipoprotein B': [82, 106, 132],
    'Lipoprotein(a)': [22, 32, 42],
    'Systolic blood pressure': [116, 124, 138],
    'Diastolic blood pressure': [74, 82, 88],
    'High sensitivity CRP': [1.1, 2.6, 4.2],
  },
  'SYN-USER-002': {
    SGPT: [28, 47, 78],
    SGOT: [25, 42, 62],
    GGT: [32, 64, 92],
    'Alkaline phosphatase': [85, 125, 154],
    'Total bilirubin': [0.7, 1.1, 1.6],
    'Direct bilirubin': [0.2, 0.3, 0.5],
    Albumin: [4.1, 3.6, 3.2],
    Creatinine: [0.9, 1.25, 1.6],
    'Blood urea': [28, 42, 58],
    eGFR: [105, 85, 68],
    'Uric acid': [5.2, 6.8, 8.1],
    'Cystatin C': [0.85, 1.05, 1.32],
    'Urine albumin/creatinine ratio': [12, 28, 55],
    'Urine white blood cells': [2, 5, 14],
    'C-reactive protein': [1.3, 3.5, 8],
  },
  'SYN-USER-003': {
    'Vitamin A': [38, 26, 17],
    'Vitamin B1': [108, 76, 58],
    'Vitamin B6': [18, 7, 3.8],
    'Vitamin B12': [410, 225, 155],
    'Folate (B9)': [9, 5.5, 3.1],
    'Vitamin C': [0.9, 0.55, 0.28],
    'Vitamin D': [38, 27, 16],
    'Vitamin E': [9, 6.2, 4.3],
    Calcium: [9.3, 8.7, 8.1],
    Magnesium: [2, 1.8, 1.5],
    Iron: [90, 61, 38],
    Ferritin: [62, 27, 12],
    Zinc: [86, 66, 48],
    Hemoglobin: [13.4, 12.3, 11.4],
  },
};
export function checkupProfile(persona: string) {
  return persona === 'SYN-USER-001'
    ? 'Circulation pattern'
    : persona === 'SYN-USER-002'
      ? 'Liver and kidney pattern'
      : 'Vitamin and mineral pattern';
}
export const CHECKUP_REPORT_IDS = CHECKUP_DATES.map((date) => `SYN-CHECKUP-V1-${date}`);

export function sampleCheckups(patient: { name: string; persona: string }): {
  reports: DemoReport[];
  records: HealthRecord[];
} {
  const scenario = scenarioValues[patient.persona];
  if (!scenario) throw new Error('No synthetic checkup profile is available for this patient.');
  const records: HealthRecord[] = [];
  const reports = CHECKUP_DATES.map((date, dateIndex) => {
    const reportId = CHECKUP_REPORT_IDS[dateIndex];
    const values = new Map(
      CHECKUP_TESTS.map((test) => [test.label, scenario[test.label]?.[dateIndex] ?? test.value]),
    );
    const total = values.get('Total cholesterol')!;
    const hdl = values.get('HDL cholesterol')!;
    const triglycerides = values.get('Triglycerides')!;
    values.set('VLDL cholesterol', triglycerides / 5);
    values.set('LDL cholesterol', total - hdl - triglycerides / 5);
    values.set('Non-HDL cholesterol', total - hdl);
    values.set('Total cholesterol/HDL ratio', total / hdl);
    values.set('LDL/HDL ratio', values.get('LDL cholesterol')! / hdl);
    values.set(
      'Indirect bilirubin',
      values.get('Total bilirubin')! - values.get('Direct bilirubin')!,
    );
    values.set('Total protein', values.get('Albumin')! + values.get('Globulin')!);
    values.set('Albumin/globulin ratio', values.get('Albumin')! / values.get('Globulin')!);
    values.set('Blood urea nitrogen', values.get('Blood urea')! / 2.14);
    values.set(
      'BUN/creatinine ratio',
      values.get('Blood urea nitrogen')! / values.get('Creatinine')!,
    );
    values.set(
      'Transferrin saturation',
      (values.get('Iron')! / values.get('Total iron binding capacity')!) * 100,
    );
    const dated: HealthRecord[] = CHECKUP_TESTS.map((test, index) => ({
      ...parseHealthDraft({
        ...emptyHealthDraft('lab'),
        label: test.label,
        unit: test.unit,
        value: String(Number(values.get(test.label)!.toFixed(3))),
        referenceRange: `${test.lower}-${test.upper}`,
        measuredAt: `${date}T09:00`,
        notes: `${test.panel}. Fictional checkup fixture; illustrative interval, not medical guidance.`,
      }),
      id: `${patient.persona}-${reportId}-${index}`,
      source: 'synthetic-checkup',
      reportId,
    }));
    const qualitative = [
      [
        'Urine culture',
        patient.persona === 'SYN-USER-002' && dateIndex === 2
          ? 'Growth reported: fictional E. coli isolate. Clinician review required.'
          : 'No significant growth in this fictional sample.',
      ],
      [
        'Urine nitrite',
        patient.persona === 'SYN-USER-002' && dateIndex === 2
          ? 'Positive (synthetic)'
          : 'Negative (synthetic)',
      ],
      [
        'Urine leukocyte esterase',
        patient.persona === 'SYN-USER-002' && dateIndex === 2
          ? 'Positive (synthetic)'
          : 'Negative (synthetic)',
      ],
      [
        'Urine appearance',
        patient.persona === 'SYN-USER-002' && dateIndex === 2
          ? 'Cloudy (synthetic)'
          : 'Clear (synthetic)',
      ],
      ['Urine ketones', 'Negative (synthetic)'],
      [
        'Urine microscopy comment',
        'Fictional source finding. No automated infection diagnosis or antibiotic recommendation.',
      ],
    ];
    for (const [label, value] of qualitative)
      dated.push({
        ...parseHealthDraft({
          ...emptyHealthDraft('other'),
          label,
          value,
          measuredAt: `${date}T09:00`,
          notes: 'Qualitative source text; excluded from numeric hotspot counts.',
        }),
        id: `${patient.persona}-${reportId}-${label}`,
        source: 'synthetic-checkup',
        reportId,
      });
    records.push(...dated);
    return {
      id: reportId,
      title: `Synthetic checkup / ${date}`,
      date,
      fields: [],
      original: [
        'SYNTHETIC CHECKUP - NOT A REAL LAB REPORT',
        `Persona: ${patient.name} / ${patient.persona}`,
        `Fixture: ${CHECKUP_VERSION} / ${checkupProfile(patient.persona)} / ${date}`,
        'All values and intervals are fictional demonstration content. Broad catalogue, not a recommended screening package.',
        ...dated.map(
          (record) =>
            `${record.label}: ${record.value} ${record.unit === 'Not applicable' ? '' : record.unit} | Printed interval: ${record.referenceRange || 'Qualitative result'}`,
        ),
      ].join('\n'),
    };
  });
  return { reports, records };
}
