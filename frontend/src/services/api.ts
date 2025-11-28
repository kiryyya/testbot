import axios from 'axios';
import { UserData, ApiResponse } from '../types';

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

  // ===== API ДЛЯ ИГРЫ ПО ПОСТАМ =====

  // Получить настройки игры для поста
  getPostGameSettings: async (postId: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/posts/${postId}/game`);
    return response.data;
  },

  // Обновить настройки игры для поста
  updatePostGameSettings: async (postId: number, settings: {
    game_enabled: boolean;
    attempts_per_player?: number;
    lives_per_player?: number;
    prize_keyword?: string;
    promo_codes?: string[];
  }): Promise<ApiResponse<any>> => {
    const response = await api.put(`/posts/${postId}/game`, settings);
    return response.data;
  },

  // Получить все посты с игровыми настройками
  getAllPostsWithGames: async (): Promise<ApiResponse<any[]>> => {
    const response = await api.get('/posts/game');
    return response.data;
  },

  // Получить игроков поста
  getPostPlayers: async (postId: number, limit?: number): Promise<ApiResponse<any[]>> => {
    const response = await api.get(`/posts/${postId}/players${limit ? `?limit=${limit}` : ''}`);
    return response.data;
  },

  // Получить события поста
  getPostEvents: async (postId: number, limit?: number): Promise<ApiResponse<any[]>> => {
    const response = await api.get(`/posts/${postId}/events${limit ? `?limit=${limit}` : ''}`);
    return response.data;
  },

  // Получить статистику поста
  getPostStats: async (postId: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/posts/${postId}/stats`);
    return response.data;
  },

  // ===== API ДЛЯ АВТОРАССЫЛОК =====

  // Синхронизация участников сообщества (парсинг в БД)
  syncCommunityMembers: async (communityId: number): Promise<ApiResponse<any>> => {
    const response = await api.post(`/communities/${communityId}/sync-members`);
    return response.data;
  },

  // Получить количество участников сообщества
  getCommunityMembersCount: async (communityId: number): Promise<ApiResponse<any>> => {
    const response = await api.get(`/communities/${communityId}/members/count`);
    return response.data;
  },

  // Создать рассылку
  createBroadcast: async (communityId: number, messageText: string, scheduledAt?: string): Promise<ApiResponse<any>> => {
    const response = await api.post('/broadcasts', { communityId, messageText, scheduledAt });
    return response.data;
  },

  // Запустить рассылку
  startBroadcast: async (campaignId: string): Promise<ApiResponse<any>> => {
    const response = await api.post(`/broadcasts/${campaignId}/start`);
    return response.data;
  },

  // Получить статус рассылки
  getBroadcastStatus: async (campaignId: string): Promise<ApiResponse<any>> => {
    const response = await api.get(`/broadcasts/${campaignId}`);
    return response.data;
  },

  // Получить список рассылок сообщества
  getCommunityBroadcasts: async (communityId: number): Promise<ApiResponse<any[]>> => {
    const response = await api.get(`/communities/${communityId}/broadcasts`);
    return response.data;
  },

  // ===== API ДЛЯ СОЗДАНИЯ ПОСТОВ =====

  // Создать запланированный пост
  createScheduledPost: async (
    communityId: number, 
    postText: string, 
    scheduledAt: string,
    settings?: {
      gameEnabled?: boolean;
      attemptsPerPlayer?: number;
      livesPerPlayer?: number;
      prizeKeyword?: string;
      promoCodes?: string[];
      broadcastEnabled?: boolean;
      broadcastMessageText?: string;
      broadcastScheduledAt?: string;
      broadcastDelayMinutes?: number;
    }
  ): Promise<ApiResponse<any>> => {
    const response = await api.post(`/communities/${communityId}/posts`, {
      postText,
      scheduledAt,
      ...settings
    });
    return response.data;
  },

  // Получить запланированные посты сообщества
  getScheduledPosts: async (communityId: number): Promise<ApiResponse<any[]>> => {
    const response = await api.get(`/communities/${communityId}/scheduled-posts`);
    return response.data;
  },

};

export default api;
