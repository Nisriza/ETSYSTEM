import React, { useState } from 'react';
import { MapPin, Landmark, ChevronRight, Loader2, AlertTriangle, Camera } from 'lucide-react';
import { apiFetch } from '../lib/api.ts';
import type { Station } from '../types.ts';

interface Attraction {
  name: string;
  category: string;
  distanceKm: number | null;
  description: string;
  source: 'curated' | 'ai';
}

interface AttractionsResponse {
  station: { id: number; name: string; state: string };
  attractions: Attraction[];
  aiConfigured: boolean;
  generatedAt: string | null;
}

const COPY = {
  en: {
    title: 'Nearby Attractions',
    subtitle: 'Tap a station to see tourist spots around it, nearest first.',
    loading: 'Finding attractions…',
    empty: 'No attractions found near this station yet.',
    error: 'Could not load attractions. Please try again.',
    notConfigured: 'AI suggestions are not configured yet (GEMINI_API_KEY).',
    aiNote: 'Distances are approximate and AI-generated.',
    curatedBadge: 'On file',
  },
  bm: {
    title: 'Tarikan Berdekatan',
    subtitle: 'Tekan stesen untuk melihat tempat menarik di sekitarnya, yang terdekat dahulu.',
    loading: 'Mencari tarikan…',
    empty: 'Tiada tarikan ditemui berhampiran stesen ini lagi.',
    error: 'Gagal memuatkan tarikan. Sila cuba lagi.',
    notConfigured: 'Cadangan AI belum dikonfigurasikan (GEMINI_API_KEY).',
    aiNote: 'Jarak adalah anggaran dan dijana AI.',
    curatedBadge: 'Dalam rekod',
  },
} as const;

interface StationAttractionsProps {
  stations: Station[];
  token: string;
  lang: 'en' | 'bm';
}

/**
 * Click-a-station → nearby attractions list, sorted by proximity.
 * Data comes from GET /api/stations/:id/attractions (curated Destinations
 * first, then cached AI-generated suggestions with approximate distances).
 */
export default function StationAttractions({ stations, token, lang }: StationAttractionsProps) {
  const c = COPY[lang];
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AttractionsResponse | null>(null);

  const selectStation = async (id: number) => {
    if (selectedId === id) {
      setSelectedId(null);
      setResult(null);
      setError(null);
      return;
    }
    setSelectedId(id);
    setResult(null);
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/stations/${id}/attractions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || c.error);
      } else {
        setResult(data as AttractionsResponse);
      }
    } catch {
      setError(c.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6" id="station-attractions-card">
      <div className="flex items-center gap-2 mb-1">
        <Camera className="w-4 h-4 text-indigo-500" />
        <h4 className="font-display font-semibold text-slate-800 text-xs uppercase tracking-wider">{c.title}</h4>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">{c.subtitle}</p>

      <div className="flex flex-wrap gap-1.5" id="station-attractions-chips">
        {stations.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => selectStation(s.id)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition cursor-pointer ${
              selectedId === s.id
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 font-semibold">
          <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          {c.loading}
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 text-xs text-red-600 font-semibold">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {result && !loading && (
        <div className="mt-4" id="station-attractions-list">
          <p className="text-[11px] font-bold text-slate-700 mb-2 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-indigo-500" />
            {result.station.name}
          </p>
          {result.attractions.length === 0 ? (
            <p className="text-[11px] text-slate-400 italic">
              {result.aiConfigured ? c.empty : c.notConfigured}
            </p>
          ) : (
            <ul className="space-y-2">
              {result.attractions.map((a, i) => (
                <li key={`${a.name}-${i}`} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                        <span className="truncate">{a.name}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600">
                          {a.category}
                        </span>
                        {a.source === 'curated' && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">
                            {c.curatedBadge}
                          </span>
                        )}
                      </div>
                    </div>
                    {a.distanceKm != null && (
                      <span className="shrink-0 text-[10px] font-extrabold font-mono text-slate-500 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                        {a.distanceKm} km
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{a.description}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
          {result.attractions.some((a) => a.source === 'ai') && (
            <p className="text-[9px] text-slate-400 mt-2 flex items-center gap-1">
              <ChevronRight className="h-3 w-3" />
              {c.aiNote}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
