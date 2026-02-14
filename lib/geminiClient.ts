import "server-only";

export const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-2.0-flash";

function endpointForModel(model: string): string {
  return `${GEMINI_API_BASE}/${model}:generateContent`;
}

function redactedUrlForModel(model: string): string {
  return `${endpointForModel(model)}?key=[REDACTED]`;
}

export type GeminiDebugInfo = {
  keyPresent: boolean;
  url: string;
  status: number;
  rawSnippet: string;
  parseError: string | null;
};

type GeminiFailureReason =
  | "missing_key"
  | "network_error"
  | "http_error"
  | "response_parse_error"
  | "empty_text"
  | "model_parse_error";

type GeminiTextSuccess = {
  ok: true;
  text: string;
  model: string;
  debug: GeminiDebugInfo;
};

type GeminiFailure = {
  ok: false;
  reason: GeminiFailureReason;
  error: string;
  model: string;
  debug: GeminiDebugInfo;
};

type GeminiJsonSuccess<T> = {
  ok: true;
  data: T;
  debug: GeminiDebugInfo;
};

type GeminiRequestOptions = {
  routeTag: string;
  systemPrompt?: string;
  userPrompt: string;
  temperature?: number;
  maxOutputTokens?: number;
};

type GeminiJsonRequestOptions = GeminiRequestOptions & {
  maxParseAttempts?: number;
};

