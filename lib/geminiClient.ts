import "server-only";
1
import crypto from "node:crypto";

export const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

type NormalizedGeminiCallOptions = {
  routeName: string;
  requestId: string;
  model: string;
  prompt: string;
  schema?: string;
  temperature: number;
  maxOutputTokens: number;
  singleFlightParts?: Record<string, unknown>;
};

export type GeminiDebugInfo = {
  requestId: string;
  keyPresent: boolean;
  model: string;
  url: string;
  status: number;
  rawSnippet: string;
  parseError: string | null;
  attempt: number;
  singleFlightKey: string;
};

export type GeminiFailureReason =
  | "missing_key"
  | "network_error"
  | "http_error"
  | "response_parse_error"
  | "empty_text"
  | "model_parse_error"
  | "rate_limited"
  | "service_unavailable";

type GeminiJsonSuccess<T> = {
  ok: true;
  data: T;
  debug: GeminiDebugInfo;
};

export type GeminiFailure = {
  ok: false;
  reason: GeminiFailureReason;
  error: string;
  model: string;
  debug: GeminiDebugInfo;
  status?: number;
  cooldownMs?: number;
};

type LegacyGeminiJsonRequestOptions = {
  routeTag: string;
  requestId?: string;
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
  schema?: string;
  temperature?: number;
  maxOutputTokens?: number;
  singleFlightParts?: Record<string, unknown>;
};

export type GeminiJsonRequestOptions =
  | {
      routeName: string;
      requestId?: string;
      model?: string;
      prompt: string;
      schema?: string;
      temperature?: number;
      maxOutputTokens?: number;
      singleFlightParts?: Record<string, unknown>;
    }
  | LegacyGeminiJsonRequestOptions;

const singleFlight = new Map<string, Promise<GeminiJsonSuccess<unknown> | GeminiFailure>>();

function endpointForModel(model: string): string {
  return `${GEMINI_API_BASE}/${model}:generateContent`;
}

function redactedUrlForModel(model: string): string {
  return `${endpointForModel(model)}?key=[REDACTED]`;
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function parseNonNegativeInt(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}

function maxRetries(): number {
  return parseNonNegativeInt(process.env.GEMINI_MAX_RETRIES) ?? 3;
}

function concurrencyLimit(): number {
  const configured = parsePositiveInt(process.env.GEMINI_MAX_CONCURRENCY);
  if (configured !== null) {
    return configured;
  }
  return process.env.NODE_ENV === "development" ? 2 : 5;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoffMs(attemptIndex: number): number {
  const baseMs = 700;
  const capMs = 30000;
  const expMs = Math.min(capMs, baseMs * 2 ** attemptIndex);
  const jitterMs = Math.floor(Math.random() * Math.max(250, Math.floor(expMs * 0.25)));
  return expMs + jitterMs;
}

function parseRetryAfterDelayMs(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const asSeconds = Number(trimmed);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return Math.round(asSeconds * 1000);
  }

  const asDate = Date.parse(trimmed);
  if (Number.isNaN(asDate)) {
    return null;
  }

  return Math.max(0, asDate - Date.now());
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function truncateRaw(value: string): string {
  return value.length <= 2000 ? value : value.slice(0, 2000);
}

function parseErrorDetails(rawBody: string): { code: string | null; message: string | null } {
  try {
    const parsed = JSON.parse(rawBody) as {
      error?: { code?: string | number; message?: string };
    };
    const code = parsed.error?.code != null ? String(parsed.error.code) : null;
    const message = parsed.error?.message ?? null;
    return { code, message };
  } catch {
    return { code: null, message: null };
  }
}

function stripCommonJsonWrappers(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }
  return trimmed;
}

function parseJsonFromText(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  let candidate = stripCommonJsonWrappers(text);
  let lastError: string | null = null;

  for (let depth = 0; depth < 3; depth += 1) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (typeof parsed === "string") {
        candidate = stripCommonJsonWrappers(parsed);
        continue;
      }
      return { ok: true, value: parsed };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown JSON parse error";
      break;
    }
  }

  return { ok: false, error: lastError ?? "Unknown JSON parse error" };
}

