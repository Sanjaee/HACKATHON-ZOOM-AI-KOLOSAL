export interface Room {
  id: string;
  name: string;
  description?: string;
  created_by_id: string;
  created_by_name: string;
  is_active: boolean;
  max_participants?: number;
  participant_count: number;
  created_at: string;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  max_participants?: number;
}

export interface JoinRoomResponse {
  token: string;
  url: string;
  room: Room;
}

