import type { QuizLanguageCode, QuizPackMap, QuizQuestion } from "@/types/quiz";

const ENGLISH_VOCAB_PACK: QuizQuestion[] = [
  {
    id: "en-vocab-1",
    languageCode: "en",
    prompt: 'Choose the closest meaning of "tiny".',
    options: [
      { id: "a", text: "Very small" },
      { id: "b", text: "Very noisy" },
      { id: "c", text: "Very expensive" },
      { id: "d", text: "Very slow" },
    ],
    correctOptionId: "a",
    explanation: '"Tiny" means very small.',
  },
  {
    id: "en-vocab-2",
    languageCode: "en",
    prompt: 'Pick the best synonym for "purchase".',
    options: [
      { id: "a", text: "Borrow" },
      { id: "b", text: "Buy" },
      { id: "c", text: "Sell" },
      { id: "d", text: "Hide" },
    ],
    correctOptionId: "b",
    explanation: '"Purchase" means to buy.',
  },
  {
    id: "en-vocab-3",
    languageCode: "en",
    prompt: 'Choose the opposite of "noisy".',
    options: [
      { id: "a", text: "Quiet" },
      { id: "b", text: "Crowded" },
      { id: "c", text: "Bright" },
      { id: "d", text: "Dirty" },
    ],
    correctOptionId: "a",
    explanation: '"Quiet" is the opposite of "noisy".',
  },
  {
    id: "en-vocab-4",
    languageCode: "en",
    prompt: 'What does "crowded" usually mean?',
    options: [
      { id: "a", text: "Very clean" },
      { id: "b", text: "Full of people" },
      { id: "c", text: "Easy to understand" },
      { id: "d", text: "Far away" },
    ],
    correctOptionId: "b",
    explanation: '"Crowded" means there are many people in one place.',
  },
  {
    id: "en-vocab-5",
    languageCode: "en",
    prompt: 'Choose the closest meaning of "arrive".',
    options: [
      { id: "a", text: "Leave quickly" },
      { id: "b", text: "Reach a place" },
      { id: "c", text: "Cook dinner" },
      { id: "d", text: "Wait outside" },
    ],
    correctOptionId: "b",
    explanation: '"Arrive" means to reach a destination.',
  },
  {
    id: "en-vocab-6",
    languageCode: "en",
    prompt: 'If you "borrow" a book, you...',
    options: [
      { id: "a", text: "Take it and return it later" },
      { id: "b", text: "Buy it online" },
      { id: "c", text: "Throw it away" },
      { id: "d", text: "Translate it" },
    ],
    correctOptionId: "a",
    explanation: '"Borrow" means taking something for temporary use and returning it later.',
  },
  {
    id: "en-vocab-7",
    languageCode: "en",
    prompt: 'Pick the best synonym for "begin".',
    options: [
      { id: "a", text: "Finish" },
      { id: "b", text: "Start" },
      { id: "c", text: "Delay" },
      { id: "d", text: "Ignore" },
    ],
    correctOptionId: "b",
    explanation: '"Begin" and "start" have the same meaning.',
  },
  {
    id: "en-vocab-8",
    languageCode: "en",
    prompt: 'Choose the opposite of "cheap".',
    options: [
      { id: "a", text: "Old" },
      { id: "b", text: "Heavy" },
      { id: "c", text: "Expensive" },
      { id: "d", text: "Small" },
    ],
    correctOptionId: "c",
    explanation: '"Expensive" is the opposite of "cheap".',
  },
  {
    id: "en-vocab-9",
    languageCode: "en",
    prompt: 'Who are your "neighbors"?',
    options: [
      { id: "a", text: "People living near you" },
      { id: "b", text: "People in your class only" },
      { id: "c", text: "Your close family" },
      { id: "d", text: "People at the airport" },
    ],
    correctOptionId: "a",
    explanation: 'Neighbors are people who live close to your home.',
  },
  {
    id: "en-vocab-10",
    languageCode: "en",
    prompt: 'To "schedule" a meeting means to...',
    options: [
      { id: "a", text: "Cancel it forever" },
      { id: "b", text: "Plan a time for it" },
      { id: "c", text: "Move to another city" },
      { id: "d", text: "Forget it" },
    ],
    correctOptionId: "b",
    explanation: '"Schedule" means to arrange a time.',
  },
  {
    id: "en-vocab-11",
    languageCode: "en",
    prompt: 'Complete the sentence: "Please ___ the door."',
    options: [
      { id: "a", text: "close" },
      { id: "b", text: "climb" },
      { id: "c", text: "paint" },
      { id: "d", text: "borrow" },
    ],
    correctOptionId: "a",
    explanation: 'The natural phrase is "close the door".',
  },
  {
    id: "en-vocab-12",
    languageCode: "en",
    prompt: 'Choose the best synonym for "helpful".',
    options: [
      { id: "a", text: "Supportive" },
      { id: "b", text: "Dangerous" },
      { id: "c", text: "Silent" },
      { id: "d", text: "Temporary" },
    ],
    correctOptionId: "a",
    explanation: '"Supportive" is closest in meaning to "helpful".',
  },
];

export const quizPacksByLanguage: QuizPackMap = {
  en: ENGLISH_VOCAB_PACK,
};

const FALLBACK_LANGUAGE: QuizLanguageCode = "en";

export function getQuizPack(languageCode: string): QuizQuestion[] {
  const normalizedLanguage = languageCode.toLowerCase() as QuizLanguageCode;
  const pack = quizPacksByLanguage[normalizedLanguage] ?? quizPacksByLanguage[FALLBACK_LANGUAGE];

  return pack.map((question) => ({
    ...question,
    options: question.options.map((option) => ({ ...option })),
  }));
}