function extractCandidateText(responsePayload: unknown): string {
  if (!responsePayload || typeof responsePayload !== "object") {
    return "";
  }

  const candidates = (responsePayload as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates)) {
    return "";
  }

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const parts = (candidate as { content?: { parts?: unknown[] } }).content?.parts;
    if (!Array.isArray(parts)) {
      continue;
    }

    const collected = parts
      .map((part) => (part && typeof part === "object" ? (part as { text?: unknown }).text : undefined))
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0)
      .join("\n");

    if (collected.length > 0) {
      return collected;
    }
  }

  return "";
}

function normalizeRequestId(requestId: string | undefined): string {
  const trimmed = requestId?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return crypto.randomUUID();
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
    .join(",")}}`;
}

function hashStable(value: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex").slice(0, 20);
}

function buildPrompt(systemPrompt: string | undefined, userPrompt: string): string {
  const userText = userPrompt.trim();
  const systemText = systemPrompt?.trim();
  if (!systemText) {
    return userText;
  }
  return `System Prompt:\n${systemText}\n\nUser Input:\n${userText}`;
}

function normalizeOptions(options: GeminiJsonRequestOptions): NormalizedGeminiCallOptions {
  if ("routeName" in options) {
    return {
      routeName: options.routeName,
      requestId: normalizeRequestId(options.requestId),
      model: options.model?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
      prompt: options.prompt.trim(),
      schema: options.schema?.trim() || undefined,
      temperature: typeof options.temperature === "number" ? options.temperature : 0.7,
      maxOutputTokens: typeof options.maxOutputTokens === "number" ? options.maxOutputTokens : 1024,
      singleFlightParts: options.singleFlightParts,
    };
  }

  return {
    routeName: options.routeTag,
    requestId: normalizeRequestId(options.requestId),
    model: options.model?.trim() || process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
    prompt: buildPrompt(options.systemPrompt, options.userPrompt),
    schema: options.schema?.trim() || undefined,
    temperature: typeof options.temperature === "number" ? options.temperature : 0.7,
    maxOutputTokens: typeof options.maxOutputTokens === "number" ? options.maxOutputTokens : 1024,
    singleFlightParts: options.singleFlightParts,
  };
}

function buildSingleFlightKey(options: NormalizedGeminiCallOptions): string {
  const payloadHash = hashStable({
    routeName: options.routeName,
    model: options.model,
    prompt: options.prompt,
    schema: options.schema ?? null,
    temperature: options.temperature,
    maxOutputTokens: options.maxOutputTokens,
  });

  const contextHash = hashStable(options.singleFlightParts ?? {});
  return `${options.routeName}:${payloadHash}:${contextHash}`;
}

function initialDebug(options: {
  apiKey: string | undefined;
  model: string;
  requestId: string;
  singleFlightKey: string;
}): GeminiDebugInfo {
  return {
    requestId: options.requestId,
    keyPresent: Boolean(options.apiKey),
    model: options.model,
    url: redactedUrlForModel(options.model),
    status: 0,
    rawSnippet: "",
    parseError: null,
    attempt: 0,
    singleFlightKey: options.singleFlightKey,
  };
}

class Semaphore {
  private readonly max: number;

  private active = 0;

  private queue: Array<() => void> = [];

  constructor(max: number) {
    this.max = Math.max(1, max);
  }

  async acquire(): Promise<() => void> {
    if (this.active < this.max) {
      this.active += 1;
      return () => this.release();
    }

    await new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });

    this.active += 1;
    return () => this.release();
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    if (next) {
      next();
    }
  }
}

const geminiSemaphore = new Semaphore(concurrencyLimit());

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function executeGeminiJsonRequest<T>(
  options: NormalizedGeminiCallOptions,
  singleFlightKey: string,
): Promise<GeminiJsonSuccess<T> | GeminiFailure> {
  const apiKey = process.env.GEMINI_API_KEY;
  const debug = initialDebug({
    apiKey,
    model: options.model,
    requestId: options.requestId,
    singleFlightKey,
  });

  if (!apiKey) {
    const error = "GEMINI_API_KEY is missing.";
    console.warn(`[${options.routeName}] Gemini fallback requestId=${options.requestId} reason=missing_key message="${error}"`);
    return {
      ok: false,
      reason: "missing_key",
      error,
      model: options.model,
      debug,
    };
  }

  const url = `${endpointForModel(options.model)}?key=${encodeURIComponent(apiKey)}`;
  const retries = maxRetries();
  const totalAttempts = retries + 1;

  const prompt = options.schema
    ? `${options.prompt}\n\nReturn output that matches this schema exactly:\n${options.schema}`
    : options.prompt;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    debug.attempt = attempt;

    console.info(
      `[${options.routeName}] Gemini request requestId=${options.requestId} singleFlightKey=${singleFlightKey} attempt=${attempt}/${totalAttempts} model=${options.model} url=${debug.url}`,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature,
            maxOutputTokens: options.maxOutputTokens,
            responseMimeType: "application/json",
          },
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network request failed.";
      debug.parseError = message;
      const canRetry = attempt < totalAttempts;
      if (canRetry) {
        const delayMs = computeBackoffMs(attempt - 1);
        console.warn(
          `[${options.routeName}] Gemini transient network error requestId=${options.requestId} attempt=${attempt}/${totalAttempts} delayMs=${delayMs} message="${message}"`,
        );
        await sleep(delayMs);
        continue;
      }

      console.error(`[${options.routeName}] Gemini fallback requestId=${options.requestId} reason=network_error message="${message}"`);
      return {
        ok: false,
        reason: "network_error",
        error: message,
        model: options.model,
        debug,
      };
    }

    debug.status = response.status;

    const rawBody = await response.text();
    debug.rawSnippet = truncateRaw(rawBody);

    if (!response.ok) {
      const details = parseErrorDetails(rawBody);
      const retryAfterMs = parseRetryAfterDelayMs(response.headers.get("retry-after"));
      const detailSuffix = details.code || details.message
        ? ` code=${details.code ?? "n/a"} message="${details.message ?? "n/a"}"`
        : "";

      const transient = isTransientStatus(response.status);
      const canRetry = transient && attempt < totalAttempts;
      if (canRetry) {
        const delayMs = clamp(retryAfterMs ?? computeBackoffMs(attempt - 1), 500, 45000);
        console.warn(
          `[${options.routeName}] Gemini retry requestId=${options.requestId} status=${response.status} attempt=${attempt + 1}/${totalAttempts} delayMs=${delayMs}${detailSuffix}`,
        );
        await sleep(delayMs);
        continue;
      }

      console.error(
        `[${options.routeName}] Gemini fallback requestId=${options.requestId} reason=http_error status=${response.status} statusText=${response.statusText}${detailSuffix} raw="${debug.rawSnippet}"`,
      );

      if (response.status === 429 || response.status === 503) {
        const cooldownMs = clamp(retryAfterMs ?? computeBackoffMs(attempt - 1), 1000, 45000);
        return {
          ok: false,
          reason: response.status === 429 ? "rate_limited" : "service_unavailable",
          error: details.message ?? `Gemini HTTP ${response.status} ${response.statusText}`,
          model: options.model,
          status: response.status,
          cooldownMs,
          debug,
        };
      }

      return {
        ok: false,
        reason: "http_error",
        error: details.message ?? `Gemini HTTP ${response.status} ${response.statusText}`,
        model: options.model,
        status: response.status,
        debug,
      };
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody) as unknown;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to parse Gemini HTTP body as JSON.";
      debug.parseError = message;
      console.error(
        `[${options.routeName}] Gemini fallback requestId=${options.requestId} reason=response_parse_error parseError="${message}" raw="${debug.rawSnippet}"`,
      );
      return {
        ok: false,
        reason: "response_parse_error",
        error: message,
        model: options.model,
        debug,
      };
    }

    const candidateText = extractCandidateText(parsedBody);
    if (!candidateText) {
      console.error(
        `[${options.routeName}] Gemini fallback requestId=${options.requestId} reason=empty_text raw="${debug.rawSnippet}"`,
      );
      return {
        ok: false,
        reason: "empty_text",
        error: "Gemini returned an empty candidate text.",
        model: options.model,
        debug,
      };
    }

    const parsed = parseJsonFromText(candidateText);
    if (!parsed.ok) {
      debug.parseError = parsed.error;
      debug.rawSnippet = truncateRaw(candidateText);
      console.error(
        `[${options.routeName}] Gemini fallback requestId=${options.requestId} reason=model_parse_error parseError="${parsed.error}" raw="${debug.rawSnippet}"`,
      );
      return {
        ok: false,
        reason: "model_parse_error",
        error: parsed.error,
        model: options.model,
        debug,
      };
    }

    return {
      ok: true,
      data: parsed.value as T,
      debug,
    };
  }

  return {
    ok: false,
    reason: "service_unavailable",
    error: "Gemini retries exhausted.",
    model: options.model,
    cooldownMs: 5000,
    debug,
  };
}

export async function callGeminiJson<T>(
  rawOptions: GeminiJsonRequestOptions,
): Promise<GeminiJsonSuccess<T> | GeminiFailure> {
  const options = normalizeOptions(rawOptions);
  const singleFlightKey = buildSingleFlightKey(options);

  const inFlight = singleFlight.get(singleFlightKey);
  if (inFlight) {
    console.info(
      `[${options.routeName}] Gemini single-flight hit requestId=${options.requestId} singleFlightKey=${singleFlightKey}`,
    );
    return inFlight as Promise<GeminiJsonSuccess<T> | GeminiFailure>;
  }

  const work = (async () => {
    const release = await geminiSemaphore.acquire();
    try {
      return await executeGeminiJsonRequest<T>(options, singleFlightKey);
    } finally {
      release();
    }
  })();

  singleFlight.set(singleFlightKey, work as Promise<GeminiJsonSuccess<unknown> | GeminiFailure>);
  try {
    return await work;
  } finally {
    singleFlight.delete(singleFlightKey);
  }
}

export function isDiagnosticRequest(request: Request): boolean {
  const headerValue = request.headers.get("x-diagnostic");
  if (headerValue === "1") {
    return true;
  }
  const url = new URL(request.url);
  return url.searchParams.get("diagnostic") === "1";
}

export function requestIdFromRequest(request: Request): string {
  return normalizeRequestId(request.headers.get("x-request-id") ?? undefined);
}

export function defaultGeminiDebugInfo(requestId?: string): GeminiDebugInfo {
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  return {
    requestId: normalizeRequestId(requestId),
    keyPresent: Boolean(process.env.GEMINI_API_KEY),
    model,
    url: redactedUrlForModel(model),
    status: 0,
    rawSnippet: "",
    parseError: null,
    attempt: 0,
    singleFlightKey: "",
  };
}

export function isGeminiRateLimitFailure(failure: GeminiFailure): boolean {
  return failure.reason === "rate_limited" || failure.reason === "service_unavailable";
}

export type GeminiRateLimitPayload = {
  ok: false;
  error: "RATE_LIMIT";
  message: string;
  cooldownMs: number;
  requestId: string;
};

export function buildGeminiRateLimitPayload(failure: GeminiFailure): GeminiRateLimitPayload {
  return {
    ok: false,
    error: "RATE_LIMIT",
    message:
      failure.reason === "rate_limited"
        ? "Gemini rate limit reached. Please wait before trying again."
        : "Gemini is temporarily overloaded. Please wait before trying again.",
    cooldownMs: clamp(Math.round(failure.cooldownMs ?? 5000), 1000, 60000),
    requestId: failure.debug.requestId,
  };
}
