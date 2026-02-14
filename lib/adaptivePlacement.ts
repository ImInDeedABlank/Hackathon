export type UILanguage = "en" | "ar";
export type TargetLanguage = "English" | "Arabic" | "Spanish";
export type Difficulty = 1 | 2 | 3;
export type QuestionType = "mcq" | "fill" | "short" | "reorder" | "essay";
export type Skill = "vocab" | "grammar" | "reading" | "writing";

export type SkillScores = {
  vocab: number;
  grammar: number;
  reading: number;
  writing: number;
};

export type PlacementFeedback = {
  corrected_version: string;
  key_mistakes: [string, string, string];
  natural_alternatives: [string, string];
  grammar_note: string;
};

export type PlacementMetrics = {
  level: "Beginner" | "Intermediate" | "Advanced";
  cefr_hint: "A1" | "A2" | "B1" | "B2" | "C1";
  confidence: number;
  strengths: [string, string, string];
  weaknesses: [string, string, string];
  feedback: PlacementFeedback;
  recommended_mode: "Speak" | "Text";
  recommended_scenarios: [string, string];
};

export type PlacementState = {
  cycle: number;
  questionIndex: number;
  difficulty: Difficulty;
  confidence: number;
  skillScores: SkillScores;
  stability: number;
  historySummary: string;
};

export type AdaptiveQuestion = {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  skill: Skill;
  prompt: string;
  choices?: string[];
  correctAnswer?: string;
  rubric?: string;
};

export type InterviewAnswer = {
  q: string;
  a: string;
};

export type StepPayloadLast = {
  question: AdaptiveQuestion;
  userAnswer: string;
};

export type PlacementDecision = {
  endCycle?: boolean;
  stopExam: boolean;
  reason: string;
};

export type PlacementGrading = {
  wasCorrect: boolean;
  scoreDelta: number;
  notes: string;
};

export type PlacementStartRequest = {
  action: "start";
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
};

export type PlacementStepRequest = {
  action: "step";
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
  sessionId?: string;
  interviewAnswers?: InterviewAnswer[];
  state?: PlacementState;
  last?: StepPayloadLast;
};

export type PlacementStartResponse = {
  sessionId: string;
  interview: {
    questions: [string, string, string];
  };
  state: PlacementState;
};

export type PlacementStepQuestionResponse = {
  done: false;
  decision: PlacementDecision;
  state: PlacementState;
  grading: PlacementGrading;
  question: AdaptiveQuestion;
};

export type PlacementSummary = {
  cyclesCompleted: number;
  skillScores: SkillScores;
};

export type PlacementStepFinalResponse = {
  done: true;
  decision: {
    stopExam: true;
    reason: string;
  };
  state: PlacementState;
  placement: PlacementMetrics;
  focus_areas: [string, string, string];
  summary: PlacementSummary;
};

export type PlacementStepResponse = PlacementStepQuestionResponse | PlacementStepFinalResponse;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function tuple3(value: unknown): value is [string, string, string] {
  return Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === "string");
}

function tuple2(value: unknown): value is [string, string] {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === "string");
}

export function asUILanguage(value: unknown): UILanguage {
  return value === "ar" ? "ar" : "en";
}

export function asTargetLanguage(value: unknown): TargetLanguage {
  if (value === "Arabic" || value === "Spanish") {
    return value;
  }
  return "English";
}

export function asDifficulty(value: unknown): Difficulty {
  if (value === 1 || value === 3) {
    return value;
  }
  return 2;
}

export function defaultSkillScores(): SkillScores {
  return { vocab: 0, grammar: 0, reading: 0, writing: 0 };
}

export function defaultPlacementState(): PlacementState {
  return {
    cycle: 1,
    questionIndex: 1,
    difficulty: 2,
    confidence: 35,
    skillScores: defaultSkillScores(),
    stability: 50,
    historySummary: "",
  };
}

export function normalizeSkillScores(value: unknown): SkillScores {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    vocab: typeof source.vocab === "number" ? clamp(Math.round(source.vocab), 0, 100) : 0,
    grammar: typeof source.grammar === "number" ? clamp(Math.round(source.grammar), 0, 100) : 0,
    reading: typeof source.reading === "number" ? clamp(Math.round(source.reading), 0, 100) : 0,
    writing: typeof source.writing === "number" ? clamp(Math.round(source.writing), 0, 100) : 0,
  };
}

