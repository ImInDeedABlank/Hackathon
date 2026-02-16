import crypto from "node:crypto";

import { NextResponse } from "next/server";

import {
  asDifficulty,
  asTargetLanguage,
  asUILanguage,
  clamp,
  defaultPlacementState,
  MAX_PLACEMENT_CYCLES,
  QUESTIONS_PER_CYCLE,
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
import {
  callGeminiJson,
  defaultGeminiDebugInfo,
  isDiagnosticRequest,
  requestIdFromRequest,
  type GeminiDebugInfo,
} from "@/lib/geminiClient";
import { buildPlacementSystemPrompt, buildPlacementUserPrompt } from "@/lib/placementPrompt";
const SESSION_TTL_MS = 1000 * 60 * 90;
const MIN_CYCLES_BEFORE_CONFIDENT_STOP = 2;

type SessionRecord = {
  sessionId: string;
  uiLanguage: UILanguage;
  targetLanguage: TargetLanguage;
  interviewQuestions: [string, string, string];
  interviewAnswers: InterviewAnswer[];
  lastSeenAt: number;
};

const sessions = new Map<string, SessionRecord>();

const TYPE_PLAN_BY_CYCLE: Record<number, QuestionType[]> = {
  1: ["mcq", "fill", "short", "reorder", "mcq"],
  2: ["fill", "reorder", "mcq", "short", "fill"],
  3: ["short", "mcq", "reorder", "fill", "short"],
  4: ["reorder", "short", "mcq", "fill", "reorder"],
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
  if (lastRaw) {
    const cycle =
      typeof lastRaw.cycle === "number" ? clamp(Math.round(lastRaw.cycle), 1, MAX_PLACEMENT_CYCLES) : null;
    const questionsRaw = Array.isArray(lastRaw.questions) ? lastRaw.questions : null;
    const answersRaw = Array.isArray(lastRaw.answers) ? lastRaw.answers : null;

    const hasValidQuestions =
      questionsRaw !== null &&
      questionsRaw.length === QUESTIONS_PER_CYCLE &&
      questionsRaw.every((item) => validateAdaptiveQuestion(item) && item.type !== "essay");
    const hasValidAnswers =
      answersRaw !== null &&
      answersRaw.length === QUESTIONS_PER_CYCLE &&
      answersRaw.every((item) => typeof item === "string");

    if (cycle !== null && hasValidQuestions && hasValidAnswers) {
      last = {
        cycle,
        questions: questionsRaw as AdaptiveQuestion[],
        answers: answersRaw.map((item) => item.trim()),
      };
    }
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

function cycleTypePlan(cycle: number): QuestionType[] {
  const clampedCycle = clamp(cycle, 1, MAX_PLACEMENT_CYCLES);
  const fallbackPlan = TYPE_PLAN_BY_CYCLE[1];
  return (TYPE_PLAN_BY_CYCLE[clampedCycle] ?? fallbackPlan).slice(0, QUESTIONS_PER_CYCLE);
}

function skillForQuestionType(type: QuestionType): Skill {
  if (type === "mcq") return "vocab";
  if (type === "fill" || type === "reorder") return "grammar";
  return "reading";
}

function fallbackCycleQuestions({
  sessionId,
  state,
  targetLanguage,
}: {
  sessionId: string;
  state: PlacementState;
  targetLanguage: TargetLanguage;
}): AdaptiveQuestion[] {
  const plan = cycleTypePlan(state.cycle);
  return plan.map((type, index) => {
    const entry = fallbackEntry(targetLanguage, type, state.difficulty, state.cycle + index + 1);
    const question: AdaptiveQuestion = {
      id: `fallback-${sessionId}-c${state.cycle}-q${index + 1}-${type}`,
      type,
      difficulty: state.difficulty,
      skill: skillForQuestionType(type),
      prompt: entry.prompt,
    };

    if (type === "mcq" && entry.choices && entry.correctAnswer) {
      question.choices = [...entry.choices];
      question.correctAnswer = entry.correctAnswer;
    } else if (entry.correctAnswer) {
      question.correctAnswer = entry.correctAnswer;
    }

    return question;
  });
}

function normalizeSimple(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?؟؛:()[\]{}"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackScoreDelta(difficulty: Difficulty, correct: boolean): number {
  const base = difficulty === 1 ? 4 : difficulty === 2 ? 6 : 8;
  return correct ? base : -base;
}

function fallbackSkillDelta(difficulty: Difficulty, correct: boolean): number {
  const base = difficulty === 1 ? 3 : difficulty === 2 ? 4 : 5;
  return correct ? base : -base;
}

function updateSkillScore(scores: SkillScores, skill: Skill, delta: number): SkillScores {
  return {
    ...scores,
    [skill]: clamp(scores[skill] + delta, 0, 100),
  };
}

function evaluateFallbackQuestion(question: AdaptiveQuestion, answer: string): { correct: boolean; delta: number } {
  const received = normalizeSimple(answer);
  const expected = question.correctAnswer ? normalizeSimple(question.correctAnswer) : "";
  if (!received) {
    return { correct: false, delta: fallbackScoreDelta(question.difficulty, false) };
  }
  if (!expected) {
    return { correct: true, delta: fallbackScoreDelta(question.difficulty, true) };
  }

  let correct = false;
  if (question.type === "short") {
    correct = received === expected || received.includes(expected) || expected.includes(received);
  } else {
    correct = received === expected;
  }

  return {
    correct,
    delta: fallbackScoreDelta(question.difficulty, correct),
  };
}

function shouldFallbackStopAfterCycle({
  state,
  grading,
}: {
  state: PlacementState;
  grading: PlacementStepQuestionResponse["grading"];
}): boolean {
  if (state.cycle >= MAX_PLACEMENT_CYCLES) {
    return true;
  }
  if (state.cycle < MIN_CYCLES_BEFORE_CONFIDENT_STOP) {
    return false;
  }

  const highConfidence = state.confidence >= 78 && state.stability >= 65;
  const stablePlateau = Math.abs(grading.scoreDelta) <= 6 && state.stability >= 70;
  const lowerBandClear = state.cycle >= 3 && state.confidence <= 35 && state.stability >= 55;
  return highConfidence || stablePlateau || lowerBandClear;
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
      cyclesCompleted: clamp(state.cycle, 1, MAX_PLACEMENT_CYCLES),
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
  if (!last) {
    return {
      done: false,
      decision: {
        endCycle: false,
        stopExam: false,
        reason: "Fallback initial cycle generation.",
      },
      state,
      grading: {
        cycleAverage: 0,
        scoreDelta: 0,
        notes: "Initial cycle generated.",
      },
      questions: fallbackCycleQuestions({
        sessionId: session.sessionId,
        state,
        targetLanguage: session.targetLanguage,
      }),
    };
  }

  const answers = last.answers.slice(0, QUESTIONS_PER_CYCLE);
  const questions = last.questions.slice(0, QUESTIONS_PER_CYCLE);
  let scoreDelta = 0;
  let correctCount = 0;
  let nextSkillScores = { ...state.skillScores };

  for (let index = 0; index < QUESTIONS_PER_CYCLE; index += 1) {
    const question = questions[index];
    const answer = answers[index] ?? "";
    const evaluation = evaluateFallbackQuestion(question, answer);
    if (evaluation.correct) {
      correctCount += 1;
    }
    scoreDelta += evaluation.delta;
    nextSkillScores = updateSkillScore(
      nextSkillScores,
      question.skill,
      fallbackSkillDelta(question.difficulty, evaluation.correct),
    );
  }

  const cycleAverage = clamp(Math.round((correctCount / QUESTIONS_PER_CYCLE) * 100), 0, 100);
  const stabilityShift = cycleAverage >= 75 ? 6 : cycleAverage >= 45 ? 2 : -5;
  const nextDifficulty = asDifficulty(
    cycleAverage >= 75
      ? Math.min(3, state.difficulty + 1)
      : cycleAverage <= 45
        ? Math.max(1, state.difficulty - 1)
        : state.difficulty,
  );

  const evaluatedState: PlacementState = {
    ...state,
    difficulty: nextDifficulty,
    confidence: clamp(state.confidence + Math.round(scoreDelta / 2), 0, 100),
    stability: clamp(state.stability + stabilityShift, 0, 100),
    skillScores: nextSkillScores,
    historySummary: `${state.historySummary} | c${state.cycle}:${correctCount}/${QUESTIONS_PER_CYCLE}:d${state.difficulty}`
      .trim()
      .slice(-3000),
  };

  const grading: PlacementStepQuestionResponse["grading"] = {
    cycleAverage,
    scoreDelta,
    notes:
      cycleAverage >= 75
        ? "Strong cycle performance."
        : cycleAverage >= 45
          ? "Mixed cycle performance."
          : "Cycle needs reinforcement before advancing difficulty.",
  };

  if (shouldFallbackStopAfterCycle({ state: evaluatedState, grading })) {
    return buildFallbackFinal({ state: evaluatedState, session });
  }

  const nextState: PlacementState = {
    ...evaluatedState,
    cycle: clamp(state.cycle + 1, 1, MAX_PLACEMENT_CYCLES),
  };

  return {
    done: false,
    decision: {
      endCycle: true,
      stopExam: false,
      reason: "Fallback generated next cycle.",
    },
    state: nextState,
    grading,
    questions: fallbackCycleQuestions({
      sessionId: session.sessionId,
      state: nextState,
      targetLanguage: session.targetLanguage,
    }),
  };
}

function validateCycleQuestionSet(questions: AdaptiveQuestion[]): boolean {
  if (questions.length !== QUESTIONS_PER_CYCLE) {
    return false;
  }
  if (!questions.every((question) => validateAdaptiveQuestion(question) && question.type !== "essay")) {
    return false;
  }
  const uniqueTypes = new Set(questions.map((question) => question.type));
  return uniqueTypes.size >= 3;
}

function readQuestionsFromStartPayload(raw: unknown): [string, string, string] | null {
  if (!raw || typeof raw !== "object") return null;
  const source = raw as Record<string, unknown>;
  const questionsRaw = source.questions;
  if (!Array.isArray(questionsRaw)) return null;
  const questions = questionsRaw.filter((item): item is string => typeof item === "string").map((item) => item.trim()).slice(0, 3);
  return questions.length === 3 ? [questions[0], questions[1], questions[2]] : null;
}

function coerceStepResponseRaw(raw: unknown): unknown {
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return coerceStepResponseRaw(parsed);
    } catch {
      return raw;
    }
  }

  if (!raw || typeof raw !== "object") {
    return raw;
  }

  const source = structuredClone(raw as Record<string, unknown>) as Record<string, unknown>;
  if (source.done !== false) {
    const decision = source.decision && typeof source.decision === "object" ? (source.decision as Record<string, unknown>) : {};
    if (typeof decision.reason !== "string") {
      decision.reason = "";
    }
    decision.stopExam = true;
    source.decision = decision;
    if (!source.state || typeof source.state !== "object") {
      source.state = defaultPlacementState();
    }
    return source;
  }

  const decision = source.decision && typeof source.decision === "object" ? (source.decision as Record<string, unknown>) : {};
  if (typeof decision.reason !== "string") {
    decision.reason = "";
  }
  decision.stopExam = false;
  if ("endCycle" in decision && typeof decision.endCycle !== "boolean") {
    decision.endCycle = false;
  }
  source.decision = decision;

  if (!source.state || typeof source.state !== "object") {
    source.state = defaultPlacementState();
  }

  const grading = source.grading && typeof source.grading === "object" ? (source.grading as Record<string, unknown>) : null;
  if (!grading) {
    source.grading = {
      cycleAverage: 0,
      scoreDelta: 0,
      notes: "Auto-normalized grading note.",
    };
  } else {
    if (typeof grading.cycleAverage !== "number" || Number.isNaN(grading.cycleAverage) || !Number.isFinite(grading.cycleAverage)) {
      grading.cycleAverage = 0;
    }
    if (typeof grading.scoreDelta !== "number" || Number.isNaN(grading.scoreDelta) || !Number.isFinite(grading.scoreDelta)) {
      grading.scoreDelta = 0;
    }
    if (typeof grading.notes !== "string") {
      grading.notes = "Auto-normalized grading note.";
    }
    source.grading = grading;
  }

  if (!Array.isArray(source.questions)) {
    source.questions = [];
  }
  return source;
}

function normalizeStepResponseOrNull(raw: unknown): PlacementStepQuestionResponse | PlacementStepFinalResponse | null {
  const coerced = coerceStepResponseRaw(raw);
  const issues: string[] = [];
  if (!validatePlacementStepResponse(coerced, issues)) {
    console.error(
      `[api/placement] validatePlacementStepResponse failed reason="${issues[0] ?? "unknown"}" payload="${JSON.stringify(coerced).slice(0, 2000)}"`,
    );
    return null;
  }
  const normalizedRaw = coerced;
  if (normalizedRaw.done) {
    return {
      done: true,
      decision: {
        stopExam: true,
        reason: normalizedRaw.decision.reason,
      },
      state: normalizePlacementState(normalizedRaw.state),
      placement: {
        ...normalizedRaw.placement,
        confidence: clamp(Math.round(normalizedRaw.placement.confidence), 0, 100),
      },
      focus_areas: [normalizedRaw.focus_areas[0], normalizedRaw.focus_areas[1], normalizedRaw.focus_areas[2]],
      summary: {
        cyclesCompleted: clamp(Math.round(normalizedRaw.summary.cyclesCompleted), 0, MAX_PLACEMENT_CYCLES),
        skillScores: {
          vocab: clamp(Math.round(normalizedRaw.summary.skillScores.vocab), 0, 100),
          grammar: clamp(Math.round(normalizedRaw.summary.skillScores.grammar), 0, 100),
          reading: clamp(Math.round(normalizedRaw.summary.skillScores.reading), 0, 100),
          writing: clamp(Math.round(normalizedRaw.summary.skillScores.writing), 0, 100),
        },
      },
    };
  }
  return {
    done: false,
    decision: {
      endCycle: !!normalizedRaw.decision.endCycle,
      stopExam: false,
      reason: normalizedRaw.decision.reason,
    },
    state: normalizePlacementState(normalizedRaw.state),
    grading: {
      cycleAverage: clamp(Math.round(normalizedRaw.grading.cycleAverage), 0, 100),
      scoreDelta: Math.round(normalizedRaw.grading.scoreDelta),
      notes: normalizedRaw.grading.notes,
    },
    questions: normalizedRaw.questions.slice(0, QUESTIONS_PER_CYCLE),
  };
}

function withPlacementDebug<T extends object>(
  body: T,
  {
    diagnostic,
    debug,
    error,
  }: {
    diagnostic: boolean;
    debug?: GeminiDebugInfo;
    error?: string;
  },
): T & { debug?: GeminiDebugInfo; error?: string } {
  if (!diagnostic && !error) {
    return body;
  }
  return {
    ...body,
    ...(error ? { error } : {}),
    ...(diagnostic ? { debug: debug ?? defaultGeminiDebugInfo() } : {}),
  };
}

async function handleStart(raw: unknown, diagnostic: boolean, requestId: string): Promise<NextResponse> {
  cleanupSessions();
  const body = parseStartRequest(raw);
  const session = getSession(undefined, body.uiLanguage, body.targetLanguage);
  const fallbackQuestions = fallbackInterviewQuestions(body.uiLanguage, body.targetLanguage);
  let interviewQuestions = fallbackQuestions;
  const fallbackStatus = 200;
  let fallbackError: string | undefined;

  const startSystemPrompt = buildPlacementSystemPrompt({
    mode: "start",
    uiLanguage: body.uiLanguage,
    targetLanguage: body.targetLanguage,
  });
  const startUserPrompt = buildPlacementUserPrompt({
    mode: "start",
    uiLanguage: body.uiLanguage,
    targetLanguage: body.targetLanguage,
  });

  const gemini = await callGeminiJson<unknown>({
    routeName: "api/placement:start",
    requestId,
    prompt: `System Prompt:\n${startSystemPrompt}\n\nUser Input:\n${startUserPrompt}`,
    schema: '{"questions":["string","string","string"]}',
    singleFlightParts: {
      language: body.targetLanguage,
      mode: "placement_start",
      stepId: "start",
    },
  });

  const debug: GeminiDebugInfo = gemini.debug;

  if (gemini.ok) {
    const fromGemini = readQuestionsFromStartPayload(gemini.data);
    if (fromGemini) {
      interviewQuestions = fromGemini;
    } else {
      fallbackError = "Gemini returned invalid start questions. Using fallback interview questions.";
      console.warn("[api/placement:start] Using fallback reason=invalid_model_shape");
    }
  } else {
    console.warn(`[api/placement:start] Using fallback reason=${gemini.reason}`);
    if (gemini.reason !== "missing_key") {
      fallbackError = `Gemini start call failed (${gemini.reason}). Using fallback interview questions.`;
    }
  }

  session.uiLanguage = body.uiLanguage;
  session.targetLanguage = body.targetLanguage;
  session.interviewQuestions = interviewQuestions;
  session.interviewAnswers = [];
  session.lastSeenAt = Date.now();

  const responseBody: PlacementStartResponse = {
    sessionId: session.sessionId,
    interview: {
      questions: interviewQuestions,
    },
    state: defaultPlacementState(),
  };

  return NextResponse.json(
    withPlacementDebug(responseBody, {
      diagnostic,
      debug,
      error: fallbackError,
    }),
    { status: fallbackStatus },
  );
}

async function handleStep(raw: unknown, diagnostic: boolean, requestId: string): Promise<NextResponse> {
  cleanupSessions();
  const body = parseStepRequest(raw);
  const session = getSession(body.sessionId, body.uiLanguage, body.targetLanguage);
  session.uiLanguage = body.uiLanguage;
  session.targetLanguage = body.targetLanguage;
  session.lastSeenAt = Date.now();
  if (body.interviewAnswers && body.interviewAnswers.length > 0) {
    session.interviewAnswers = body.interviewAnswers;
  }
  const state = body.state ? normalizePlacementState(body.state) : defaultPlacementState();

  let result: PlacementStepQuestionResponse | PlacementStepFinalResponse | null = null;
  const fallbackStatus = 200;
  let fallbackError: string | undefined;
  let fallbackReason: string | null = null;

  const stepSystemPrompt = buildPlacementSystemPrompt({
    mode: "step",
    uiLanguage: session.uiLanguage,
    targetLanguage: session.targetLanguage,
  });
  const stepUserPrompt = buildPlacementUserPrompt({
    mode: "step",
    sessionId: session.sessionId,
    uiLanguage: session.uiLanguage,
    targetLanguage: session.targetLanguage,
    interviewAnswers: session.interviewAnswers,
    state,
    last: body.last,
  });

  const gemini = await callGeminiJson<unknown>({
    routeName: "api/placement:step",
    requestId,
    prompt: `System Prompt:\n${stepSystemPrompt}\n\nUser Input:\n${stepUserPrompt}`,
    schema:
      '{"done":false,"decision":{"endCycle":false,"stopExam":false,"reason":"string"},"state":{"cycle":1,"questionIndex":1,"difficulty":1,"confidence":0,"stability":0,"skillScores":{"vocab":0,"grammar":0,"reading":0,"writing":0},"historySummary":"string"},"grading":{"cycleAverage":0,"scoreDelta":0,"notes":"string"},"questions":[]}',
    singleFlightParts: {
      language: session.targetLanguage,
      mode: "placement_step",
      stepId: body.last ? `cycle-${state.cycle}` : "initial",
    },
  });

  const debug: GeminiDebugInfo = gemini.debug;

  if (gemini.ok) {
    const normalized = normalizeStepResponseOrNull(gemini.data);
    if (normalized) {
      if (!normalized.done) {
        if (!validateCycleQuestionSet(normalized.questions)) {
          fallbackReason = "invalid_question_set";
        } else if (normalized.state.cycle < 1 || normalized.state.cycle > MAX_PLACEMENT_CYCLES) {
          fallbackReason = "invalid_cycle";
        } else if (!body.last && normalized.state.cycle !== state.cycle) {
          fallbackReason = "invalid_initial_cycle";
        } else if (body.last && normalized.state.cycle <= state.cycle) {
          fallbackReason = "cycle_not_advanced";
        } else {
          result = normalized;
        }
      } else {
        const minCompletedCycles = body.last ? state.cycle : 0;
        if (normalized.summary.cyclesCompleted < minCompletedCycles) {
          fallbackReason = "cycles_completed_too_low";
        } else {
          result = normalized;
        }
      }
    } else {
      fallbackReason = "invalid_model_shape";
      console.error(
        `[api/placement:step] Invalid model payload raw="${JSON.stringify(gemini.data).slice(0, 2000)}"`,
      );
    }
    if (fallbackReason) {
      fallbackError = `Gemini step output was invalid (${fallbackReason}). Using fallback step logic.`;
      console.warn(`[api/placement:step] Using fallback reason=${fallbackReason}`);
    }
  } else {
    fallbackReason = gemini.reason;
    console.warn(`[api/placement:step] Using fallback reason=${gemini.reason}`);
    if (gemini.reason !== "missing_key") {
      fallbackError = `Gemini step call failed (${gemini.reason}). Using fallback step logic.`;
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
    return NextResponse.json(
      withPlacementDebug(result, {
        diagnostic,
        debug,
        error: fallbackError,
      }),
      { status: fallbackStatus },
    );
  }

  sessions.delete(session.sessionId);
  return NextResponse.json(
    withPlacementDebug(result, {
      diagnostic,
      debug,
      error: fallbackError,
    }),
    { status: fallbackStatus },
  );
}

export async function POST(request: Request) {
  const diagnostic = isDiagnosticRequest(request);
  const requestId = requestIdFromRequest(request);
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    console.warn("[api/placement] Received invalid request JSON; defaulting to start payload.");
    payload = { action: "start", uiLanguage: "en", targetLanguage: "English" };
  }

  const action =
    payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).action === "string"
      ? (payload as Record<string, unknown>).action
      : "start";

  if (action === "step") {
    return handleStep(payload, diagnostic, requestId);
  }
  return handleStart(payload, diagnostic, requestId);
}