function modelCandidates(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim();
  const candidates = [
    configured,
    DEFAULT_GEMINI_MODEL,
    "gemini-2.5-pro",
    "gemini-pro-latest",
  ].filter((value): value is string => Boolean(value && value.length > 0));

  return [...new Set(candidates)];
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

function buildPrompt(systemPrompt: string | undefined, userPrompt: string): string {
  const userText = userPrompt.trim();
  const systemText = systemPrompt?.trim();
  if (!systemText) {
    return userText;
  }
  return `System Prompt:\n${systemText}\n\nUser Input:\n${userText}`;
}

function initialDebug(apiKey: string | undefined, model: string): GeminiDebugInfo {
  return {
    keyPresent: Boolean(apiKey),
    url: redactedUrlForModel(model),
    status: 0,
    rawSnippet: "",
    parseError: null,
  };
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

async function callGeminiTextOnce(options: GeminiRequestOptions, model: string): Promise<GeminiTextSuccess | GeminiFailure> {
  const apiKey = process.env.GEMINI_API_KEY;
  const debug = initialDebug(apiKey, model);
  const prompt = buildPrompt(options.systemPrompt, options.userPrompt);

  console.info(`[${options.routeTag}] Gemini request keyPresent=${debug.keyPresent} url=${debug.url}`);

  if (!apiKey) {
    const error = "GEMINI_API_KEY is missing.";
    console.warn(`[${options.routeTag}] Gemini fallback reason=missing_key message="${error}"`);
    return {
      ok: false,
      reason: "missing_key",
      error,
      model,
      debug,
    };
  }

  const url = `${endpointForModel(model)}?key=${encodeURIComponent(apiKey)}`;

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
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxOutputTokens ?? 1024,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed.";
    debug.parseError = message;
    console.error(`[${options.routeTag}] Gemini fallback reason=network_error message="${message}"`);
    return {
      ok: false,
      reason: "network_error",
      error: message,
      model,
      debug,
    };
  }

  debug.status = response.status;
  console.info(`[${options.routeTag}] Gemini response status=${response.status} statusText=${response.statusText}`);

  const rawBody = await response.text();
  debug.rawSnippet = truncateRaw(rawBody);

  if (!response.ok) {
    const details = parseErrorDetails(rawBody);
    const detailSuffix = details.code || details.message ? ` code=${details.code ?? "n/a"} message="${details.message ?? "n/a"}"` : "";
    console.error(
      `[${options.routeTag}] Gemini fallback reason=http_error status=${response.status} statusText=${response.statusText}${detailSuffix} raw="${debug.rawSnippet}"`,
    );
    return {
      ok: false,
      reason: "http_error",
      error: details.message ?? `Gemini HTTP ${response.status} ${response.statusText}`,
      model,
      debug,
    };
  }

  let data: unknown;
  try {
    data = JSON.parse(rawBody) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse Gemini HTTP body as JSON.";
    debug.parseError = message;
    console.error(
      `[${options.routeTag}] Gemini fallback reason=response_parse_error status=${response.status} parseError="${message}" raw="${debug.rawSnippet}"`,
    );
    return {
      ok: false,
      reason: "response_parse_error",
      error: message,
      model,
      debug,
    };
  }

  const candidateText = (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates?.[0]?.content
    ?.parts?.[0]?.text;
  const text = typeof candidateText === "string" ? candidateText.trim() : "";

  if (!text) {
    console.error(
      `[${options.routeTag}] Gemini fallback reason=empty_text status=${response.status} raw="${debug.rawSnippet}"`,
    );
    return {
      ok: false,
      reason: "empty_text",
      error: "Gemini returned an empty candidate text.",
      model,
      debug,
    };
  }

  return {
    ok: true,
    text,
    model,
    debug,
  };
}

function shouldRetryWithNextModel(failure: GeminiFailure): boolean {
  if (failure.reason !== "http_error") {
    return false;
  }
  if (failure.debug.status !== 404) {
    return false;
  }
  return /is not found for API version|not supported for generateContent/i.test(failure.error);
}

export async function callGeminiJson<T>(
  options: GeminiJsonRequestOptions,
): Promise<GeminiJsonSuccess<T> | GeminiFailure> {
  const models = modelCandidates();
  let modelFailure: GeminiFailure | null = null;
  let textResult: GeminiTextSuccess | null = null;

  for (const model of models) {
    const callResult = await callGeminiTextOnce(options, model);
    if (callResult.ok) {
      textResult = callResult;
      break;
    }

    modelFailure = callResult;
    if (shouldRetryWithNextModel(callResult)) {
      console.warn(`[${options.routeTag}] Gemini retrying with alternate model after 404. previousUrl=${callResult.debug.url}`);
      continue;
    }
    return callResult;
  }

  if (!textResult) {
    return (
      modelFailure ?? {
        ok: false,
        reason: "http_error",
        error: "Gemini model lookup failed.",
        model: models[0] ?? DEFAULT_GEMINI_MODEL,
        debug: initialDebug(process.env.GEMINI_API_KEY, models[0] ?? DEFAULT_GEMINI_MODEL),
      }
    );
  }

  const attempts = Math.max(1, options.maxParseAttempts ?? 2);
  let lastFailure: GeminiFailure | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const parsed = parseJsonFromText(textResult.text);
    if (parsed.ok) {
      if (process.env.NODE_ENV === "development") {
        const parsedType =
          parsed.value === null ? "null" : Array.isArray(parsed.value) ? "array" : typeof parsed.value;
        const keys =
          parsed.value && typeof parsed.value === "object" && !Array.isArray(parsed.value)
            ? Object.keys(parsed.value as Record<string, unknown>)
            : [];
        console.debug(`[${options.routeTag}] Parsed Gemini JSON type=${parsedType} keys=${keys.join(",")}`);
      }
      return {
        ok: true,
        data: parsed.value as T,
        debug: textResult.debug,
      };
    }

    const debug: GeminiDebugInfo = {
      ...textResult.debug,
      parseError: parsed.error,
      rawSnippet: truncateRaw(textResult.text),
    };

    console.error(
      `[${options.routeTag}] Gemini JSON parse attempt=${attempt}/${attempts} parseError="${parsed.error}" raw="${debug.rawSnippet}"`,
    );

    lastFailure = {
      ok: false,
      reason: "model_parse_error",
      error: `Failed to parse Gemini candidate text as JSON after attempt ${attempt}.`,
      model: textResult.model,
      debug,
    };

    if (attempt < attempts) {
      const retryResult = await callGeminiTextOnce(options, textResult.model);
      if (!retryResult.ok) {
        return retryResult;
      }
      textResult = retryResult;
    }
  }

  return (
    lastFailure ?? {
      ok: false,
      reason: "model_parse_error",
      error: "Failed to parse Gemini candidate text as JSON.",
      model: models[0] ?? DEFAULT_GEMINI_MODEL,
      debug: initialDebug(process.env.GEMINI_API_KEY, models[0] ?? DEFAULT_GEMINI_MODEL),
    }
  );
}

export async function callGeminiText(
  options: GeminiRequestOptions,
): Promise<GeminiTextSuccess | GeminiFailure> {
  const models = modelCandidates();
  let lastFailure: GeminiFailure | null = null;

  for (const model of models) {
    const result = await callGeminiTextOnce(options, model);
    if (result.ok) {
      return result;
    }
    lastFailure = result;
    if (shouldRetryWithNextModel(result)) {
      console.warn(`[${options.routeTag}] Gemini retrying with alternate model after 404. previousUrl=${result.debug.url}`);
      continue;
    }
    return result;
  }

  return (
    lastFailure ?? {
      ok: false,
      reason: "http_error",
      error: "Gemini model lookup failed.",
      model: models[0] ?? DEFAULT_GEMINI_MODEL,
      debug: initialDebug(process.env.GEMINI_API_KEY, models[0] ?? DEFAULT_GEMINI_MODEL),
    }
  );
}

export function isDiagnosticRequest(request: Request): boolean {
  const headerValue = request.headers.get("x-diagnostic");
  if (headerValue === "1") {
    return true;
  }
  const url = new URL(request.url);
  return url.searchParams.get("diagnostic") === "1";
}

export function defaultGeminiDebugInfo(): GeminiDebugInfo {
  return initialDebug(process.env.GEMINI_API_KEY, modelCandidates()[0] ?? DEFAULT_GEMINI_MODEL);
}