export function normalizePlacementState(value: unknown): PlacementState {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    cycle: typeof source.cycle === "number" ? clamp(Math.round(source.cycle), 1, 5) : 1,
    questionIndex: typeof source.questionIndex === "number" ? clamp(Math.round(source.questionIndex), 1, 6) : 1,
    difficulty: asDifficulty(source.difficulty),
    confidence: typeof source.confidence === "number" ? clamp(Math.round(source.confidence), 0, 100) : 35,
    skillScores: normalizeSkillScores(source.skillScores),
    stability: typeof source.stability === "number" ? clamp(Math.round(source.stability), 0, 100) : 50,
    historySummary: typeof source.historySummary === "string" ? source.historySummary.slice(0, 3000) : "",
  };
}

export function validateAdaptiveQuestion(raw: unknown): raw is AdaptiveQuestion {
  if (!raw || typeof raw !== "object") {
    return false;
  }
  const source = raw as Record<string, unknown>;
  if (
    typeof source.id !== "string" ||
    typeof source.prompt !== "string" ||
    (source.type !== "mcq" &&
      source.type !== "fill" &&
      source.type !== "short" &&
      source.type !== "reorder" &&
      source.type !== "essay") ||
    (source.skill !== "vocab" &&
      source.skill !== "grammar" &&
      source.skill !== "reading" &&
      source.skill !== "writing") ||
    (source.difficulty !== 1 && source.difficulty !== 2 && source.difficulty !== 3)
  ) {
    return false;
  }

  if (source.type === "mcq") {
    return (
      Array.isArray(source.choices) &&
      source.choices.length >= 3 &&
      source.choices.every((item) => typeof item === "string") &&
      typeof source.correctAnswer === "string"
    );
  }
  if (source.type === "essay") {
    return typeof source.rubric === "string";
  }
  return typeof source.correctAnswer === "string";
}

export function validatePlacementMetrics(raw: unknown): raw is PlacementMetrics {
  if (!raw || typeof raw !== "object") {
    return false;
  }

  const source = raw as Record<string, unknown>;
  const feedback = source.feedback;
  if (!feedback || typeof feedback !== "object") {
    return false;
  }
  const feedbackSource = feedback as Record<string, unknown>;
  return (
    (source.level === "Beginner" || source.level === "Intermediate" || source.level === "Advanced") &&
    (source.cefr_hint === "A1" ||
      source.cefr_hint === "A2" ||
      source.cefr_hint === "B1" ||
      source.cefr_hint === "B2" ||
      source.cefr_hint === "C1") &&
    typeof source.confidence === "number" &&
    Number.isFinite(source.confidence) &&
    tuple3(source.strengths) &&
    tuple3(source.weaknesses) &&
    typeof feedbackSource.corrected_version === "string" &&
    tuple3(feedbackSource.key_mistakes) &&
    tuple2(feedbackSource.natural_alternatives) &&
    typeof feedbackSource.grammar_note === "string" &&
    (source.recommended_mode === "Speak" || source.recommended_mode === "Text") &&
    tuple2(source.recommended_scenarios)
  );
}

export function validatePlacementStepResponse(
  raw: unknown,
): raw is PlacementStepQuestionResponse | PlacementStepFinalResponse {
  if (!raw || typeof raw !== "object") {
    return false;
  }

  const source = raw as Record<string, unknown>;
  if (typeof source.done !== "boolean" || !source.decision || typeof source.decision !== "object") {
    return false;
  }
  const decision = source.decision as Record<string, unknown>;
  if (typeof decision.reason !== "string" || typeof decision.stopExam !== "boolean") {
    return false;
  }

  const state = normalizePlacementState(source.state);
  const hasState = !!source.state && typeof source.state === "object";
  if (!hasState || !state) {
    return false;
  }

  if (source.done) {
    const summary = source.summary as Record<string, unknown> | undefined;
    if (!validatePlacementMetrics(source.placement) || !Array.isArray(source.focus_areas) || !summary) {
      return false;
    }
    const focus = source.focus_areas;
    const summaryScores = summary.skillScores;
    return (
      focus.length >= 3 &&
      focus.slice(0, 3).every((item) => typeof item === "string") &&
      typeof summary.cyclesCompleted === "number" &&
      summaryScores !== null &&
      typeof summaryScores === "object"
    );
  }

  const grading = source.grading as Record<string, unknown> | undefined;
  if (!grading || typeof grading !== "object") {
    return false;
  }

  return (
    typeof grading.wasCorrect === "boolean" &&
    typeof grading.scoreDelta === "number" &&
    typeof grading.notes === "string" &&
    validateAdaptiveQuestion(source.question)
  );
}
