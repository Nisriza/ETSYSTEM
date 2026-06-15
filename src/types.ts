export interface User {
  id: number;
  full_name: string;
  username: string;
  role: 'passenger' | 'operator' | 'admin';
  status: string;
}

export interface Station {
  id: number;
  name: string;
}

export interface SavedTrip {
  id: number;
  user_id: number;
  origin: string;
  destination: string;
  travel_date: string;
  travel_time: string;
  predicted_ridership: number | null;
  demand_level: 'Low' | 'Medium' | 'High' | 'Very High' | null;
  note: string;
  created_at?: string;
}

export interface Feedback {
  id: number;
  user_id: number;
  author_name?: string;
  origin: string;
  destination: string;
  travel_date: string;
  crowd_level: 'Low' | 'Medium' | 'High' | 'Very High';
  comfort_rating: number; // 1-5
  delay_reported: boolean;
  delay_minutes: number;
  comment: string;
  created_at: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  country: string;
}

export interface Recommendation {
  holidayId: number;
  holidayName: string;
  holidayDate: string;
  origin: string;
  destination: string;
  predicted_ridership: number;
  demandLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  recommendation: string;
  recommendedDate: string | null;
}

export interface ReportItem {
  id: number;
  operator_id: number;
  operator_name?: string;
  month: number;
  year: number;
  generated_at: string;
  report_data: string; // JSON String
}
