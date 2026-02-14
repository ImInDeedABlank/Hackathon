import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  asDifficulty,
  asTargetLanguage,
  asUILanguage,
  clamp,
  defaultPlacementState,
  normalizePlacementState,
  validateAdaptiveQuestion,
  validatePlacementStepResponse,
  type AdaptiveQuestion,
  type Difficulty,
  type InterviewAnswer,
  type PlacementMetrics,
  type PlacementStartRequest,
  type PlacementStartResponse,
  type PlacementState,
  type PlacementStepFinalResponse,
  type PlacementStepQuestionResponse,
  type PlacementStepRequest,
  type QuestionType,
  type Skill,
  type SkillScores,
  type StepPayloadLast,
  type TargetLanguage,
  type UILanguage,
} from "@/lib/adaptivePlacement";
import { buildPlacementSystemPrompt, buildPlacementUserPrompt } from "@/lib/placementPrompt";

const API_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";
const SESSION_TTL_MS = 1000 * 60 * 90;

type SessionRecord = {
  sessionId: string;
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
  interviewQuestions: [string, string, string];
  interviewAnswers: InterviewAnswer[];
  typeHistoryByCycle: Record<number, QuestionType[]>;
  lastSeenAt: number;
};

const sessions = new Map<string, SessionRecord>();

const TYPE_PLAN_BY_CYCLE: Record<number, QuestionType[]> = {
  1: ["mcq", "fill", "short", "reorder", "mcq"],
  2: ["fill", "reorder", "mcq", "short", "fill"],
  3: ["short", "mcq", "reorder", "fill", "short"],
  4: ["reorder", "short", "fill", "mcq", "reorder"],
  5: ["mcq", "short", "fill", "reorder", "mcq"],
};

type FallbackQuestionEntry = {
  prompt: string;
  choices?: [string, string, string, string];
  correctAnswer?: string;
  rubric?: string;
};

type LanguageFallback = Record<QuestionType, Record<Difficulty, FallbackQuestionEntry[]>>;

