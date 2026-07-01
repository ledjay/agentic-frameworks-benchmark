import type { MastraDBMessage } from "@mastra/core/agent/message-list";
import type {
  ProcessInputArgs,
  ProcessInputResult,
  ProcessOutputResultArgs,
  Processor,
  ProcessorViolation,
} from "@mastra/core/processors";

const MISTRAL_MODERATION_ENDPOINT = "https://api.mistral.ai/v1/moderations";

export type MistralModerationCategory =
  | "sexual"
  | "hate_and_discrimination"
  | "violence_and_threats"
  | "dangerous_and_criminal_content"
  | "selfharm"
  | "self_harm"
  | "health"
  | "financial"
  | "law"
  | "pii";

export type MistralModerationStrategy = "block" | "warn" | "filter";
export type MistralModerationFailureStrategy = "block" | "warn";

export interface MistralModerationResult {
  categories?: Partial<Record<MistralModerationCategory, boolean>>;
  category_scores?: Partial<Record<MistralModerationCategory, number>>;
}

export interface MistralModerationResponse {
  id?: string;
  model?: string;
  results?: MistralModerationResult[];
}

export interface MistralModerationViolationDetail {
  model: string;
  categories: MistralModerationCategory[];
  threshold: number;
  result: MistralModerationResult;
}

export interface MistralModerationProcessorOptions {
  apiKey?: string;
  model?: string;
  categories?: MistralModerationCategory[];
  threshold?: number;
  strategy?: MistralModerationStrategy;
  failureStrategy?: MistralModerationFailureStrategy;
  lastMessageOnly?: boolean;
  endpoint?: string;
  timeoutMs?: number;
  retryAttempts?: number;
  maxInputLength?: number;
  onViolation?: (violation: ProcessorViolation<unknown>) => void | Promise<void>;
}

const DEFAULT_CATEGORIES: MistralModerationCategory[] = [
  "sexual",
  "hate_and_discrimination",
  "violence_and_threats",
  "dangerous_and_criminal_content",
  "selfharm",
  "self_harm",
];

function extractTextFromContent(content: unknown): string {
  if (!content) return "";
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    return content.map(extractTextFromContent).filter(Boolean).join("\n");
  }

  if (typeof content !== "object") return "";

  const candidate = content as {
    text?: unknown;
    content?: unknown;
    parts?: unknown;
  };

  if (typeof candidate.text === "string") return candidate.text;
  if (candidate.parts) return extractTextFromContent(candidate.parts);
  if (candidate.content) return extractTextFromContent(candidate.content);

  return "";
}

function extractMessageText(message: MastraDBMessage): string {
  return extractTextFromContent(message.content).trim();
}

function formatFlaggedCategories(
  result: MistralModerationResult,
  categories: MistralModerationCategory[],
  threshold: number,
): string {
  const flagged = categories
    .filter((category) => {
      const isFlagged = result.categories?.[category] === true;
      const score = result.category_scores?.[category] ?? 0;
      return isFlagged || score >= threshold;
    })
    .map((category) => `${category}:${(result.category_scores?.[category] ?? 0).toFixed(3)}`);

  return flagged.join(", ") || "unknown";
}

