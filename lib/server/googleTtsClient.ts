import "server-only";

import { TextToSpeechClient } from "@google-cloud/text-to-speech";

type ServiceAccountShape = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

let cachedClient: TextToSpeechClient | null = null;

function parseServiceAccountFromEnv(): ServiceAccountShape | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as ServiceAccountShape;
    if (!parsed.client_email || !parsed.private_key) {
      throw new Error("missing required credential fields");
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid json";
    throw new Error(`Invalid GOOGLE_SERVICE_ACCOUNT_JSON (${message}).`);
  }
}

export function getGoogleTtsClient(): TextToSpeechClient {
  if (cachedClient) {
    return cachedClient;
  }

  const serviceAccount = parseServiceAccountFromEnv();

  if (serviceAccount) {
    cachedClient = new TextToSpeechClient({
      projectId: serviceAccount.project_id,
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
    });
    return cachedClient;
  }

  // Falls back to default Google auth discovery, including GOOGLE_APPLICATION_CREDENTIALS.
  cachedClient = new TextToSpeechClient();
  return cachedClient;
}
