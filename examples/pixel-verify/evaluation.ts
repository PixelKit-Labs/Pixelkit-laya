import { type Example, type UseCase } from './cases';

export type Predict = (input: string, questions: Record<string, {
  type: string; instructions: string; criteria: Record<string, string>;
}>) => Promise<{ answers: Record<string, unknown> }>;
export type CaseResult = Example & {
  useCase: string; actual: string | null; probability: number | null;
  probabilities: Record<string, number> | null; elapsedMs: number;
  outcome: 'correct' | 'incorrect' | 'error'; error?: string;
};

export async function evaluateCase(predict: Predict, useCase: UseCase, example: Example, now = () => performance.now()): Promise<CaseResult> {
  const start = now();
  const base = { ...example, useCase: useCase.id };
  try {
    const result = await predict(example.input, { decision: {
      type: 'choice', instructions: useCase.instructions, criteria: useCase.criteria,
    } });
    const answer = result.answers.decision as { type?: string; choice?: string; probabilities?: Record<string, number> } | undefined;
    const labels = Object.keys(useCase.criteria);
    const probabilities = answer?.probabilities;
    if (answer?.type !== 'choice' || !labels.includes(answer.choice ?? '') || !probabilities ||
      Object.keys(probabilities).length !== labels.length ||
      labels.some((key) => !Number.isFinite(probabilities[key]) || probabilities[key] < 0 || probabilities[key] > 1) ||
      Math.abs(labels.reduce((sum, key) => sum + probabilities[key], 0) - 1) > 0.005) {
      throw new Error('Model returned an invalid choice or probability distribution.');
    }
    const actual = answer.choice!;
    return { ...base, actual, probabilities, probability: probabilities[actual],
      elapsedMs: Math.round(now() - start), outcome: actual === example.expected ? 'correct' : 'incorrect' };
  } catch (error) {
    return { ...base, actual: null, probabilities: null, probability: null,
      elapsedMs: Math.round(now() - start), outcome: 'error', error: String(error) };
  }
}

export function summarize(rows: CaseResult[]) {
  const correct = rows.filter((row) => row.outcome === 'correct').length;
  const errors = rows.filter((row) => row.outcome === 'error').length;
  const timings = rows.filter((row) => row.outcome !== 'error').map((row) => row.elapsedMs).sort((a, b) => a - b);
  const percentile = (p: number) => timings.length ? timings[Math.ceil(p * timings.length) - 1] : null;
  return { total: rows.length, correct, incorrect: rows.length - correct - errors, errors,
    accuracy: rows.length ? correct / rows.length : null, medianMs: percentile(0.5), p95Ms: percentile(0.95) };
}

export async function evaluateSuite(predict: Predict, cases: UseCase[], onResult: (row: CaseResult) => void = () => {}) {
  const rows: CaseResult[] = [];
  for (const useCase of cases) {
    for (const example of useCase.examples) {
      const row = await evaluateCase(predict, useCase, example);
      rows.push(row);
      onResult(row);
    }
  }
  return rows;
}
