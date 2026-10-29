import type { TutorialStep } from '../components/TutorialOverlay';
import { apiFetch } from './api.ts';

export type TutorialRole = 'passenger' | 'operator' | 'admin' | 'guest';

export function getTutorialStepsForRole(role: TutorialRole): TutorialStep[] {
  const isBm = typeof window !== 'undefined' && window.location.pathname.startsWith('/bm');

  if (role === 'passenger' || role === 'guest') {
    return [
      { targetId: 'tab-nav', title: 'Your dashboard menu', body: 'Switch between Home/Search, Saved Trips, Crowd Feedback, Holidays & Recommendations, and Profile Settings.', bmTitle: 'Menu papan pemuka anda', bmBody: 'Tukar antara Laman/Carian, Perjalanan Tersimpan, Maklum Balas Penumpang, Cuti & Cadangan, dan Tetapan Profil.' },
      { targetId: 'predictive-flow-card', title: 'Predict route demand', body: 'This is your prediction planner. Choose your origin and destination, verify the route, then set your date and time to forecast ridership.', bmTitle: 'Ramal permintaan laluan', bmBody: 'Ini ialah perancang ramalan anda. Pilih stesen asal dan destinasi, sahkan laluan, kemudian tetapkan tarikh dan masa untuk meramal ridership.' },
      { targetId: 'select-origin', title: 'Step 1 � Origin station', body: 'Pick the station you are departing from.', bmTitle: 'Langkah 1 � Stesen asal', bmBody: 'Pilih stesen tempat anda berlepas.' },
      { targetId: 'select-destination', title: 'Step 1 � Destination station', body: 'Pick where you are heading. The system will check whether the route is available.', bmTitle: 'Langkah 1 � Stesen destinasi', bmBody: 'Pilih tempat anda menuju. Sistem akan menyemak ketersediaan laluan.' },
      { targetId: 'search-sidebar', title: 'Holidays & popular routes', body: 'Plan around upcoming public holidays and see which transit points are busiest.', bmTitle: 'Cuti & laluan popular', bmBody: 'Rancang berdasarkan cuti umum akan datang dan lihat titik transit yang paling sibuk.' },
    ];
  }

  if (role === 'operator') {
    return [
      { targetId: 'op-tab-select', title: 'Operator menu', body: 'Switch between Analytics, Prediction, Reports, and Profile.', bmTitle: 'Menu operator', bmBody: 'Tukar antara Analitik, Ramalan, Laporan, dan Profil.' },
      { targetId: 'predict-flow-card', title: 'Predict route demand', body: 'Forecast ridership for any route, date, and time.', bmTitle: 'Ramal permintaan laluan', bmBody: 'Ramal ridership bagi sebarang laluan, tarikh, dan masa.' },
      { targetId: 'demand-chart', title: 'Demand visualisation', body: 'Review hourly and route demand charts.', bmTitle: 'Visualisasi permintaan', bmBody: 'Semak carta permintaan mengikut jam dan laluan.' },
    ];
  }

  return [
    { targetId: 'admin-tabs', title: 'Admin menu', body: 'Manage users, operators, stations, routes, holidays, datasets, and the ML model.', bmTitle: 'Menu admin', bmBody: 'Urus pengguna, operator, stesen, laluan, cuti, set data, dan model ML.' },
    { targetId: 'admin-dataset-tab', title: 'Dataset management', body: 'Upload historical ridership CSV files and inspect the current dataset.', bmTitle: 'Pengurusan set data', bmBody: 'Muat naik fail CSV ridership sejarah dan semak set data semasa.' },
    { targetId: 'model-management-panel', title: 'Model management', body: 'Retrain the Random Forest model and view its accuracy metrics.', bmTitle: 'Pengurusan model', bmBody: 'Latih semula model Random Forest dan lihat metrik ketepatan.' },
  ];
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
