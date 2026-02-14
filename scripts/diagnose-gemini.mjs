import fs from "node:fs";
import path from "node:path";

function readEnvFromDotLocal(key) {
  try {
    const filePath = path.resolve(process.cwd(), ".env.local");
    const content = fs.readFileSync(filePath, "utf8");
    const line = content
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith(`${key}=`));
    if (!line) return undefined;
    return line.slice(key.length + 1).trim();
  } catch {
    return undefined;
  }
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || readEnvFromDotLocal("GEMINI_MODEL") || "gemini-2.0-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const REDACTED_URL = `${GEMINI_ENDPOINT}?key=[REDACTED]`;

const apiKey = process.env.GEMINI_API_KEY || readEnvFromDotLocal("GEMINI_API_KEY");
const debug = {
  keyPresent: Boolean(apiKey),
  url: REDACTED_URL,
  status: 0,
  rawSnippet: "",
  parseError: null,
};

if (!apiKey) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        text: "",
        error: "GEMINI_API_KEY is missing.",
        debug,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

const body = {
  contents: [{ role: "user", parts: [{ text: "Reply with the word OK." }] }],
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1024,
  },
};

try {
  const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  debug.status = response.status;
  const rawBody = await response.text();
  debug.rawSnippet = rawBody.slice(0, 2000);

  let parsed;
  try {
    parsed = JSON.parse(rawBody);
  } catch (error) {
    debug.parseError = error instanceof Error ? error.message : "Failed to parse response JSON.";
    console.log(
      JSON.stringify(
        {
          ok: false,
          text: "",
          error: "Gemini returned non-JSON response.",
          debug,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!response.ok || !text) {
    const errorMessage = parsed?.error?.message || `Gemini HTTP ${response.status}`;
    console.log(
      JSON.stringify(
        {
          ok: false,
          text,
          error: errorMessage,
          debug,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        text,
        debug,
      },
      null,
      2,
    ),
  );
} catch (error) {
  debug.parseError = error instanceof Error ? error.message : "Network error";
  console.log(
    JSON.stringify(
      {
        ok: false,
        text: "",
        error: "Network error calling Gemini.",
        debug,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}
