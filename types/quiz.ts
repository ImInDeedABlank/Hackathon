export type QuizLanguageCode = "en";

export type QuizOption = {
  id: string;
  text: string;
};

export type QuizQuestion = {
  id: string;
  languageCode: QuizLanguageCode;
  prompt: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation?: string;
};

export type QuizPackMap = Record<QuizLanguageCode, QuizQuestion[]>;