const FALLBACK_QUESTION_BANK: Record<TargetLanguage, LanguageFallback> = {
  English: {
    mcq: {
      1: [
        {
          prompt: "Choose the correct sentence for daily routine.",
          choices: ["She goes to work at 8.", "She go to work at 8.", "She going work at 8.", "She gone work at 8."],
          correctAnswer: "She goes to work at 8.",
        },
      ],
      2: [
        {
          prompt: "Pick the most natural response in a cafe.",
          choices: ["Could I have a coffee, please?", "Give me coffee now.", "I want coffee immediate.", "Coffee me, please now."],
          correctAnswer: "Could I have a coffee, please?",
        },
      ],
      3: [
        {
          prompt: "Choose the most professional sentence.",
          choices: [
            "Could you clarify the timeline for this task?",
            "Tell me timeline now.",
            "Timeline should you tell me.",
            "You must explain timeline now.",
          ],
          correctAnswer: "Could you clarify the timeline for this task?",
        },
      ],
    },
    fill: {
      1: [{ prompt: "I ___ to school by bus.", correctAnswer: "go" }],
      2: [{ prompt: "They have lived here ___ 2021.", correctAnswer: "since" }],
      3: [{ prompt: "If I had prepared earlier, I ___ have finished on time.", correctAnswer: "would" }],
    },
    short: {
      1: [{ prompt: "Write one short sentence introducing yourself.", correctAnswer: "my name is" }],
      2: [{ prompt: "In one sentence, explain why exercise is useful.", correctAnswer: "because" }],
      3: [{ prompt: "In one sentence, describe how you prioritize your tasks.", correctAnswer: "priority" }],
    },
    reorder: {
      1: [{ prompt: "Reorder words: every / reads / night / he", correctAnswer: "he reads every night" }],
      2: [{ prompt: "Reorder words: arrived / had / left / when / I / she", correctAnswer: "when I arrived she had left" }],
      3: [{ prompt: "Reorder words: had / known / if / I / earlier / would / acted / have / I", correctAnswer: "if I had known earlier I would have acted" }],
    },
    essay: {
      1: [{ prompt: "Write 1-3 sentences about your daily routine.", rubric: "Assess basic grammar, clarity, and vocabulary use." }],
      2: [{ prompt: "Write 1-3 sentences about a recent challenge and how you handled it.", rubric: "Assess coherence, tense consistency, and connector use." }],
      3: [{ prompt: "Write 1-3 sentences about a professional goal and your plan.", rubric: "Assess precision, cohesion, and natural phrasing." }],
    },
  },
  Spanish: {
    mcq: {
      1: [
        {
          prompt: "Elige la frase correcta para una rutina diaria.",
          choices: ["Ella va al trabajo a las ocho.", "Ella va trabajo las ocho.", "Ella ir al trabajo ocho.", "Ella yendo trabajo ocho."],
          correctAnswer: "Ella va al trabajo a las ocho.",
        },
      ],
      2: [
        {
          prompt: "Elige la opción más natural en una cafetería.",
          choices: ["¿Me pone un café, por favor?", "Dame café ahora.", "Yo querer café inmediato.", "Café tú darme ya."],
          correctAnswer: "¿Me pone un café, por favor?",
        },
      ],
      3: [
        {
          prompt: "Elige la frase más profesional.",
          choices: [
            "¿Podría aclarar el calendario de esta tarea?",
            "Dime el calendario ya.",
            "Calendario tú explicar ahora.",
            "Debes decirme el calendario ahora.",
          ],
          correctAnswer: "¿Podría aclarar el calendario de esta tarea?",
        },
      ],
    },
    fill: {
      1: [{ prompt: "Yo ___ al trabajo en autobús.", correctAnswer: "voy" }],
      2: [{ prompt: "Viven aquí ___ 2021.", correctAnswer: "desde" }],
      3: [{ prompt: "Si hubiera estudiado antes, ___ habría terminado a tiempo.", correctAnswer: "ya" }],
    },
    short: {
      1: [{ prompt: "Escribe una frase corta para presentarte.", correctAnswer: "me llamo" }],
      2: [{ prompt: "En una frase, explica por qué es importante hacer ejercicio.", correctAnswer: "porque" }],
      3: [{ prompt: "En una frase, explica cómo organizas prioridades en tu trabajo.", correctAnswer: "prioridad" }],
    },
    reorder: {
      1: [{ prompt: "Ordena: cada / noche / él / lee", correctAnswer: "él lee cada noche" }],
      2: [{ prompt: "Ordena: llegué / se / cuando / ella / ya / había / ido", correctAnswer: "cuando llegué ella ya se había ido" }],
      3: [{ prompt: "Ordena: sabido / antes / lo / habría / actuado / si / hubiera", correctAnswer: "si lo hubiera sabido antes habría actuado" }],
    },
    essay: {
      1: [{ prompt: "Escribe de 1 a 3 frases sobre tu rutina diaria.", rubric: "Evalúa gramática básica, claridad y vocabulario útil." }],
      2: [{ prompt: "Escribe de 1 a 3 frases sobre un reto reciente y cómo lo resolviste.", rubric: "Evalúa coherencia, tiempos verbales y conectores." }],
      3: [{ prompt: "Escribe de 1 a 3 frases sobre una meta profesional y tu plan.", rubric: "Evalúa precisión, cohesión y naturalidad." }],
    },
  },
  Arabic: {
    mcq: {
      1: [
        {
          prompt: "اختر الجملة الصحيحة في سياق يومي.",
          choices: ["هي تذهب إلى العمل الساعة الثامنة.", "هي يذهب إلى العمل الساعة الثامنة.", "هي ذهاب العمل الساعة الثامنة.", "هي راح عمل الساعة الثامنة."],
          correctAnswer: "هي تذهب إلى العمل الساعة الثامنة.",
        },
      ],
      2: [
        {
          prompt: "اختر العبارة الأكثر طبيعية في مقهى.",
          choices: ["هل يمكنني فنجان قهوة من فضلك؟", "أعطني قهوة الآن.", "أنا يريد قهوة فورًا.", "قهوة أعطيني بسرعة."],
          correctAnswer: "هل يمكنني فنجان قهوة من فضلك؟",
        },
      ],
      3: [
        {
          prompt: "اختر الجملة الأكثر مهنية.",
          choices: [
            "هل يمكنك توضيح الجدول الزمني لهذه المهمة؟",
            "قل لي الجدول الآن.",
            "الجدول أنت اشرح الآن.",
            "يجب أن تقول الجدول فورًا.",
          ],
          correctAnswer: "هل يمكنك توضيح الجدول الزمني لهذه المهمة؟",
        },
      ],
    },
    fill: {
      1: [{ prompt: "أنا ___ إلى العمل بالحافلة.", correctAnswer: "أذهب" }],
      2: [{ prompt: "نحن نعيش هنا ___ عام 2021.", correctAnswer: "منذ" }],
      3: [{ prompt: "لو درست مبكرًا، ___ أنهيت المهمة في الوقت.", correctAnswer: "لكنت" }],
    },
    short: {
      1: [{ prompt: "اكتب جملة قصيرة للتعريف بنفسك.", correctAnswer: "اسمي" }],
      2: [{ prompt: "في جملة واحدة، اشرح لماذا الرياضة مهمة.", correctAnswer: "لأن" }],
      3: [{ prompt: "في جملة واحدة، اشرح كيف ترتب أولوياتك في العمل.", correctAnswer: "أولوية" }],
    },
    reorder: {
      1: [{ prompt: "رتب الكلمات: كل / ليلة / يقرأ / هو", correctAnswer: "هو يقرأ كل ليلة" }],
      2: [{ prompt: "رتب الكلمات: وصلت / عندما / كانت / هي / قد / غادرت", correctAnswer: "عندما وصلت كانت هي قد غادرت" }],
      3: [{ prompt: "رتب الكلمات: لو / كنت / علمت / مبكرًا / لتصرفت", correctAnswer: "لو كنت علمت مبكرًا لتصرفت" }],
    },
    essay: {
      1: [{ prompt: "اكتب من 1 إلى 3 جمل عن روتينك اليومي.", rubric: "قيّم وضوح الفكرة والقواعد الأساسية والمفردات." }],
      2: [{ prompt: "اكتب من 1 إلى 3 جمل عن تحدٍ حديث وكيف تعاملت معه.", rubric: "قيّم الترابط ودقة الأزمنة وأدوات الربط." }],
      3: [{ prompt: "اكتب من 1 إلى 3 جمل عن هدف مهني وخطة التنفيذ.", rubric: "قيّم الدقة اللغوية والتماسك والصياغة الطبيعية." }],
    },
  },
};

function cleanupSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.lastSeenAt > SESSION_TTL_MS) {
      sessions.delete(sessionId);
    }
  }
}

function parseStartRequest(raw: unknown): PlacementStartRequest {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    action: "start",
    uiLanguage: asUILanguage(source.uiLanguage),
    targetLanguage: asTargetLanguage(source.targetLanguage),
  };
}

function parseStepRequest(raw: unknown): PlacementStepRequest {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const interviewAnswers = Array.isArray(source.interviewAnswers)
    ? source.interviewAnswers
        .filter((item): item is InterviewAnswer => {
          if (!item || typeof item !== "object") return false;
          const entry = item as Record<string, unknown>;
          return typeof entry.q === "string" && typeof entry.a === "string";
        })
        .map((entry) => ({ q: entry.q.trim(), a: entry.a.trim() }))
    : undefined;

  const lastRaw = source.last && typeof source.last === "object" ? (source.last as Record<string, unknown>) : null;
  let last: StepPayloadLast | undefined;
  if (
    lastRaw &&
    lastRaw.question &&
    typeof lastRaw.question === "object" &&
    validateAdaptiveQuestion(lastRaw.question) &&
    typeof lastRaw.userAnswer === "string"
  ) {
    last = {
      question: lastRaw.question,
      userAnswer: lastRaw.userAnswer.trim(),
    };
  }

  return {
    action: "step",
    uiLanguage: asUILanguage(source.uiLanguage),
    targetLanguage: asTargetLanguage(source.targetLanguage),
    sessionId: typeof source.sessionId === "string" ? source.sessionId.trim() : undefined,
    interviewAnswers,
    state: normalizePlacementState(source.state),
    last,
  };
}

async function callOpenAI({
  apiKey,
  systemPrompt,
  userPrompt,
}: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<unknown | null> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }
  try {
    return JSON.parse(content) as unknown;
  } catch {
    return null;
  }
}

