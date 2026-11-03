import React, { useState } from 'react';
import { User as UserIcon, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

export type DemandLevel = 'Low' | 'Medium' | 'High' | 'Very High';

const LEVELS: DemandLevel[] = ['Low', 'Medium', 'High', 'Very High'];

const LEVEL_COLORS: Record<DemandLevel, { text: string; bg: string; border: string; fill: string }> = {
  Low: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', fill: 'bg-emerald-400' },
  Medium: { text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', fill: 'bg-amber-400' },
  High: { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', fill: 'bg-orange-400' },
  'Very High': { text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', fill: 'bg-red-500' },
};

const COPY = {
  en: {
    meterLabel: 'Expected crowd level',
    segments: ['Low', 'Medium', 'High', 'Very High'] as DemandLevel[],
    meaningTitle: 'What this means for your trip',
    meaning: {
      Low: 'Quiet train. Plenty of seats — you can usually pick where to sit. Board any time before departure.',
      Medium: 'Moderate crowd. Seats are usually available, but popular coaches may start filling. Arrive about 10 minutes early.',
      High: 'Crowded. You may not get your preferred seat and some passengers may stand near the doors. Arrive 15–20 minutes early and book ahead.',
      'Very High': 'Packed, standing room only. Expect queues at the platform and limited seats. Strongly consider an earlier train or a different date — book immediately if you must travel.',
    } as Record<DemandLevel, string>,
    howTitle: 'How is this predicted?',
    howBody:
      'The system estimates passengers per train from historical ridership for this route, date and time using a machine-learning model. Levels: Low ≤ 50, Medium ≤ 100, High ≤ 250, Very High above 250 predicted passengers per train.',
    howDisclaimer: 'Predictions are estimates — real crowds can differ on the day.',
  },
  bm: {
    meterLabel: 'Jangkaan tahap kesesakan',
    segments: ['Rendah', 'Sederhana', 'Tinggi', 'Sangat Tinggi'] as unknown as DemandLevel[],
    meaningTitle: 'Maksudnya untuk perjalanan anda',
    meaning: {
      Low: 'Tren tenang. Banyak tempat duduk — anda biasanya boleh pilih tempat duduk. Naik bila-bila masa sebelum berlepas.',
      Medium: 'Kesederhanaan penumpang. Tempat duduk biasanya masih ada, tetapi gerabak popular mula penuh. Tiba lebih awal sekitar 10 minit.',
      High: 'Sesak. Anda mungkin tidak mendapat tempat duduk pilihan dan ada penumpang berdiri berhampiran pintu. Tiba 15–20 minit lebih awal dan tempah dahulu.',
      'Very High': 'Penuh sesak, berdiri sahaja. Jangkakan barisan di platform dan tempat duduk terhad. Pertimbangkan tren lebih awal atau tarikh lain — tempah segera jika perlu mengembara.',
    } as Record<DemandLevel, string>,
    howTitle: 'Bagaimana ini diramal?',
    howBody:
      'Sistem menganggarkan bilangan penumpang setiap tren daripada data ridership sejarah untuk laluan, tarikh dan masa ini menggunakan model pembelajaran mesin. Tahap: Rendah ≤ 50, Sederhana ≤ 100, Tinggi ≤ 250, Sangat Tinggi melebihi 250 penumpang diramal setiap tren.',
    howDisclaimer: 'Ramalan adalah anggaran — kesesakan sebenar mungkin berbeza pada hari tersebut.',
  },
} as const;

function levelIndex(level: DemandLevel): number {
  return LEVELS.indexOf(level);
}

interface DemandInsightProps {
  level: DemandLevel;
  predicted?: number;
  lang: 'en' | 'bm';
}

/**
 * Interactive demand-level explainer: animated 4-segment meter, a crowd strip
 * of person icons, a per-level "what this means for your trip" card, and an
 * expandable "how is this predicted?" note. Localised EN/BM.
 */
export default function DemandInsight({ level, predicted, lang }: DemandInsightProps) {
  const c = COPY[lang];
  const idx = levelIndex(level);
  const colors = LEVEL_COLORS[level];
  const [showHow, setShowHow] = useState(false);

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${colors.bg} ${colors.border}`} id="demand-insight">
      {/* Header row: label + level badge */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">{c.meterLabel}</p>
        <span className={`inline-flex items-center px-3 py-1 border text-xs font-extrabold rounded-full ${colors.bg} ${colors.text} ${colors.border}`}>
          {c.segments[idx]}
        </span>
      </div>

      {/* Animated 4-segment meter */}
      <div className="mt-3 flex gap-1.5" id="demand-meter" role="img" aria-label={c.segments[idx] as string}>
        {LEVELS.map((l, i) => (
          <div key={l} className="flex-1">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${
                i <= idx ? colors.fill : 'bg-slate-200'
              } ${i === idx ? 'animate-pulse' : ''}`}
            />
            <p className={`mt-1 text-center text-[9px] font-extrabold uppercase tracking-wide ${
              i === idx ? colors.text : 'text-slate-400'
            }`}>
              {c.segments[i]}
            </p>
          </div>
        ))}
      </div>

      {/* Crowd strip: 4 person icons fill with the level */}
      <div className="mt-3 flex items-center gap-1.5" id="demand-crowd-strip">
        {LEVELS.map((l, i) => (
          <UserIcon
            key={l}
            className={`h-5 w-5 transition-colors duration-500 ${i <= idx ? colors.text : 'text-slate-300'}`}
            fill={i <= idx ? 'currentColor' : 'none'}
            fillOpacity={i <= idx ? 0.25 : 0}
          />
        ))}
        {typeof predicted === 'number' && (
          <span className="ml-1 text-[11px] font-bold text-slate-600 font-mono">
            ≈ {predicted} {lang === 'bm' ? 'penumpang/tren' : 'passengers/train'}
          </span>
        )}
      </div>

      {/* What this means */}
      <div className="mt-3 rounded-xl bg-white/70 border border-white/80 p-3">
        <p className={`text-[10px] font-extrabold uppercase tracking-widest ${colors.text}`}>{c.meaningTitle}</p>
        <p className="text-xs text-slate-700 mt-1 leading-relaxed">{c.meaning[level]}</p>
      </div>

      {/* How is this predicted? */}
      <button
        type="button"
        onClick={() => setShowHow(!showHow)}
        className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
        id="demand-how-toggle"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        {c.howTitle}
        {showHow ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {showHow && (
        <div className="mt-2 rounded-xl bg-white/70 border border-white/80 p-3" id="demand-how-panel">
          <p className="text-[11px] text-slate-600 leading-relaxed">{c.howBody}</p>
          <p className="text-[10px] text-slate-400 mt-1.5 italic">{c.howDisclaimer}</p>
        </div>
      )}
    </div>
  );
}
