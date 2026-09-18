import { performance } from 'node:perf_hooks';
import { APPROVED_EVALUATION_CONFIG, validateReviewConfig } from '../server/review-config.js';
import { localReviewInference } from '../server/review-inference.js';
import { parseReviewSelection, type ReviewSource } from '../shared/review.js';
import { evaluationFixtures } from '../tests/review-fixtures.js';

// Deliberately no patient-store import, persisted output, free-form prompt logging or download.
async function main() {
  if (process.argv.slice(2).join(' ') !== '--run-local')
    throw new Error('Pass --run-local explicitly after approval. No inference was started.');
  const config = APPROVED_EVALUATION_CONFIG;
  if (!config)
    throw new Error('Model, corpus and reviewer approval are absent. No inference was started.');
  validateReviewConfig(config);
  const literature: ReviewSource[] = config.articles
    .filter((article) => article.scenario === config.scenarios[0])
    .map((article) => ({
      id: article.id,
      kind: 'literature',
      title: article.title,
      text: article.summary,
    }));
  let failed = false;
  for (const fixture of evaluationFixtures) {
    const start = performance.now();
    try {
      const result = await localReviewInference(
        config,
        [...fixture.sources, ...literature],
        AbortSignal.timeout(60000),
      );
      parseReviewSelection(
        result,
        literature.map((source) => source.id),
      );
      console.log(
        JSON.stringify({
          fixture: fixture.id,
          schemaValid: true,
          elapsedMs: Math.round(performance.now() - start),
        }),
      );
    } catch {
      failed = true;
      console.log(
        JSON.stringify({
          fixture: fixture.id,
          schemaValid: false,
          elapsedMs: Math.round(performance.now() - start),
        }),
      );
    }
  }
  console.log(
    'Schema/timing smoke test only. Applicability, resource use, cancellation and qualified review remain separate gates.',
  );
  if (failed) process.exitCode = 1;
}
void main().catch((error: unknown) => {
  // Only local setup errors, never the inference error body or source content.
  console.error(error instanceof Error ? error.message : 'Evaluation unavailable.');
  process.exitCode = 1;
});