function getSession(sessionId: string | undefined, uiLanguage: UILanguage, targetLanguage: TargetLanguage): SessionRecord {
  const existing = sessionId ? sessions.get(sessionId) : undefined;
  if (existing) {
    existing.lastSeenAt = Date.now();
    return existing;
  }
  const createdId = sessionId && sessionId.length > 0 ? sessionId : crypto.randomUUID();
  const created: SessionRecord = {
    sessionId: createdId,
    uiLanguage,
    targetLanguage,
    interviewQuestions: ["", "", ""],
    interviewAnswers: [],
    typeHistoryByCycle: {},
    lastSeenAt: Date.now(),
  };
  sessions.set(createdId, created);
  return created;
}

function fallbackInterviewQuestions(uiLanguage: UILanguage, targetLanguage: TargetLanguage): [string, string, string] {
  if (uiLanguage === "ar") {
    return [
      `ما هدفك الأساسي من تعلم ${targetLanguage} خلال الأشهر القادمة؟`,
      "في أي مواقف تشعر أن اللغة أصعب عليك؟",
      "ما نوع التدريب الذي تفضله أكثر: محادثة أم كتابة؟",
    ];
  }
  return [
    `What is your main goal for learning ${targetLanguage} in the next few months?`,
    "Which situations feel hardest for you in this language?",
    "Which practice style helps you most: conversation or writing?",
  ];
}

function fallbackEntry(
  targetLanguage: TargetLanguage,
  type: QuestionType,
  difficulty: Difficulty,
  indexSeed: number,
): FallbackQuestionEntry {
  const entries = FALLBACK_QUESTION_BANK[targetLanguage][type][difficulty];
  return entries[indexSeed % entries.length];
}

function fallbackQuestion({
  sessionId,
  state,
  targetLanguage,
}: {
  sessionId: string;
  state: PlacementState;
  targetLanguage: TargetLanguage;
}): AdaptiveQuestion {
  const type =
    state.questionIndex === 6
      ? "essay"
      : TYPE_PLAN_BY_CYCLE[clamp(state.cycle, 1, 5)][clamp(state.questionIndex, 1, 5) - 1];
  const skill: Skill = type === "mcq" ? "vocab" : type === "fill" || type === "reorder" ? "grammar" : type === "essay" ? "writing" : "reading";
  const entry = fallbackEntry(targetLanguage, type, state.difficulty, state.cycle + state.questionIndex);
  const base: AdaptiveQuestion = {
    id: `fallback-${sessionId}-c${state.cycle}-q${state.questionIndex}-${type}`,
    type,
    difficulty: state.difficulty,
    skill,
    prompt: entry.prompt,
  };
  if (type === "mcq" && entry.choices && entry.correctAnswer) {
    base.choices = [...entry.choices];
    base.correctAnswer = entry.correctAnswer;
  } else if (type === "essay" && entry.rubric) {
    base.rubric = entry.rubric;
  } else if (entry.correctAnswer) {
    base.correctAnswer = entry.correctAnswer;
  }
  return base;
}

function normalizeSimple(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?؟؛:()[\]{}"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackScoreDelta(difficulty: Difficulty, correct: boolean): number {
  const base = difficulty === 1 ? 6 : difficulty === 2 ? 9 : 12;
  return correct ? base : -base;
}

function updateSkillScore(scores: SkillScores, skill: Skill, delta: number): SkillScores {
  return {
    ...scores,
    [skill]: clamp(scores[skill] + delta, 0, 100),
  };
}

