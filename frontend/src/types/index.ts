// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export interface User {
  id: number;
  username: string;
  email: string;
  tokens: number;
  xp: number;
  level: number;
  subscription_tier: 'free' | 'premium' | 'elite';
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// ============================================================================
// GIRLFRIEND PROFILES
// ============================================================================

export type GirlArchetype =
  | 'romantique'
  | 'soumise'
  | 'dominante'
  | 'nympho'
  | 'timide'
  | 'exhib'
  | 'fetichiste'
  | 'perverse'
  | 'cougar'
  | 'salope';

export interface GirlProfile {
  id: string;
  name: string;
  age: number;
  archetype: GirlArchetype;
  ethnicity: string;
  job: string;
  location: string;
  personality: string;
  likes: string;
  dislikes: string;
  bio: string;
  photos: string[];
  is_custom: boolean;
}

// ============================================================================
// MATCH TYPES
// ============================================================================

export interface Match {
  id: number;
  user_id: number;
  girl_id: string;
  affection: number;
  messages_count: number;
  photos_received: number;
  videos_received: number;
  matched_at: string;
  last_message_at?: string;
  is_active: boolean;
  girl?: GirlProfile;  // Populated in some endpoints
}

export interface SwipeAction {
  user_id: number;
  girl_id: string;
  direction: 'left' | 'right';
}

// ============================================================================
// CHAT & MESSAGES
// ============================================================================

export type MessageSender = 'user' | 'girl';

export interface ChatMessage {
  id: number;
  user_id: number;
  girl_id: string;
  sender: MessageSender;
  content: string;
  media_url?: string;
  media_type?: 'photo' | 'video' | 'audio';
  timestamp: string;
  is_read: boolean;
  reaction?: string;
}

export interface SendMessageRequest {
  user_id: number;
  girl_id: string;
  message: string;
}

export interface ChatResponse {
  response: string;
  affection_change: number;
  new_affection: number;
  suggests_photo: boolean;
  photo_context?: string;
}

export interface Conversation {
  girl_id: string;
  girl: GirlProfile;
  last_message: ChatMessage;
  unread_count: number;
  affection: number;
}

// ============================================================================
// MEDIA TYPES
// ============================================================================

export interface GeneratePhotoRequest {
  user_id: number;
  girl_id: string;
  context?: string;  // selfie, lingerie, nude, etc.
  nsfw_level?: number;  // 0-100
  custom_prompt?: string;
}

export interface GeneratePhotoResponse {
  photo_url: string;
  task_id: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface ReceivedPhoto {
  id: number;
  user_id: number;
  girl_id: string;
  photo_url: string;
  context: string;
  is_nsfw: boolean;
  received_at: string;
}

export interface GenerateVideoRequest {
  user_id: number;
  girl_id: string;
}

export interface GenerateVideoResponse {
  message: string;
  status: 'pending' | 'completed' | 'failed';
  task_id?: string;
  video_url?: string;
}

// ============================================================================
// SUBSCRIPTION & PAYMENT
// ============================================================================

export interface Subscription {
  id: number;
  user_id: number;
  tier: 'free' | 'premium' | 'elite';
  status: 'active' | 'canceled' | 'expired';
  starts_at: string;
  ends_at: string;
  auto_renew: boolean;
}

export interface TokenPurchaseRequest {
  user_id: number;
  amount: number;  // Number of tokens
  payment_method: string;
}

// ============================================================================
// WEBSOCKET EVENTS
// ============================================================================

export interface SocketMessage {
  event: string;
  data: any;
}

export interface TypingIndicator {
  girl_id: string;
  is_typing: boolean;
}

export interface MessageReceivedEvent {
  message: ChatMessage;
  girl: {
    id: string;
    name: string;
    archetype: GirlArchetype;
  };
}

// ============================================================================
// API ERROR TYPES
// ============================================================================

export interface APIError {
  error: string;
  message: string;
  status_code: number;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface LoginFormData {
  username: string;
  password: string;
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// ============================================================================
// UI STATE TYPES
// ============================================================================

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export interface Modal {
  id: string;
  component: React.ComponentType<any>;
  props?: any;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface UserEvent {
  event_type: string;
  user_id: number;
  girl_id?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  has_next: boolean;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}
