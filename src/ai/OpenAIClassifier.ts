import { postJson } from './http';
import { CLASSIFIER_SYSTEM_PROMPT, classifierUserPrompt, parseLabel, type DreamClassifier, type DreamLabel } from './types';

interface ChatCompletion {
  choices?: { message?: { content?: string | null } }[];
}

export interface OpenAIOptions {
  apiKey: string;
  model: string;
  baseUrl: string;
}

/** Works with OpenAI and any OpenAI-compatible endpoint (Azure proxy, LM Studio, vLLM, ...). */
export class OpenAIClassifier implements DreamClassifier {
  readonly isRealModel = true;
  readonly name: string;

  constructor(private readonly opts: OpenAIOptions) {
    this.name = `OpenAI (${opts.model})`;
  }

  async classify(dreamName: string): Promise<DreamLabel> {
    // gpt-5 / o-series models only accept the default temperature
    const supportsTemperature = !/^(gpt-5|o\d)/i.test(this.opts.model);
    const data = await postJson<ChatCompletion>(
      `${this.opts.baseUrl}/chat/completions`,
      {
        model: this.opts.model,
        messages: [
          { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
          { role: 'user', content: classifierUserPrompt(dreamName) },
        ],
        ...(supportsTemperature ? { temperature: 0 } : {}),
      },
      { headers: { Authorization: `Bearer ${this.opts.apiKey}` } },
    );
    const content = data.choices?.[0]?.message?.content ?? '';
    return parseLabel(content);
  }
}
