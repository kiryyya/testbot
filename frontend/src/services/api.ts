import axios from 'axios';
import { UserData, VkMessage, ApiResponse } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  // Получить все записи
  getAllData: async (): Promise<ApiResponse<UserData[]>> => {
    const response = await api.get('/data');
    return response.data;
  },

  // Получить запись по ID
  getDataById: async (id: string): Promise<ApiResponse<UserData>> => {
    const response = await api.get(`/data/${id}`);
    return response.data;
  },

  // Создать новую запись
  createData: async (data: Omit<UserData, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<UserData>> => {
    const response = await api.post('/data', data);
    return response.data;
  },

  // Обновить запись
  updateData: async (id: string, data: Omit<UserData, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<UserData>> => {
    const response = await api.put(`/data/${id}`, data);
    return response.data;
  },

  // Удалить запись
  deleteData: async (id: string): Promise<ApiResponse<UserData>> => {
    const response = await api.delete(`/data/${id}`);
    return response.data;
  },

  // VK сообщения
  getVkMessages: async (limit?: number): Promise<ApiResponse<VkMessage[]>> => {
    const response = await api.get(`/vk/messages${limit ? `?limit=${limit}` : ''}`);
    return response.data;
  },

  // VK лайки
  getVkLikes: async (): Promise<ApiResponse<any>> => {
    const response = await api.get('/vk/likes');
    return response.data;
  },
};

export default api;
