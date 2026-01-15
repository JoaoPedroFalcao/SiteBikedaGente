export interface Bike {
  id: string;
  bike_number: string;
  status: 'available' | 'in_use' | 'maintenance' | 'low_battery';
  last_station_id: number | null; 
  current_dock_id: number | null; 
  last_activity?: string;
  rfid_uid?: string;
  current_lock_position: number | null;
  battery_level?: number;
}

export interface Station {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  mqtt_topic: string;
  is_online: boolean;
  operation_mode: 'online' | 'offline' | 'auto';
  available_bikes?: number;
  available_slots?: number;
  bikes?: Bike[];
  display_order?: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  cpf: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  role: 'admin' | 'user';
  status: 'pending_approval' | 'approved' | 'rejected' | 'deleted' | null;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  residence_proof_url?: string;
  mercadopago_customer_id?: string;
  default_card_id?: string | null;
  suspended_until?: string | null;
}

export interface Ride {
  end_dock_id: any;
  profiles: any;
  id: number;
  user_id: string;
  bike_id: string;
  start_station_id: number;
  end_station_id?: number | null;
  started_at: string;
  ended_at?: string | null;
  status: 'active' | 'completed' | 'canceled';
  ride_evaluations: { rating: number; comment: string | null }[] | null;
  penalty_fee?: number | null;
  fee_charged?: number | null;
  payment_status?: string | null;
  penalty_reason?: string | null;
  payment_id?: string | null;
}

export interface Card {
  id: string;
  brand: string;
  last4: string;
}