function buildFallbackFinal({
  state,
  session,
}: {
  state: PlacementState;
  session: SessionRecord;
}): PlacementStepFinalResponse {
  const average =
    (state.skillScores.vocab + state.skillScores.grammar + state.skillScores.reading + state.skillScores.writing) / 4;
  const level: PlacementMetrics["level"] = average >= 70 ? "Advanced" : average >= 42 ? "Intermediate" : "Beginner";
  const cefr: PlacementMetrics["cefr_hint"] =
    level === "Advanced" ? (average >= 85 ? "C1" : "B2") : level === "Intermediate" ? "B1" : average < 28 ? "A1" : "A2";

  const interviewBlob = session.interviewAnswers.map((item) => `${item.q} ${item.a}`).join(" ").toLowerCase();
  const focus: string[] = [];
  if (/work|career|job|وظيفة|عمل|trabajo|empleo/.test(interviewBlob)) {
    focus.push("Professional communication and task explanation.");
  }
  if (/travel|airport|hotel|doctor|سفر|مطار|فندق|طبيب|viaje|aeropuerto|hotel|médico/.test(interviewBlob)) {
    focus.push("Travel and service interactions.");
  }
  if (/speak|speaking|conversation|تحدث|محادثة|hablar|conversación/.test(interviewBlob)) {
    focus.push("Fluency through short follow-up turns.");
  }
  const rankedSkills = (Object.entries(state.skillScores) as Array<[Skill, number]>)
    .sort((a, b) => a[1] - b[1])
    .map(([skill]) => skill);
  for (const skill of rankedSkills) {
    if (skill === "grammar") focus.push("Grammar consistency in tense and agreement.");
    if (skill === "vocab") focus.push("Expand high-frequency practical vocabulary.");
    if (skill === "reading") focus.push("Reading comprehension on short functional texts.");
    if (skill === "writing") focus.push("Short writing cohesion with clearer connectors.");
  }
  while (focus.length < 3) {
    focus.push("Consistent sentence patterns in everyday contexts.");
  }

  return {
    done: true,
    decision: { stopExam: true, reason: "Fallback finalization due model unavailability or parse failure." },
    state,
    placement: {
      level,
      cefr_hint: cefr,
      confidence: clamp(Math.round((state.confidence + average) / 2), 0, 100),
      strengths: [
        "Shows engagement across varied question types.",
        "Maintains understandable intent in short responses.",
        "Can adapt when task format changes.",
      ],
      weaknesses: [
        "Needs stronger consistency under pressure.",
        "Requires cleaner sentence structure in longer answers.",
        "Needs broader lexical precision for context.",
      ],
      feedback: {
        corrected_version: "Keep answers concise, then add one supporting detail.",
        key_mistakes: [
          "Tense consistency across response parts.",
          "Natural collocations in context.",
          "Sentence linking for clearer flow.",
        ],
        natural_alternatives: [
          "Start with one simple sentence before extending.",
          "Reuse common phrases before advanced structures.",
        ],
        grammar_note: "Check subject-verb agreement and keep one tense per sentence.",
      },
      recommended_mode: state.skillScores.writing < 55 || state.skillScores.grammar < 55 ? "Text" : "Speak",
      recommended_scenarios:
        level === "Advanced"
          ? ["Job Interview", "Doctor Visit"]
          : level === "Intermediate"
            ? ["Airport", "Hotel Check-in"]
            : ["Ordering Food", "Hotel Check-in"],
    },
    focus_areas: [focus[0], focus[1], focus[2]],
    summary: {
      cyclesCompleted: clamp(state.cycle, 1, 5),
      skillScores: state.skillScores,
    },
  };
}

function fallbackStep({
  session,
  state,
  last,
}: {
  session: SessionRecord;
  state: PlacementState;
  last?: StepPayloadLast;
}): PlacementStepQuestionResponse | PlacementStepFinalResponse {
  let nextState = { ...state };
  let grading = {
    wasCorrect: true,
    scoreDelta: 0,
    notes: "Initial step generated.",
  };

  if (last) {
    const skill = last.question.skill;
    const expected = last.question.correctAnswer ? normalizeSimple(last.question.correctAnswer) : "";
    const received = normalizeSimple(last.userAnswer);
    const correct = last.question.type === "essay" ? received.length > 0 && received.split(" ").length >= 6 : expected.length > 0 && (received === expected || received.includes(expected));
    const delta = fallbackScoreDelta(last.question.difficulty, correct);
    const stabilityShift = Math.abs(delta) <= 9 ? 4 : -2;
    grading = {
      wasCorrect: correct,
      scoreDelta: delta,
      notes: correct ? "Answer aligned with expected target." : "Answer deviated from expected target.",
    };

    nextState = {
      ...nextState,
      difficulty: asDifficulty(correct ? Math.min(3, nextState.difficulty + 1) : Math.max(1, nextState.difficulty - 1)),
      confidence: clamp(nextState.confidence + delta, 0, 100),
      stability: clamp(nextState.stability + stabilityShift, 0, 100),
      skillScores: updateSkillScore(nextState.skillScores, skill, delta),
      historySummary: `${nextState.historySummary} | c${nextState.cycle}q${nextState.questionIndex}:${skill}:${correct ? "1" : "0"}`.trim().slice(-3000),
    };

    if (nextState.questionIndex === 6) {
      const shouldStopEarly = nextState.cycle >= 3 && nextState.confidence < 40 && nextState.stability < 45;
      const shouldStopAt4 = nextState.cycle === 4 && (nextState.confidence < 70 || nextState.stability < 65);
      const shouldStopAt5 = nextState.cycle >= 5;
      const stopExam = shouldStopEarly || shouldStopAt4 || shouldStopAt5;
      if (stopExam) {
        return buildFallbackFinal({ state: nextState, session });
      }
      nextState = { ...nextState, cycle: clamp(nextState.cycle + 1, 1, 5), questionIndex: 1 };
    } else {
      nextState = { ...nextState, questionIndex: clamp(nextState.questionIndex + 1, 1, 6) };
    }
  }

  const question = fallbackQuestion({
    sessionId: session.sessionId,
    state: nextState,
    targetLanguage: session.targetLanguage,
  });

  return {
    done: false,
    decision: {
      endCycle: nextState.questionIndex === 1 && state.questionIndex === 6,
      stopExam: false,
      reason: "Fallback next step due model unavailability or parse failure.",
    },
    state: nextState,
    grading,
    question,
  };
}

