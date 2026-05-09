// 类型定义文件
export type UserRole = 'user' | 'doctor' | 'admin';

export type EmotionLevel = 'very_bad' | 'bad' | 'neutral' | 'good' | 'very_good';

export interface Profile {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  wechat?: string;
  role: UserRole;
  avatar_url?: string;
  full_name?: string;
  gender?: string;
  birth_date?: string;
  bio?: string;
  background_url?: string;
  selected_background?: string;
  created_at: string;
  updated_at: string;
}

export interface EmotionDiary {
  id: string;
  user_id: string;
  diary_date: string;
  emotion_level: EmotionLevel;
  title?: string;
  content?: string;
  tags?: string[];
  image_urls?: string[];
  voice_url?: string;
  ai_analysis?: any;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  user_id: string;
  assessment_type: string;
  conversation_history: any[];
  text_input?: string;
  voice_input_url?: string;
  image_input_url?: string;
  video_input_url?: string;
  ai_analysis?: any;
  risk_level?: number;
  score?: number;
  report?: any;
  created_at: string;
  updated_at: string;
}

export interface WearableData {
  id: string;
  user_id: string;
  record_date: string;
  heart_rate?: number;
  sleep_hours?: number;
  sleep_quality?: number;
  steps?: number;
  calories?: number;
  stress_level?: number;
  blood_oxygen?: number;
  temperature?: number;
  data_json?: any;
  created_at: string;
}

// 智能手环设备信息
export interface SmartBandDevice {
  id: string;
  name: string;
  manufacturer?: string;
  model?: string;
  rssi?: number; // 信号强度
  gatt?: BluetoothRemoteGATTServer;
}

// 手环连接状态
export type BandConnectionStatus = 
  | 'disconnected' 
  | 'scanning' 
  | 'connecting' 
  | 'connected' 
  | 'connection_failed';

// 时间维度类型
export type TimeRange = 'day' | 'week' | 'month';

export interface HealingContent {
  id: string;
  title: string;
  description?: string;
  category: string;
  content_type: string;
  content_url?: string;
  duration?: number;
  thumbnail_url?: string;
  author?: string;
  tags?: string[];
  is_active: boolean;
  view_count: number;
  like_count?: number;
  created_at: string;
  updated_at: string;
}

export interface UserHealingRecord {
  id: string;
  user_id: string;
  healing_content_id: string;
  duration_seconds?: number;
  completed: boolean;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  anonymous_name: string;
  anonymous_nickname?: string;
  title: string;
  content: string;
  category_id?: string;
  tags?: string[];
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  is_hidden: boolean;
  is_recovery_story?: boolean;
  is_featured?: boolean;
  post_categories?: any;
  created_at: string;
  updated_at: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  anonymous_name: string;
  content: string;
  like_count: number;
  created_at: string;
}

export interface DoctorPatient {
  id: string;
  doctor_id: string;
  patient_id: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RiskAlert {
  id: string;
  patient_id: string;
  alert_type: string;
  risk_level: number;
  description: string;
  data_source?: string;
  source_id?: string;
  is_handled: boolean;
  handled_by?: string;
  handled_at?: string;
  notes?: string;
  created_at: string;
}

export interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  content_type?: 'text' | 'document';  // 新增: 内容类型
  file_url?: string;                    // 新增: Storage文件路径
  file_name?: string;                   // 新增: 原始文件名
  file_size?: number;                   // 新增: 文件大小(bytes)
  file_mime_type?: string;              // 新增: MIME类型
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// AI API相关类型
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface MultimodalContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface MultimodalMessage {
  role: 'system' | 'user' | 'assistant';
  content: MultimodalContent[];
}
