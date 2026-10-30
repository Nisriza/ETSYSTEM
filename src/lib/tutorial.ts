import type { TutorialLang, TutorialStep } from '../components/TutorialOverlay';
import { apiFetch } from './api.ts';

export type TutorialRole = 'passenger' | 'operator' | 'admin' | 'guest';

const PASSENGER: Record<TutorialLang, TutorialStep[]> = {
  en: [
    {
      targetId: 'tab-nav',
      title: 'Your dashboard menu',
      body: 'Switch between Home/Search, Saved Trips, Crowd Feedback, Holidays & Recommendations, and Profile Settings.',
    },
    {
      targetId: 'predictive-flow-card',
      title: 'Predict route demand',
      body: 'This is your prediction planner. Choose your origin and destination, verify the route, then set your date and time to forecast ridership.',
    },
    {
      targetId: 'select-origin',
      title: 'Step 1 — Origin station',
      body: 'Pick the station you are departing from.',
    },
    {
      targetId: 'select-destination',
      title: 'Step 1 — Destination station',
      body: 'Pick where you are heading. The system will check whether the route is available.',
    },
    {
      targetId: 'search-sidebar',
      title: 'Holidays & popular routes',
      body: 'Plan around upcoming public holidays and see which transit points are busiest.',
    },
  ],
  bm: [
    {
      targetId: 'tab-nav',
      title: 'Menu papan pemuka anda',
      body: 'Tukar antara Laman/Carian, Perjalanan Tersimpan, Maklum Balas Penumpang, Cuti & Cadangan, dan Tetapan Profil.',
    },
    {
      targetId: 'predictive-flow-card',
      title: 'Ramal permintaan laluan',
      body: 'Ini ialah perancang ramalan anda. Pilih stesen asal dan destinasi, sahkan laluan, kemudian tetapkan tarikh dan masa untuk meramal jumlah penumpang.',
    },
    {
      targetId: 'select-origin',
      title: 'Langkah 1 — Stesen asal',
      body: 'Pilih stesen tempat anda berlepas.',
    },
    {
      targetId: 'select-destination',
      title: 'Langkah 1 — Stesen destinasi',
      body: 'Pilih tempat anda menuju. Sistem akan menyemak sama ada laluan tersedia.',
    },
    {
      targetId: 'search-sidebar',
      title: 'Cuti & laluan popular',
      body: 'Rancang perjalanan berdasarkan cuti umum akan datang dan lihat titik transit yang paling sibuk.',
    },
  ],
};

const OPERATOR: Record<TutorialLang, TutorialStep[]> = {
  en: [
    {
      targetId: 'op-tab-select',
      title: 'Operator menu',
      body: 'Switch between Analytics, Prediction, Reports, and Profile.',
    },
    {
      targetId: 'predict-flow-card',
      title: 'Predict route demand',
      body: 'Forecast ridership for any route, date, and time.',
    },
    {
      targetId: 'demand-chart',
      title: 'Demand visualisation',
      body: 'Review hourly and route demand charts.',
    },
  ],
  bm: [
    {
      targetId: 'op-tab-select',
      title: 'Menu operator',
      body: 'Tukar antara Analitik, Ramalan, Laporan, dan Profil.',
    },
    {
      targetId: 'predict-flow-card',
      title: 'Ramal permintaan laluan',
      body: 'Ramal jumlah penumpang bagi sebarang laluan, tarikh, dan masa.',
    },
    {
      targetId: 'demand-chart',
      title: 'Visualisasi permintaan',
      body: 'Semak carta permintaan mengikut jam dan laluan.',
    },
  ],
};

const ADMIN: Record<TutorialLang, TutorialStep[]> = {
  en: [
    {
      targetId: 'admin-tabs',
      title: 'Admin menu',
      body: 'Manage users, operators, stations, routes, holidays, datasets, and the ML model.',
    },
    {
      targetId: 'admin-dataset-tab',
      title: 'Dataset management',
      body: 'Upload historical ridership CSV files and inspect the current dataset.',
    },
    {
      targetId: 'model-management-panel',
      title: 'Model management',
      body: 'Retrain the Random Forest model and view its accuracy metrics.',
    },
  ],
  bm: [
    {
      targetId: 'admin-tabs',
      title: 'Menu admin',
      body: 'Urus pengguna, operator, stesen, laluan, cuti, set data, dan model ML.',
    },
    {
      targetId: 'admin-dataset-tab',
      title: 'Pengurusan set data',
      body: 'Muat naik fail CSV jumlah penumpang sejarah dan semak set data semasa.',
    },
    {
      targetId: 'model-management-panel',
      title: 'Pengurusan model',
      body: 'Latih semula model Random Forest dan lihat metrik ketepatannya.',
    },
  ],
};

/**
 * Tutorial copy must follow the UI language, never the role or the URL alone.
 * The caller passes the language that the surrounding interface is using.
 */
export function getTutorialStepsForRole(role: TutorialRole, lang: TutorialLang = 'en'): TutorialStep[] {
  const language: TutorialLang = lang === 'bm' ? 'bm' : 'en';
  if (role === 'operator') return OPERATOR[language];
  if (role === 'admin') return ADMIN[language];
  return PASSENGER[language];
}

export async function markTutorialCompleted(completed: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch('/api/user/tutorial', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data?.error || 'Failed to update tutorial status.' };
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Network error.' };
  }
}
