"use client";

import { useLanguage } from "@/components/LanguageProvider";
import ProgressBar from "@/app/components/ProgressBar";

type QuizProgressProps = {
  current: number;
  total: number;
};

export default function QuizProgress({ current, total }: QuizProgressProps) {
  const { lang } = useLanguage();
  const isRtl = lang === "ar";
  const safeTotal = total > 0 ? total : 1;
  const percentCompleted = Math.round((current / safeTotal) * 100);

  return (
    <section className={`theme-panel-soft rounded-2xl p-4 sm:p-5 ${isRtl ? "text-right" : "text-left"}`}>
      <div className="flex items-center justify-between gap-3 text-xs font-medium">
        <p className="theme-muted">Quiz Progress</p>
        <p className="text-slate-900">{percentCompleted}% completed</p>
      </div>
      <div className="mt-3">
        <ProgressBar current={current} total={total} label="Vocabulary quiz progress" />
      </div>
    </section>
  );
}