export class MistralModerationProcessor
  implements Processor<"mistral-moderation", MistralModerationViolationDetail>
{
  readonly id = "mistral-moderation" as const;
  readonly name = "Mistral Moderation";
  readonly description = "Moderates text through Mistral's dedicated moderation endpoint.";

  private readonly apiKey?: string;
  private readonly model: string;
  private readonly categories: MistralModerationCategory[];
  private readonly threshold: number;
  private readonly strategy: MistralModerationStrategy;
  private readonly failureStrategy: MistralModerationFailureStrategy;
  private readonly lastMessageOnly: boolean;
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly retryAttempts: number;
  private readonly maxInputLength: number;
  readonly onViolation?: (violation: ProcessorViolation<unknown>) => void | Promise<void>;

  constructor(options: MistralModerationProcessorOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.MISTRAL_API_KEY;
    this.model = options.model ?? "mistral-moderation-latest";
    this.categories = options.categories ?? DEFAULT_CATEGORIES;
    this.threshold = options.threshold ?? Number(process.env.MODERATION_SCORE_THRESHOLD ?? "0.35");
    this.strategy = options.strategy ?? "block";
    this.failureStrategy = options.failureStrategy ?? "block";
    this.lastMessageOnly = options.lastMessageOnly ?? true;
    this.endpoint = options.endpoint ?? MISTRAL_MODERATION_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? Number(process.env.MODERATION_TIMEOUT_MS ?? "10000");
    this.retryAttempts = options.retryAttempts ?? Number(process.env.MODERATION_RETRY_ATTEMPTS ?? "2");
    this.maxInputLength = options.maxInputLength ?? Number(process.env.MAX_INPUT_LENGTH ?? "6000");
    this.onViolation = options.onViolation;
  }

  async processInput(
    args: ProcessInputArgs<MistralModerationViolationDetail>,
  ): Promise<ProcessInputResult> {
    return this.processMessages(args.messages, args.abort, "input");
  }

  async processOutputResult(
    args: ProcessOutputResultArgs<MistralModerationViolationDetail>,
  ): Promise<MastraDBMessage[]> {
    return this.processMessages(args.messages, args.abort, "output");
  }

  private async processMessages(
    messages: MastraDBMessage[],
    abort: (reason?: string) => never,
    phase: "input" | "output",
  ): Promise<MastraDBMessage[]> {
    if (!this.apiKey) {
      return this.handleFailure(new Error("MISTRAL_API_KEY is missing"), abort, messages);
    }

    const candidateMessages = this.lastMessageOnly ? messages.slice(-1) : messages;
    const moderationInputs = candidateMessages
      .map((message, candidateIndex) => ({
        candidateIndex,
        message,
        text: extractMessageText(message),
      }))
      .filter((candidate) => candidate.text.length > 0);

    if (moderationInputs.length === 0) return messages;

    const tooLongInput = moderationInputs.find((input) => input.text.length > this.maxInputLength);
    if (tooLongInput) {
      abort(`Mistral moderation rejected ${phase} content: input too long (${tooLongInput.text.length} > ${this.maxInputLength})`);
    }

    let response: MistralModerationResponse;
    try {
      response = await this.moderateWithRetries(moderationInputs.map((input) => input.text));
    } catch (error) {
      return this.handleFailure(error, abort, messages);
    }

    const flaggedCandidateIndexes = new Set<number>();

    for (const [resultIndex, result] of (response.results ?? []).entries()) {
      if (!this.isFlagged(result)) continue;

      const moderationInput = moderationInputs[resultIndex];
      if (!moderationInput) continue;

      flaggedCandidateIndexes.add(moderationInput.candidateIndex);

      const detail: MistralModerationViolationDetail = {
        model: response.model ?? this.model,
        categories: this.categories,
        threshold: this.threshold,
        result,
      };
      const flaggedCategories = formatFlaggedCategories(result, this.categories, this.threshold);
      const violation: ProcessorViolation<MistralModerationViolationDetail> = {
        processorId: this.id,
        message: `Mistral moderation flagged ${phase} content: ${flaggedCategories}`,
        detail,
      };

      await this.reportViolation(violation);

      if (this.strategy === "block") {
        abort(violation.message);
      }

      if (this.strategy === "warn") {
        console.warn(`[MistralModerationProcessor] ${violation.message}`);
      }
    }

    if (this.strategy !== "filter" || flaggedCandidateIndexes.size === 0) return messages;

    const firstCandidateIndex = this.lastMessageOnly ? messages.length - candidateMessages.length : 0;
    return messages.filter((_, messageIndex) => {
      const candidateIndex = messageIndex - firstCandidateIndex;
      return !flaggedCandidateIndexes.has(candidateIndex);
    });
  }

  private async moderateWithRetries(inputs: string[]): Promise<MistralModerationResponse> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt += 1) {
      try {
        return await this.moderate(inputs);
      } catch (error) {
        lastError = error;
        if (!this.shouldRetry(error) || attempt === this.retryAttempts) break;
      }
    }

    throw lastError;
  }

  private async moderate(inputs: string[]): Promise<MistralModerationResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: inputs,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        const error = new Error(`Mistral moderation failed (${response.status}): ${body}`);
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }

      return (await response.json()) as MistralModerationResponse;
    } finally {
      clearTimeout(timeout);
    }
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    const status = (error as { status?: number } | undefined)?.status;
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
  }

  private isFlagged(result: MistralModerationResult): boolean {
    return this.categories.some((category) => {
      const isFlagged = result.categories?.[category] === true;
      const score = result.category_scores?.[category] ?? 0;
      return isFlagged || score >= this.threshold;
    });
  }

  private async reportViolation(violation: ProcessorViolation<MistralModerationViolationDetail>) {
    try {
      await this.onViolation?.(violation);
    } catch {
      // Processor violation callbacks must not break the moderation flow.
    }
  }

  private handleFailure(
    error: unknown,
    abort: (reason?: string) => never,
    messages: MastraDBMessage[],
  ): MastraDBMessage[] {
    const message = error instanceof Error ? error.message : String(error);

    if (this.failureStrategy === "block") {
      abort(`Mistral moderation unavailable: ${message}`);
    }

    console.warn(`[MistralModerationProcessor] Moderation failed, allowing content: ${message}`);
    return messages;
  }
}
