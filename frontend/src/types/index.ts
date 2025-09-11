export interface UserData {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  count?: number;
}
