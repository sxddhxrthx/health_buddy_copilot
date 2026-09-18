import { createHash } from 'node:crypto';
import type { ReviewScenario } from '../shared/review.js';

export type ReviewedArticle = {
  id: string;
  scenario: ReviewScenario;
  title: string;
  url: string;
  publicationDate: string;
  reviewedAt: string;
  reviewer: string;
  license: string;
  permissionEvidence: string;
  correctionCheck: string;
  // Original, human-reviewed summary, or material explicitly permitted for reuse.
  summary: string;
  sha256: string;
};
export type ReviewConfig = {
  approvalUrl: string;
  reviewer: string;
  model: string;
  digest: string;
  modelLicenseEvidence: string;
  evaluationEvidence: string;
  sharingPurposeApproval: string;
  corpusVersion: string;
  scenarios: ReviewScenario[];
  articles: ReviewedArticle[];
};

// Activation requires a reviewed source change, not an environment-variable bypass.
// No literature or model is claimed approved by the implementation.
export const APPROVED_REVIEW_CONFIG: ReviewConfig | null = null;

// Separate fixed-fixture evaluation approval; never consumed by the application router.
// Its evaluationEvidence records the approved protocol, not a claim of completed evaluation.
export const APPROVED_EVALUATION_CONFIG: ReviewConfig | null = null;

export function hashReview(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export function validateReviewConfig(config: ReviewConfig): void {
  const text = (value: unknown, max = 1000): value is string =>
    typeof value === 'string' && value.trim().length > 0 && value.length <= max;
  const https = (value: string) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password;
    } catch {
      return false;
    }
  };
  if (
    !text(config.approvalUrl) ||
    !https(config.approvalUrl) ||
    !text(config.reviewer) ||
    !text(config.model, 100) ||
    !/^[\w.:-]+$/.test(config.model) ||
    !/^[a-f0-9]{64}$/.test(config.digest) ||
    !text(config.modelLicenseEvidence) ||
    !text(config.evaluationEvidence) ||
    !text(config.sharingPurposeApproval) ||
    !text(config.corpusVersion, 100) ||
    !Array.isArray(config.scenarios) ||
    !config.scenarios.length ||
    config.scenarios.some((s) => !['cardiology', 'pulmonology'].includes(s)) ||
    new Set(config.scenarios).size !== config.scenarios.length ||
    !Array.isArray(config.articles) ||
    !config.articles.length ||
    config.articles.length > 12
  )
    throw new Error('Evidence-review activation approval is incomplete.');
  const ids = new Set<string>();
  for (const article of config.articles) {
    if (
      !/^LIT-[A-Z0-9-]{1,40}$/.test(article.id) ||
      ids.has(article.id) ||
      !config.scenarios.includes(article.scenario) ||
      !text(article.title, 300) ||
      !text(article.url) ||
      !https(article.url) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(article.publicationDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(article.reviewedAt) ||
      !text(article.reviewer) ||
      !text(article.license) ||
      !text(article.permissionEvidence) ||
      !text(article.correctionCheck) ||
      !text(article.summary, 1500) ||
      article.sha256 !== hashReview(article.summary)
    )
      throw new Error('Evidence-review corpus approval is incomplete.');
    ids.add(article.id);
  }
  if (config.scenarios.some((s) => !config.articles.some((a) => a.scenario === s)))
    throw new Error('Every enabled scenario requires reviewed literature.');
}
