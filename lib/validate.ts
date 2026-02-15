export type ChatFeedbackShape = {
  user_original: string;
  corrected_version: string;
  key_mistakes: string[];
  natural_alternatives: string[];
  grammar_note: string;
  improvement_tip: string;
};

export type ChatResponseShape = {
  ai_reply: string;
  feedback: ChatFeedbackShape;
  score: number;
};

export type SessionTurn = {
  user: string;
  ai: string;
  feedback: ChatFeedbackShape;
  score: number;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function validateResponseShape(obj: unknown): obj is ChatResponseShape {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const source = obj as Record<string, unknown>;
  const feedback = source.feedback;

  if (!feedback || typeof feedback !== "object") {
    return false;
  }

  const feedbackSource = feedback as Record<string, unknown>;

  return (
    typeof source.ai_reply === "string" &&
    typeof source.score === "number" &&
    Number.isFinite(source.score) &&
    typeof feedbackSource.user_original === "string" &&
    typeof feedbackSource.corrected_version === "string" &&
    typeof feedbackSource.grammar_note === "string" &&
    typeof feedbackSource.improvement_tip === "string" &&
    isStringArray(feedbackSource.key_mistakes) &&
    isStringArray(feedbackSource.natural_alternatives)
  );
}
