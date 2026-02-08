/**
 * API Client for Dream AI Girl Backend
 *
 * Handles all HTTP requests to the FastAPI backend through API Gateway
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  Match,
  ChatMessage,
  SendMessageRequest,
  ChatResponse,
  GeneratePhotoRequest,
  GeneratePhotoResponse,
  ReceivedPhoto,
  GirlProfile,
  SwipeAction,
  APIError,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// AXIOS INSTANCE CONFIGURATION
// ============================================================================

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor (add auth token)
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor (handle token refresh)
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Token expired - try refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (refreshToken) {
              const response = await this.client.post('/auth/refresh', {
                refresh_token: refreshToken,
              });

              const { access_token } = response.data;
              this.setAccessToken(access_token);

              // Retry original request with new token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
              }
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed - logout user
            this.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  // ============================================================================
  // TOKEN MANAGEMENT
  // ============================================================================

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  private setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refresh_token');
  }

  private setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
    }
  }

  private clearTokens(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  private handleError(error: AxiosError): APIError {
    if (error.response) {
      // Server responded with error
      const data = error.response.data as any;
      return {
        error: data.error || 'Unknown error',
        message: data.message || error.message,
        status_code: error.response.status,
        details: data.details,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        error: 'Network Error',
        message: 'Unable to reach server. Please check your connection.',
        status_code: 0,
      };
    } else {
      // Something else happened
      return {
        error: 'Request Error',
        message: error.message,
        status_code: 0,
      };
    }
  }

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', credentials);
    const { access_token, refresh_token } = response.data;

    this.setAccessToken(access_token);
    this.setRefreshToken(refresh_token);

    return response.data;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/register', data);
    const { access_token, refresh_token } = response.data;

    this.setAccessToken(access_token);
    this.setRefreshToken(refresh_token);

    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  // ============================================================================
  // USER PROFILE
  // ============================================================================

  async getUserProfile(userId: number): Promise<User> {
    const response = await this.client.get<User>(`/users/${userId}`);
    return response.data;
  }

  async updateUserProfile(userId: number, data: Partial<User>): Promise<User> {
    const response = await this.client.put<User>(`/users/${userId}`, data);
    return response.data;
  }

  // ============================================================================
  // MATCHES & SWIPE
  // ============================================================================

  async discoverGirls(userId: number, limit: number = 20): Promise<GirlProfile[]> {
    const response = await this.client.get<{ girls: GirlProfile[] }>(
      `/matches/discover?user_id=${userId}&limit=${limit}`
    );
    return response.data.girls;
  }

  async swipeGirl(action: SwipeAction): Promise<{ matched: boolean; match?: Match }> {
    const response = await this.client.post('/matches/swipe', action);
    return response.data;
  }

  async getUserMatches(userId: number): Promise<Match[]> {
    const response = await this.client.get<{ matches: Match[] }>(
      `/matches?user_id=${userId}`
    );
    return response.data.matches;
  }

  async getMatch(userId: number, girlId: string): Promise<Match> {
    const response = await this.client.get<Match>(
      `/matches/${girlId}?user_id=${userId}`
    );
    return response.data;
  }

  // ============================================================================
  // CHAT & MESSAGES
  // ============================================================================

  async getMessages(
    userId: number,
    girlId: string,
    limit: number = 100
  ): Promise<ChatMessage[]> {
    const response = await this.client.get<{ messages: ChatMessage[] }>(
      `/chat/${girlId}/messages?user_id=${userId}&limit=${limit}`
    );
    return response.data.messages;
  }

  async sendMessage(request: SendMessageRequest): Promise<ChatResponse> {
    const response = await this.client.post<ChatResponse>(
      '/ai/chat/respond',
      request
    );
    return response.data;
  }

  async markMessagesAsRead(
    userId: number,
    girlId: string,
    messageIds: number[]
  ): Promise<void> {
    await this.client.post('/chat/mark-read', {
      user_id: userId,
      girl_id: girlId,
      message_ids: messageIds,
    });
  }

  // ============================================================================
  // MEDIA GENERATION
  // ============================================================================

  async generatePhoto(request: GeneratePhotoRequest): Promise<GeneratePhotoResponse> {
    const response = await this.client.post<GeneratePhotoResponse>(
      '/photos/generate',
      request
    );
    return response.data;
  }

  async getReceivedPhotos(
    userId: number,
    girlId: string,
    limit: number = 50
  ): Promise<ReceivedPhoto[]> {
    const response = await this.client.get<{ photos: ReceivedPhoto[] }>(
      `/photos?user_id=${userId}&girl_id=${girlId}&limit=${limit}`
    );
    return response.data.photos;
  }

  async generateVideo(userId: number, girlId: string): Promise<any> {
    const response = await this.client.post('/videos/generate', {
      user_id: userId,
      girl_id: girlId,
    });
    return response.data;
  }

  async getPhotos(
    userId: number,
    filter: 'all' | 'recent' | 'favorites' = 'all'
  ): Promise<{ photos: any[] }> {
    const response = await this.client.get(
      `/photos/gallery?user_id=${userId}&filter=${filter}`
    );
    return response.data;
  }

  // ============================================================================
  // CONVENIENCE WRAPPERS (alternative names)
  // ============================================================================

  async getDiscoverQueue(userId: number, limit: number = 20): Promise<{ profiles: GirlProfile[] }> {
    const girls = await this.discoverGirls(userId, limit);
    return { profiles: girls };
  }

  async swipe(
    userId: number,
    girlId: string,
    direction: 'left' | 'right'
  ): Promise<{ matched: boolean; matchId?: number }> {
    const result = await this.swipeGirl({
      user_id: userId,
      girl_id: girlId,
      liked: direction === 'right',
    });
    return {
      matched: result.matched,
      matchId: result.match?.id,
    };
  }

  async getMatches(userId: number): Promise<{ matches: Match[] }> {
    const matches = await this.getUserMatches(userId);
    return { matches };
  }

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const apiClient = new APIClient();

export default apiClient;

// Named exports for convenience
export const {
  login,
  register,
  logout,
  getCurrentUser,
  getUserProfile,
  updateUserProfile,
  discoverGirls,
  swipeGirl,
  getUserMatches,
  getMatch,
  getMessages,
  sendMessage,
  markMessagesAsRead,
  generatePhoto,
  getReceivedPhotos,
  generateVideo,
  getPhotos,
  getDiscoverQueue,
  swipe,
  getMatches,
  healthCheck,
} = apiClient as any;
