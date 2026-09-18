export const REVIEW_VERSION = 'evidence-review-v1';
export const REVIEW_SCENARIOS = {
  cardiology: 'Cardiology measurement review',
  pulmonology: 'Pulmonology measurement review',
} as const;
export type ReviewScenario = keyof typeof REVIEW_SCENARIOS;
export const REVIEW_QUESTIONS = {
  completeness: 'Which missing measurements or source details need verification?',
  applicability: 'Does the reviewed literature apply to this fictional scenario?',
  disagreement: 'Where do the sources disagree or leave uncertainty?',
} as const;
export const REVIEW_WARNING =
  'Synthetic evidence-review draft — not clinical advice. Qualified human review required. Fictional cohort outcomes do not establish treatment effectiveness.';
export type ReviewSource = {
  id: string;
  kind: 'patient' | 'literature' | 'cohort';
  title: string;
  text: string;
  url?: string;
};
export type ReviewStatus = {
  available: boolean;
  message: string;
  snapshotVersion?: string;
  scenarios: ReviewScenario[];
};
export type ReviewRequest = {
  scenario: ReviewScenario;
  snapshotVersion: string;
  syntheticOnly: true;
};
export type ReviewSelection = {
  literatureIds: string[];
  questionIds: (keyof typeof REVIEW_QUESTIONS)[];
};
export type ReviewReport = {
  patientId: string;
  snapshotVersion: string;
  scenario: ReviewScenario;
  generatedAt: string;
  warning: string;
  versions: {
    schema: string;
    model: string;
    digest: string;
    corpus: string;
    generator: string;
    matcher: string;
  };
  sources: ReviewSource[];
  questions: string[];
  limitations: string[];
};

export function exactObject(input: unknown, keys: string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new Error('Invalid review object.');
  const value = input as Record<string, unknown>;
  if (Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key)))
    throw new Error('Unexpected review fields.');
  return value;
}

export function parseReviewRequest(input: unknown): ReviewRequest {
  const value = exactObject(input, ['scenario', 'snapshotVersion', 'syntheticOnly']);
  if (
    typeof value.scenario !== 'string' ||
    !Object.hasOwn(REVIEW_SCENARIOS, value.scenario) ||
    typeof value.snapshotVersion !== 'string' ||
    !/^[a-f0-9]{64}$/.test(value.snapshotVersion) ||
    value.syntheticOnly !== true
  )
    throw new Error('Choose a supported scenario and confirm fictional-only review.');
  return value as ReviewRequest;
}

// The model selects reviewed material, never authors clinical claims or URLs.
export function parseReviewSelection(input: unknown, allowedIds: string[]): ReviewSelection {
  const value = exactObject(input, ['literatureIds', 'questionIds']);
  const ids = (raw: unknown, allowed: string[], max: number) => {
    if (
      !Array.isArray(raw) ||
      raw.length > max ||
      raw.some((id) => typeof id !== 'string' || !allowed.includes(id)) ||
      new Set(raw).size !== raw.length
    )
      throw new Error('Invalid review references.');
    return raw as string[];
  };
  return {
    literatureIds: ids(value.literatureIds, allowedIds, 6),
    questionIds: ids(
      value.questionIds,
      Object.keys(REVIEW_QUESTIONS),
      3,
    ) as ReviewSelection['questionIds'],
  };
}
