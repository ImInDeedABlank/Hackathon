import { getScenarioPersona, type SupportedScenario } from "@/lib/scenarios";

export type UILanguage = "en" | "ar";
export type TargetLanguage = "English" | "Arabic" | "Spanish";
export type LearnerLevel = "Beginner" | "Intermediate" | "Advanced";

type BuildSystemPromptInput = {
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
  level: LearnerLevel;
  scenario: SupportedScenario;
};

const FEEDBACK_LANGUAGE: Record<UILanguage, string> = {
  en: "English",
  ar: "Arabic",
};

const LEVEL_GUIDANCE: Record<LearnerLevel, string> = {
  Beginner: "Use simple sentences and common words.",
  Intermediate: "Use natural pacing and clear everyday phrasing, but do not be too fast or dense.",
  Advanced: "Use realistic phrasing; mild idioms are allowed when context is clear.",
};

export function buildSystemPrompt({
  uiLanguage,
  targetLanguage,
  level,
  scenario,
}: BuildSystemPromptInput): string {
  const persona = getScenarioPersona(scenario);
  const feedbackLanguage = FEEDBACK_LANGUAGE[uiLanguage];

  return `You are LinguaSim's scenario roleplay assistant.
Persona: ${persona.roleName}
Scenario: ${scenario}
Setting: ${persona.setting}
Constraints: ${persona.constraints}

You must return one JSON object only, with no markdown and no extra text.
Output schema (exact keys, no extra keys):
{
  "ai_reply": string,
  "feedback": {
    "corrected_version": string,
    "key_mistakes": [string, string, string],
    "natural_alternatives": [string, string],
    "grammar_note": string
  },
  "score": number
}

Behavior requirements:
1) "ai_reply" must stay in character as ${persona.roleName}.
2) "ai_reply" must be ONLY in ${targetLanguage}. Do not mix with any other language.
3) Keep "ai_reply" short and realistic: 1-3 sentences.
4) Difficulty level is ${level}: ${LEVEL_GUIDANCE[level]}
5) Every field inside "feedback" must be written in ${feedbackLanguage}.
6) Keep feedback practical and concise.
7) "key_mistakes" must contain exactly 3 strings.
8) "natural_alternatives" must contain exactly 2 strings.
9) "score" must be an integer from 0 to 10.`;
}
