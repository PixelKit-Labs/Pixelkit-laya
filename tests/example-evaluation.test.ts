import { describe, expect, it } from 'vitest';
import { useCases } from '../examples/pixel-verify/cases';
import { evaluateCase, evaluateSuite, summarize, type Predict } from '../examples/pixel-verify/evaluation';

const support = useCases[0];
const answer = (choice: string) => ({ answers: { decision: { type: 'choice', choice,
  probabilities: { billing: 0.7, technical: 0.1, sales: 0.1, review: 0.1 } } } });

describe('curated example evaluation', () => {
  it('keeps wrong answers and runtime errors in the denominator and continues after errors', async () => {
    let call = 0;
    const predict: Predict = async () => {
      call += 1;
      if (call === 2) throw new Error('native inference failed');
      return answer('billing');
    };
    const rows = await evaluateSuite(predict, [{ ...support, examples: support.examples.slice(0, 3) }]);
    expect(rows.map((row) => row.outcome)).toEqual(['correct', 'error', 'incorrect']);
    expect(rows[1].error).toContain('native inference failed');
    expect(summarize(rows)).toMatchObject({ total: 3, correct: 1, incorrect: 1, errors: 1, accuracy: 1 / 3 });
  });

  it.each([
    { answers: {} },
    { answers: { decision: { type: 'choice', choice: 'invented', probabilities: {} } } },
    { answers: { decision: { type: 'choice', choice: 'billing', probabilities: { billing: NaN, technical: 0, sales: 0, review: 0 } } } },
    { answers: { decision: { type: 'choice', choice: 'billing', probabilities: { billing: 0.2, technical: 0.1, sales: 0.1, review: 0.1 } } } },
  ])('rejects malformed outputs instead of recording a successful decision', async (output) => {
    const result = await evaluateCase(async () => output, support, support.examples[0]);
    expect(result.outcome).toBe('error');
    expect(result.actual).toBeNull();
  });

  it('sends only input and question definitions to inference, never the expected label or explanation', async () => {
    const received: unknown[] = [];
    const predict: Predict = async (...args) => { received.push(args); return answer('billing'); };
    await evaluateCase(predict, support, support.examples[0]);
    expect(received).toEqual([[support.examples[0].input, { decision: {
      type: 'choice', instructions: support.instructions, criteria: support.criteria,
    } }]]);
  });

  it('uses observed durations and does not invent latency for an empty or failed run', async () => {
    const times = [100, 137];
    const row = await evaluateCase(async () => answer('billing'), support, support.examples[0], () => times.shift()!);
    expect(row.elapsedMs).toBe(37);
    expect(summarize([])).toMatchObject({ accuracy: null, medianMs: null, p95Ms: null });
    expect(summarize([{ ...row, outcome: 'error' }])).toMatchObject({ accuracy: 0, medianMs: null, p95Ms: null });
    expect(summarize([10, 100, 20, 30].map((elapsedMs) => ({ ...row, elapsedMs })))).toMatchObject({ medianMs: 20, p95Ms: 100 });
  });

  it('has distinct cases and valid predeclared labels for every use case', () => {
    const keys = useCases.flatMap((group) => group.examples.map((example) => `${group.id}/${example.id}`));
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toHaveLength(24);
    expect(useCases.flatMap((group) => group.examples).filter((example) => example.kind === 'challenge')).toHaveLength(6);
    for (const group of useCases) for (const example of group.examples) {
      expect(Object.keys(group.criteria)).toContain(example.expected);
      expect(example.input.trim().length).toBeGreaterThan(0);
      expect(example.why.trim().length).toBeGreaterThan(0);
    }
  });
});
