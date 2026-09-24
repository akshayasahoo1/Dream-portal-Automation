export type DreamLabel = 'Good' | 'Bad';

export interface DreamClassifier {
  /** Human-readable provider description used in logs and reports. */
  readonly name: string;
  /** True only for real ML/LLM providers (false for the offline keyword fallback). */
  readonly isRealModel: boolean;
  classify(dreamName: string): Promise<DreamLabel>;
}

export const CLASSIFIER_SYSTEM_PROMPT =
  'You classify the NAME of a dream as either "Good" or "Bad". ' +
  '"Good" = pleasant, joyful, peaceful, exciting or otherwise positive. ' +
  '"Bad" = frightening, stressful, sad, threatening or otherwise negative (nightmare-like). ' +
  'Reply with exactly one word: Good or Bad. No punctuation, no explanation.';

export function classifierUserPrompt(dreamName: string): string {
  return `Dream name: "${dreamName}"\nClassification:`;
}

/** Extracts "Good"/"Bad" from a model reply such as "Bad", "bad.", or "**Good**". */
export function parseLabel(reply: string): DreamLabel {
  const m = reply.match(/\b(good|bad)\b/i);
  if (!m) throw new Error(`Model reply is not a Good/Bad label: "${reply.slice(0, 120)}"`);
  return m[1].toLowerCase() === 'good' ? 'Good' : 'Bad';
}
