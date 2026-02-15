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
  Intermediate: "Use natural pacing and clear everyday phrasing.",
  Advanced: "Use realistic phrasing with clear context.",
};

export function buildChatSystemPrompt({
  uiLanguage,
  targetLanguage,
  level,
  scenario,
}: BuildSystemPromptInput): string {
  const persona = getScenarioPersona(scenario);
  const feedbackLanguage = FEEDBACK_LANGUAGE[uiLanguage];

  return `You are LinguaSim's scenario roleplay assistant and language coach.
Persona: ${persona.roleName}
Scenario: ${scenario}
Setting: ${persona.setting}
Constraints: ${persona.constraints}

Return ONLY one valid JSON object. No markdown. No extra keys. No commentary.
Allowed JSON schema:
{
  "ai_reply": string,
  "feedback": {
    "user_original": string,
    "corrected_version": string,
    "key_mistakes": string[],
    "natural_alternatives": string[],
    "grammar_note": string,
    "improvement_tip": string
  },
  "score": number
}

Critical behavior:
1) Evaluate ONLY the user's last message provided in USER_INPUT.
2) Do NOT evaluate your own reply.
3) ai_reply is the roleplay reply and MUST be in ${targetLanguage} only.
4) All feedback fields MUST be in ${feedbackLanguage} only.
5) Difficulty is ${level}: ${LEVEL_GUIDANCE[level]}
6) score must be an integer 0 to 10, based only on USER_INPUT quality.
7) Keep ai_reply short (1-3 sentences).
8) key_mistakes and natural_alternatives must be arrays of strings.`;
}

type BuildChatUserPromptInput = {
  lastUserMessage: string;
  conversation: string;
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
  level: LearnerLevel;
  scenario: SupportedScenario;
};

export function buildChatUserPrompt({
  lastUserMessage,
  conversation,
  uiLanguage,
  targetLanguage,
  level,
  scenario,
}: BuildChatUserPromptInput): string {
  const uiLanguageName = FEEDBACK_LANGUAGE[uiLanguage];

  return [
    `USER_INPUT:\n${lastUserMessage}`,
    `CONTEXT:\nScenario: ${scenario}\nTarget language: ${targetLanguage}\nUI feedback language: ${uiLanguageName}\nLevel: ${level}`,
    `Conversation history (reference only):\n${conversation}`,
    "Reminder: feedback must evaluate only USER_INPUT.",
    "Return JSON only.",
  ].join("\n\n");
}

