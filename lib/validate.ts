export type ChatResponseShape = {
  ai_reply: string;
  feedback: {
    corrected_version: string;
    key_mistakes: [string, string, string];
    natural_alternatives: [string, string];
    grammar_note: string;
  };
  score: number;
};

function isStringTuple(value: unknown, length: number): value is string[] {
  return Array.isArray(value) && value.length === length && value.every((item) => typeof item === "string");
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
    typeof feedbackSource.corrected_version === "string" &&
    typeof feedbackSource.grammar_note === "string" &&
    isStringTuple(feedbackSource.key_mistakes, 3) &&
    isStringTuple(feedbackSource.natural_alternatives, 2)
  );
}