function validateQuestionTypeCoverage({
  session,
  state,
  question,
}: {
  session: SessionRecord;
  state: PlacementState;
  question: AdaptiveQuestion;
}): boolean {
  const cycle = clamp(state.cycle, 1, 5);
  const currentHistory = session.typeHistoryByCycle[cycle] ?? [];
  const nonEssayHistory = currentHistory.filter((type) => type !== "essay");
  if (state.questionIndex <= 5) {
    const withNext = [...nonEssayHistory, question.type].filter((type) => type !== "essay");
    if (state.questionIndex >= 5) {
      const unique = new Set(withNext);
      if (unique.size < 3) {
        return false;
      }
    }
  }
  if (state.questionIndex === 6 && question.type !== "essay") {
    return false;
  }
  if (state.questionIndex <= 5 && question.type === "essay") {
    return false;
  }
  return true;
}

function readQuestionsFromStartPayload(raw: unknown): [string, string, string] | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const questionsRaw = source.questions;
  if (!Array.isArray(questionsRaw)) return null;
  const questions = questionsRaw.filter((item): item is string => typeof item === "string").map((item) => item.trim()).slice(0, 3);
  return questions.length === 3 ? [questions[0], questions[1], questions[2]] : null;
}

function normalizeStepResponseOrNull(raw: unknown): PlacementStepQuestionResponse | PlacementStepFinalResponse | null {
  if (!validatePlacementStepResponse(raw)) return null;
  if (raw.done) {
    return {
      done: true,
      decision: {
        stopExam: true,
        reason: raw.decision.reason,
      },
      state: normalizePlacementState(raw.state),
      placement: {
        ...raw.placement,
        confidence: clamp(Math.round(raw.placement.confidence), 0, 100),
      },
      focus_areas: [raw.focus_areas[0], raw.focus_areas[1], raw.focus_areas[2]],
      summary: {
        cyclesCompleted: clamp(Math.round(raw.summary.cyclesCompleted), 0, 5),
        skillScores: {
          vocab: clamp(Math.round(raw.summary.skillScores.vocab), 0, 100),
          grammar: clamp(Math.round(raw.summary.skillScores.grammar), 0, 100),
          reading: clamp(Math.round(raw.summary.skillScores.reading), 0, 100),
          writing: clamp(Math.round(raw.summary.skillScores.writing), 0, 100),
        },
      },
    };
  }
  return {
    done: false,
    decision: {
      endCycle: !!raw.decision.endCycle,
      stopExam: !!raw.decision.stopExam,
      reason: raw.decision.reason,
    },
    state: normalizePlacementState(raw.state),
    grading: {
      wasCorrect: raw.grading.wasCorrect,
      scoreDelta: Math.round(raw.grading.scoreDelta),
      notes: raw.grading.notes,
    },
    question: raw.question,
  };
}

