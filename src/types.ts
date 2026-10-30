export interface User {
  id: number;
  full_name: string;
  username: string;
  role: 'passenger' | 'operator' | 'admin' | 'guest';
  status: string;
  language?: string;
  login_count?: number | null;
  tutorial_completed?: boolean;
  tutorial_completed_at?: string;
}

export interface Station {
  id: number;
  name: string;
  state?: string;
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
  comfort_rating: number;
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

export interface ReportItem {
  id: number;
  operator_id: number;
  operator_name?: string;
  month: number;
  year: number;
  generated_at: string;
  report_data: string;
}

export interface HistoricalData {
  id?: number;
  origin_station: string;
  destination_station: string;
  year: number;
  month: number;
  demand_count: number;
  demand_level: 'Low' | 'Medium' | 'High' | 'Very High';
}

export interface RouteConnection {
  id: number;
  origin_station_id: number;
  destination_station_id: number;
  origin_name?: string;
  destination_name?: string;
}

export interface PredictionRecord {
  id?: number;
  user_id: number;
  origin_station: string;
  destination_station: string;
  prediction_date: string;
  predicted_demand: number;
  demand_level: 'Low' | 'Medium' | 'High' | 'Very High';
}

export interface Recommendation {
  holidayId: number;
  holidayName: string;
  holidayDate: string;
  origin: string;
  destination: string;
  demandLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  predictedRidership?: number;
  recommendation: string;
  recommendedDate?: string | null;
}

export interface OperatorRecord {
  id: number;
  full_name: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}
