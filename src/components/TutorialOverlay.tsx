import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';

export interface TutorialStep {
  targetId: string;
  title: string;
  body: string;
  bmTitle?: string;
  bmBody?: string;
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  onClose: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;

export default function TutorialOverlay({ steps, onClose }: TutorialOverlayProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const current = steps[index];

  const isBm = typeof window !== 'undefined' && window.location.pathname.startsWith('/bm');

  const measure = useCallback(() => {
    if (!current) return;
    const el = document.getElementById(current.targetId);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [current]);

  useEffect(() => {
    // Wait a frame so conditional layouts settle before measuring
    const id = window.requestAnimationFrame(() => measure());
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, steps.length - 1));
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, steps.length]);

  if (!current) return null;

  const isLast = index === steps.length - 1;

  // Spotlight cutout via four dimmed + blurred rectangles
  const hole = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        right: rect.left + rect.width + PAD,
        bottom: rect.top + rect.height + PAD,
      }
    : null;

  const rectStyle = 'fixed z-[100] bg-slate-900/65 backdrop-blur-[3px]';

  // Tooltip placement: below the target when there's room, otherwise above
  let tooltipStyle: React.CSSProperties;
  if (rect) {
    const spaceBelow = window.innerHeight - (rect.top + rect.height);
    const placeBelow = spaceBelow > 220;
    const top = placeBelow ? rect.top + rect.height + PAD + 12 : Math.max(16, rect.top - 200 - PAD);
    tooltipStyle = {
      top,
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 360 - 16)),
      position: 'fixed',
    };
  } else {
    tooltipStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      position: 'fixed',
    };
  }

  return (
    <div className="fixed inset-0 z-[100]" id="tutorial-overlay">
      {hole ? (
        <>
          <div className={rectStyle} style={{ top: 0, left: 0, right: 0, height: Math.max(0, hole.top) }} />
          <div className={rectStyle} style={{ top: hole.bottom, left: 0, right: 0, bottom: 0 }} />
          <div className={rectStyle} style={{ top: hole.top, left: 0, width: Math.max(0, hole.left), height: hole.bottom - hole.top }} />
          <div className={rectStyle} style={{ top: hole.top, left: hole.right, right: 0, height: hole.bottom - hole.top }} />
          <div
            className="fixed z-[101] rounded-xl ring-4 ring-indigo-500 ring-offset-2 ring-offset-transparent pointer-events-none"
            style={{ top: hole.top, left: hole.left, width: hole.right - hole.left, height: hole.bottom - hole.top }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-[3px]" />
      )}

      {/* Tooltip card */}
      <div
        className="z-[102] w-[340px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 animate-scale-up"
        style={tooltipStyle}
        id="tutorial-tooltip"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
            {`Step ${index + 1} / ${steps.length}`}
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition cursor-pointer"
            aria-label="Close tutorial"
            id="tutorial-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="font-display font-extrabold text-slate-900 text-base leading-snug">{(isBm && current.bmTitle) ? current.bmTitle : current.title}</h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{(isBm && current.bmBody) ? current.bmBody : current.body}</p>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition cursor-pointer"
            id="tutorial-skip"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold transition cursor-pointer"
                id="tutorial-back"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
            <button
              onClick={() => (isLast ? onClose() : setIndex((i) => Math.min(i + 1, steps.length - 1)))}
              className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
              id="tutorial-next"
            >
              {isLast ? 'Finish' : 'Next'}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