async function handleStart(raw: unknown): Promise<NextResponse<PlacementStartResponse>> {
  cleanupSessions();
  const body = parseStartRequest(raw);
  const apiKey = process.env.OPENAI_API_KEY;
  const session = getSession(undefined, body.uiLanguage, body.targetLanguage);
  const fallbackQuestions = fallbackInterviewQuestions(body.uiLanguage, body.targetLanguage);
  let interviewQuestions = fallbackQuestions;

  if (apiKey) {
    const parsed = await callOpenAI({
      apiKey,
      systemPrompt: buildPlacementSystemPrompt({
        mode: "start",
        uiLanguage: body.uiLanguage,
        targetLanguage: body.targetLanguage,
      }),
      userPrompt: buildPlacementUserPrompt({
        mode: "start",
        uiLanguage: body.uiLanguage,
        targetLanguage: body.targetLanguage,
      }),
    });
    const fromGPT = readQuestionsFromStartPayload(parsed);
    if (fromGPT) {
      interviewQuestions = fromGPT;
    }
  }

  session.uiLanguage = body.uiLanguage;
  session.targetLanguage = body.targetLanguage;
  session.interviewQuestions = interviewQuestions;
  session.interviewAnswers = [];
  session.typeHistoryByCycle = {};
  session.lastSeenAt = Date.now();

  return NextResponse.json({
    sessionId: session.sessionId,
    interview: {
      questions: interviewQuestions,
    },
    state: defaultPlacementState(),
  });
}

async function handleStep(raw: unknown): Promise<NextResponse<PlacementStepQuestionResponse | PlacementStepFinalResponse>> {
  cleanupSessions();
  const body = parseStepRequest(raw);
  const apiKey = process.env.OPENAI_API_KEY;
  const session = getSession(body.sessionId, body.uiLanguage, body.targetLanguage);
  session.uiLanguage = body.uiLanguage;
  session.targetLanguage = body.targetLanguage;
  session.lastSeenAt = Date.now();
  if (body.interviewAnswers && body.interviewAnswers.length > 0) {
    session.interviewAnswers = body.interviewAnswers;
  }
  const state = body.state ? normalizePlacementState(body.state) : defaultPlacementState();

  let result: PlacementStepQuestionResponse | PlacementStepFinalResponse | null = null;

  if (apiKey) {
    const currentTypes = (session.typeHistoryByCycle[state.cycle] ?? []).filter((type) => type !== "essay");
    const parsed = await callOpenAI({
      apiKey,
      systemPrompt: buildPlacementSystemPrompt({
        mode: "step",
        uiLanguage: session.uiLanguage,
        targetLanguage: session.targetLanguage,
      }),
      userPrompt: buildPlacementUserPrompt({
        mode: "step",
        sessionId: session.sessionId,
        uiLanguage: session.uiLanguage,
        targetLanguage: session.targetLanguage,
        interviewAnswers: session.interviewAnswers,
        state,
        last: body.last,
        historyHints: {
          nonEssayTypesInCurrentCycle: currentTypes,
          questionsAnsweredInCurrentCycle: currentTypes.length,
        },
      }),
    });
    const normalized = normalizeStepResponseOrNull(parsed);
    if (normalized) {
      if (!normalized.done) {
        if (normalized.state.cycle < 1 || normalized.state.cycle > 5) {
          result = null;
        } else if (!validateQuestionTypeCoverage({ session, state: normalized.state, question: normalized.question })) {
          result = null;
        } else if (normalized.decision.stopExam && normalized.state.cycle < 3) {
          result = null;
        } else {
          result = normalized;
        }
      } else {
        if (normalized.summary.cyclesCompleted < 3) {
          result = null;
        } else {
          result = normalized;
        }
      }
    }
  }

  if (!result) {
    result = fallbackStep({
      session,
      state,
      last: body.last,
    });
  }

  if (!result.done) {
    const cycle = result.state.cycle;
    session.typeHistoryByCycle[cycle] = [...(session.typeHistoryByCycle[cycle] ?? []), result.question.type].slice(-6);
    return NextResponse.json(result);
  }

  sessions.delete(session.sessionId);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    payload = { action: "start", uiLanguage: "en", targetLanguage: "English" };
  }

  const action =
    payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).action === "string"
      ? (payload as Record<string, unknown>).action
      : "start";

  if (action === "step") {
    return handleStep(payload);
  }
  return handleStart(payload);
}
