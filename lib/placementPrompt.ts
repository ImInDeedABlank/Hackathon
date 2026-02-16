import { MAX_PLACEMENT_CYCLES, QUESTIONS_PER_CYCLE } from "@/lib/adaptivePlacement";
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
    "You must evaluate learner answers by full cycle, update adaptive state, and decide cycle progression.",
    "Core rules:",
    "1) Test questions must be ONLY in target language.",
    "2) Placement feedback fields in final output must be in UI language.",
    `3) Maximum ${MAX_PLACEMENT_CYCLES} cycles total.`,
    `4) Each cycle must include exactly ${QUESTIONS_PER_CYCLE} questions.`,
    "5) Allowed question types are only mcq/fill/short/reorder.",
    "6) Ensure at least 3 different question types in every cycle.",
    "7) Difficulty adapts from cycle performance, confidence and stability should stay realistic and bounded 0..100.",
    "8) If LAST_CYCLE is null, generate the first cycle questions for current state.",
    "9) If LAST_CYCLE is present, evaluate all 5 answers, then either return next cycle questions or final placement.",
    `10) Gemini may stop early when confident, but never exceed cycle ${MAX_PLACEMENT_CYCLES}.`,
    "Language quality constraints:",
    "- English: natural collocations and everyday contexts.",
    "- Spanish: native phrasing and common daily contexts (not literal translations).",
    "- Arabic: Modern Standard Arabic with natural sentence patterns (not translated templates).",
    "Output must match ONE of these two exact schema families:",
    `A) Next cycle:
{
  "done": false,
  "decision": { "endCycle": boolean, "stopExam": false, "reason": string },
  "state": {
    "cycle": number,
    "difficulty": 1|2|3,
    "confidence": number,
    "skillScores": { "vocab": number, "grammar": number, "reading": number, "writing": number },
    "stability": number,
    "historySummary": string
  },
  "grading": { "cycleAverage": number, "scoreDelta": number, "notes": string },
  "questions": [{
      "id": string,
      "type": "mcq"|"fill"|"short"|"reorder",
      "difficulty": 1|2|3,
      "skill": "vocab"|"grammar"|"reading"|"writing",
      "prompt": string,
      "choices"?: string[],
      "correctAnswer"?: string
    }]
}`,
    `In schema A, "questions" must contain exactly ${QUESTIONS_PER_CYCLE} items.`,
    `B) Final result:
{
  "done": true,
  "decision": { "stopExam": true, "reason": string },
  "state": {
    "cycle": number,
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
    `Last cycle payload: ${JSON.stringify(last ?? null)}`,
    `Questions per cycle: ${QUESTIONS_PER_CYCLE}`,
    "Evaluate cycle answers carefully with partial credit when appropriate.",
    "If last cycle is null, generate the first cycle for the provided state.",
    "Keep prompts short and clear.",
  ].join("\n");
}
