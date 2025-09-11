export interface UserData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface VkMessage {
  id: string;
  vk_message_id: number;
  vk_user_id: number;
  user_name?: string;
  message_text: string;
  message_type: 'message' | 'wall_comment';
  peer_id?: number;
  conversation_message_id?: number;
  timestamp: number;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}