import { postJson } from './http';
import { CLASSIFIER_SYSTEM_PROMPT, classifierUserPrompt, parseLabel, type DreamClassifier, type DreamLabel } from './types';

interface OllamaChat {
  message?: { content?: string };
}

/** Open-source option: any model served locally by Ollama (llama3.1, mistral, gemma, ...). */
export class OllamaClassifier implements DreamClassifier {
  readonly isRealModel = true;
  readonly name: string;

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
  ) {
    this.name = `Ollama (${model})`;
  }

  async classify(dreamName: string): Promise<DreamLabel> {
    const data = await postJson<OllamaChat>(
      `${this.baseUrl}/api/chat`,
      {
        model: this.model,
        stream: false,
        options: { temperature: 0 },
        messages: [
          { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
          { role: 'user', content: classifierUserPrompt(dreamName) },
        ],
      },
      { timeoutMs: 120_000, retries: 1 },
    );
    return parseLabel(data.message?.content ?? '');
  }
}
