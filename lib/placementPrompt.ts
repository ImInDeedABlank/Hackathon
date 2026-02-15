import { MAX_PLACEMENT_CYCLES } from "@/lib/adaptivePlacement";
import type { InterviewAnswer, PlacementState, StepPayloadLast, TargetLanguage, UILanguage } from "@/lib/adaptivePlacement";

type PromptMode = "start" | "step";

type PlacementSystemPromptInput = {
  mode: PromptMode;
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
};

type PlacementUserPromptInput = {
  mode: PromptMode;
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
  sessionId?: string;
  interviewAnswers?: InterviewAnswer[];
  state?: PlacementState;
  last?: StepPayloadLast;
  historyHints?: {
    nonEssayTypesInCurrentCycle: string[];
    questionsAnsweredInCurrentCycle: number;
  };
};

export function buildPlacementSystemPrompt({
  mode,
  uiLanguage,
  targetLanguage,
}: PlacementSystemPromptInput): string {
  if (mode === "start") {
    return [
      "You are LinguaSim placement interview generator.",
      "Return ONLY valid JSON. No markdown. No extra keys.",
      "Generate exactly 3 interview questions in UI language.",
      `UI language: ${uiLanguage === "ar" ? "Arabic" : "English"}`,
      `Target language being learned: ${targetLanguage}`,
      "Interview questions must help personalize future test focus.",
      "Output schema:",
      '{"questions":[string,string,string]}',
    ].join("\n");
  }

  return [
    "You are LinguaSim adaptive placement engine.",
    "Return ONLY valid JSON. No markdown. No extra keys.",
    "You must evaluate the last learner answer (if present), update adaptive state, decide cycle progression, and generate the next step.",
    "Core rules:",
    "1) Test questions must be ONLY in target language.",
    "2) Placement feedback fields in final output must be in UI language.",
    `3) ${MAX_PLACEMENT_CYCLES} ${MAX_PLACEMENT_CYCLES === 1 ? "cycle" : "cycles"} total; each cycle has 5 non-essay questions plus 1 essay.`,
    "4) Non-essay question types are mcq/fill/short/reorder; ensure at least 3 different types within each cycle's first 5 questions.",
    "5) Difficulty adapts from performance, confidence and stability should be realistic and bounded 0..100.",
    "6) You decide next question type/content, whether to end cycle, and whether to stop exam early (min after cycle 3).",
    "Language quality constraints:",
    "- English: natural collocations and everyday contexts.",
    "- Spanish: native phrasing and common daily contexts (not literal translations).",
    "- Arabic: Modern Standard Arabic with natural sentence patterns (not translated templates).",
    "Essay prompt rule:",
    "- Essay prompts must explicitly request 1-3 sentences.",
    "Output must match ONE of these two exact schema families:",
    `A) Next question:
{
  "done": false,
  "decision": { "endCycle": boolean, "stopExam": boolean, "reason": string },
  "state": {
    "cycle": number,
    "questionIndex": number,
    "difficulty": 1|2|3,
    "confidence": number,
    "skillScores": { "vocab": number, "grammar": number, "reading": number, "writing": number },
    "stability": number,
    "historySummary": string
  },
  "grading": { "wasCorrect": boolean, "scoreDelta": number, "notes": string },
  "question": {
    "id": string,
    "type": "mcq"|"fill"|"short"|"reorder"|"essay",
    "difficulty": 1|2|3,
    "skill": "vocab"|"grammar"|"reading"|"writing",
    "prompt": string,
    "choices"?: string[],
    "correctAnswer"?: string,
    "rubric"?: string
  }
}`,
    `B) Final result:
{
  "done": true,
  "decision": { "stopExam": true, "reason": string },
  "state": {
    "cycle": number,
    "questionIndex": number,
    "difficulty": 1|2|3,
    "confidence": number,
    "skillScores": { "vocab": number, "grammar": number, "reading": number, "writing": number },
    "stability": number,
    "historySummary": string
  },
  "placement": {
    "level": "Beginner|Intermediate|Advanced",
    "cefr_hint": "A1|A2|B1|B2|C1",
    "confidence": 0-100,
    "strengths": [string,string,string],
    "weaknesses": [string,string,string],
    "feedback": {
      "corrected_version": string,
      "key_mistakes": [string,string,string],
      "natural_alternatives": [string,string],
      "grammar_note": string
    },
    "recommended_mode": "Speak|Text",
    "recommended_scenarios": [string,string]
  },
  "focus_areas": [string,string,string],
  "summary": {
    "cyclesCompleted": number,
    "skillScores": { "vocab": number, "grammar": number, "reading": number, "writing": number }
  }
}`,
  ].join("\n");
}

export function buildPlacementUserPrompt({
  mode,
  uiLanguage,
  targetLanguage,
  sessionId,
  interviewAnswers,
  state,
  last,
  historyHints,
}: PlacementUserPromptInput): string {
  if (mode === "start") {
    return [
      `Mode: ${mode}`,
      `UI language: ${uiLanguage}`,
      `Target language: ${targetLanguage}`,
      "Generate interview questions that collect learner goals, weak contexts, and preferred practice style.",
    ].join("\n");
  }

  return [
    `Mode: ${mode}`,
    `Session: ${sessionId ?? "unknown"}`,
    `UI language: ${uiLanguage}`,
    `Target language: ${targetLanguage}`,
    `Interview answers: ${JSON.stringify(interviewAnswers ?? [])}`,
    `Current state: ${JSON.stringify(state ?? null)}`,
    `Last interaction: ${JSON.stringify(last ?? null)}`,
    `Cycle hints: ${JSON.stringify(historyHints ?? null)}`,
    "Evaluate last answer carefully with partial credit when appropriate.",
    "If there is no last answer, generate the first question for the provided state.",
    "Keep prompts short and clear.",
  ].join("\n");
}
