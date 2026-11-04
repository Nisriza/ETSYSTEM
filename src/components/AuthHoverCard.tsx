import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

export type AuthMode = 'signin' | 'register';

interface AuthHoverCardProps {
  mode: AuthMode;
  lang: 'en' | 'bm';
  onSelect: () => void;
  /** Extra classes for the trigger button. */
  className?: string;
  /** Which edge the preview aligns to. */
  align?: 'left' | 'right';
  children: React.ReactNode;
}

const COPY = {
  signin: {
    en: {
      eyebrow: 'Passenger access',
      title: 'Welcome back',
      intro: 'Your saved journeys and search history are waiting.',
      bullets: [
        'Forecasts by route, date and hour',
        'Reopen trips you saved earlier',
        'Keep your crowd feedback together',
      ],
      cta: 'Continue to sign in',
      note: 'Google, username or guest access',
      image: '/images/ets/ets-kuala-lumpur.jpg',
      imageAlt: 'An ETS train at Kuala Lumpur station',
    },
    bm: {
      eyebrow: 'Akses penumpang',
      title: 'Selamat kembali',
      intro: 'Perjalanan yang disimpan dan sejarah carian anda menanti.',
      bullets: [
        'Ramalan mengikut laluan, tarikh dan jam',
        'Buka semula perjalanan yang disimpan',
        'Simpan maklum balas kesesakan anda',
      ],
      cta: 'Teruskan ke log masuk',
      note: 'Google, nama pengguna atau akses tetamu',
      image: '/images/ets/ets-kuala-lumpur.jpg',
      imageAlt: 'Kereta api ETS di stesen Kuala Lumpur',
    },
  },
  register: {
    en: {
      eyebrow: 'New account',
      title: 'Create your account',
      intro: 'Free, and it unlocks the full planning toolkit.',
      bullets: [
        'Save trips and reopen them later',
        'Plan around weekends and public holidays',
        'Keep a record of your feedback',
      ],
      cta: 'Continue to register',
      note: 'Under a minute — no payment details',
      image: '/images/ets/ets-interior.jpg',
      imageAlt: 'Interior of an ETS Class 93 coach',
    },
    bm: {
      eyebrow: 'Akaun baharu',
      title: 'Cipta akaun anda',
      intro: 'Percuma, dan membuka semua alat perancangan.',
      bullets: [
        'Simpan perjalanan dan buka semula kemudian',
        'Rancang mengikut hujung minggu dan cuti umum',
        'Simpan rekod maklum balas anda',
      ],
      cta: 'Teruskan ke pendaftaran',
      note: 'Kurang seminit — tiada butiran pembayaran',
      image: '/images/ets/ets-interior.jpg',
      imageAlt: 'Bahagian dalam gerabak ETS Kelas 93',
    },
  },
} as const;

/**
 * Trigger button with a hover/focus preview card.
 *
 * Pointer: opens after a short delay, stays open while the pointer moves into
 * the card, closes after a slightly longer delay. Touch devices skip the card
 * entirely so one tap goes straight to the real login screen. Keyboard users
 * get the card on focus and can dismiss it with Escape.
 */
export default function AuthHoverCard({
  mode,
  lang,
  onSelect,
  className = '',
  align = 'right',
  children,
}: AuthHoverCardProps) {
  const c = COPY[mode][lang];
  const cardId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [canHover] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );

  const clearTimers = () => {
    if (openTimer.current !== null) {
      window.clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(() => clearTimers, []);

  const openNow = () => {
    clearTimers();
    setMounted(true);
    setOpen(true);
  };

  const openSoon = () => {
    if (!canHover) return;
    clearTimers();
    setMounted(true);
    if (!open) {
      openTimer.current = window.setTimeout(() => setOpen(true), 100);
    }
  };

  const closeSoon = () => {
    if (!canHover) return;
    clearTimers();
    closeTimer.current = window.setTimeout(() => setOpen(false), 150);
  };

  const dismiss = () => {
    clearTimers();
    setOpen(false);
  };

  const choose = () => {
    dismiss();
    onSelect();
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      clearTimers();
      setOpen(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      event.stopPropagation();
      dismiss();
      triggerRef.current?.focus();
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={openSoon}
      onMouseLeave={closeSoon}
      onFocus={openNow}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={open ? cardId : undefined}
        onClick={choose}
        className={className}
      >
        {children}
      </button>

      {mounted && (
        <div
          className={`absolute top-full z-50 pt-2 ${align === 'right' ? 'right-0' : 'left-0'}`}
          aria-hidden={!open}
        >
          <div
            id={cardId}
            role="region"
            aria-label={`${c.title} — ${c.eyebrow}`}
            className={`w-[19rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-[#dbe4ee] border-t-2 border-t-gold-400 bg-white shadow-[0_18px_40px_-12px_rgba(15,31,56,0.28)] transition duration-150 ease-out ${
              open ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-1 opacity-0'
            }`}
          >
            <div className="relative h-28 w-full overflow-hidden bg-brand-900">
              <img
                src={c.image}
                alt={c.imageAlt}
                width={800}
                height={1000}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-950/85 via-brand-950/20 to-transparent" />
              <span className="absolute bottom-2 left-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-gold-300">
                {c.eyebrow}
              </span>
            </div>

            <div className="p-4">
              <p className="font-display text-base font-extrabold leading-tight text-brand-950">{c.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#5b6b7f]">{c.intro}</p>

              <ul className="mt-3 space-y-1.5">
                {c.bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2 text-[11.5px] font-medium text-[#334155]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={choose}
                className="mt-4 flex w-full items-center justify-between gap-2 rounded-sm bg-brand-700 px-3 py-2.5 text-[11.5px] font-bold text-white transition hover:bg-brand-800"
              >
                {c.cta}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <p className="mt-2 text-center text-[10px] font-medium text-[#7c8b9d]">{c.note}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
