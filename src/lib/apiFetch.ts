type ApiFetchMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiFetchOptions = {
  method?: ApiFetchMethod;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

export type ApiFetchResult<T = unknown> = {
  ok: boolean;
  status: number;
  data: T;
  requestId: string;
};

export class ApiFetchError<T = unknown> extends Error {
  status: number;
  data: T;
  requestId: string;
  cooldownMs: number | null;
  isRateLimit: boolean;

  constructor({
    message,
    status,
    data,
    requestId,
  }: {
    message: string;
    status: number;
    data: T;
    requestId: string;
  }) {
    super(message);
    this.name = "ApiFetchError";
    this.status = status;
    this.data = data;
    this.requestId = requestId;
    this.cooldownMs =
      data && typeof data === "object" && typeof (data as { cooldownMs?: unknown }).cooldownMs === "number"
        ? Math.max(0, Math.round((data as unknown as { cooldownMs: number }).cooldownMs))
        : null;
    this.isRateLimit =
      status === 429 ||
      (data &&
        typeof data === "object" &&
        (data as { error?: unknown }).error === "RATE_LIMIT");
  }
}

const inFlight = new Map<string, Promise<ApiFetchResult<unknown>>>();

function hashString(input: string): string {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function normalizeBody(body: unknown): string | undefined {
  if (body === undefined) {
    return undefined;
  }
  if (typeof body === "string") {
    return body;
  }
  return JSON.stringify(body);
}

function buildRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function parseResponseBody(raw: string, contentType: string | null): unknown {
  if (!raw) {
    return null;
  }
  if (contentType?.includes("application/json")) {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return { raw };
    }
  }
  return { raw };
}

export async function apiFetch<T = unknown>(
  url: string,
  options: ApiFetchOptions = {},
): Promise<ApiFetchResult<T>> {
  const method = options.method ?? "GET";
  const bodyString = normalizeBody(options.body);
  const key = `${method}:${url}:${hashString(bodyString ?? "")}`;

  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<ApiFetchResult<T>>;
  }

  const promise = (async () => {
    const requestId = buildRequestId();
    const headers = new Headers(options.headers ?? {});
    if (bodyString !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("x-request-id", requestId);

    const response = await fetch(url, {
      method,
      headers,
      body: bodyString,
      signal: options.signal,
    });

    const raw = await response.text();
    const data = parseResponseBody(raw, response.headers.get("content-type")) as T;

    if (!response.ok) {
      throw new ApiFetchError<T>({
        message:
          data && typeof data === "object" && typeof (data as { message?: unknown }).message === "string"
            ? (data as unknown as { message: string }).message
            : `Request failed (${response.status})`,
        status: response.status,
        data,
        requestId,
      });
    }

    return {
      ok: true,
      status: response.status,
      data,
      requestId,
    } satisfies ApiFetchResult<T>;
  })();

  inFlight.set(key, promise as Promise<ApiFetchResult<unknown>>);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}
