// Supabase API封装

import type {
  Assessment,
  ChatMessage,
  CommunityComment,
  CommunityPost,
  DoctorPatient,
  EmotionDiary,
  HealingContent,
  KnowledgeBase,
  MultimodalMessage,
  Profile,
  RiskAlert,
  UserHealingRecord,
  WearableData,
} from '@/types';
import { supabase } from './supabase';

const assessmentFingerprint = (assessment: any) => {
  if (assessment.assessment_type !== 'fusion_report') return assessment.id;
  const createdAt = assessment.created_at ? new Date(assessment.created_at).getTime() : 0;
  const timeBucket = createdAt ? Math.floor(createdAt / (2 * 60 * 1000)) : assessment.id;
  return [
    assessment.user_id,
    assessment.assessment_type,
    assessment.score ?? '',
    assessment.report?.scaleData?.score ?? '',
    assessment.report?.voiceData?.score ?? '',
    assessment.report?.expressionData?.depression_risk_score ?? '',
    timeBucket,
  ].join('|');
};

const dedupeAssessments = <T extends any[]>(assessments: T): T => {
  const seen = new Set<string>();
  return assessments.filter((assessment: any) => {
    const key = assessmentFingerprint(assessment);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }) as T;
};

// ==================== 用户档案 ====================
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data as Profile | null;
};

export const updateProfile = async (userId: string, updates: Partial<Profile>) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as Profile;
};

export const getAllProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

// ==================== 情绪日记 ====================
export const getEmotionDiaries = async (userId: string, limit = 30) => {
  const { data, error } = await supabase
    .from('emotion_diaries')
    .select('*')
    .eq('user_id', userId)
    .order('diary_date', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const getEmotionDiaryByDate = async (userId: string, date: string) => {
  const { data, error } = await supabase
    .from('emotion_diaries')
    .select('*')
    .eq('user_id', userId)
    .eq('diary_date', date)
    .maybeSingle();
  
  if (error) throw error;
  return data as EmotionDiary | null;
};

export const createEmotionDiary = async (diary: Partial<EmotionDiary>) => {
  const { data, error } = await supabase
    .from('emotion_diaries')
    .upsert(diary, { onConflict: 'user_id,diary_date' })
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as EmotionDiary;
};

export const updateEmotionDiary = async (id: string, updates: Partial<EmotionDiary>) => {
  const { data, error } = await supabase
    .from('emotion_diaries')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as EmotionDiary;
};

export const deleteEmotionDiary = async (id: string) => {
  const { error } = await supabase
    .from('emotion_diaries')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ==================== 评估记录 ====================
export const getAssessments = async (userId: string, limit = 10) => {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return Array.isArray(data) ? dedupeAssessments(data).slice(0, limit) : [];
};

export const getAllAssessments = async (limit = 1000) => {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return Array.isArray(data) ? dedupeAssessments(data).slice(0, limit) : [];
};

export const getAllEmotionDiaries = async (limit = 1000) => {
  const { data, error } = await supabase
    .from('emotion_diaries')
    .select('*')
    .order('diary_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const getAssessmentById = async (id: string) => {
  const { data, error } = await supabase
    .from('assessments')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (error) throw error;
  return data as Assessment | null;
};

export const createAssessment = async (assessment: Partial<Assessment>) => {
  const { data, error } = await supabase
    .from('assessments')
    .insert(assessment)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as Assessment;
};

export const updateAssessment = async (id: string, updates: Partial<Assessment>) => {
  const { data, error } = await supabase
    .from('assessments')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as Assessment;
};

// ==================== 手环数据 ====================
export const getWearableData = async (userId: string, limit = 30) => {
  const { data, error } = await supabase
    .from('wearable_data')
    .select('*')
    .eq('user_id', userId)
    .order('record_date', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const getWearableDataByDateRange = async (
  userId: string,
  startDate: string,
  endDate: string
) => {
  const { data, error } = await supabase
    .from('wearable_data')
    .select('*')
    .eq('user_id', userId)
    .gte('record_date', startDate)
    .lte('record_date', endDate)
    .order('record_date', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const getLatestWearableData = async (userId: string) => {
  const { data, error } = await supabase
    .from('wearable_data')
    .select('*')
    .eq('user_id', userId)
    .order('record_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (error) throw error;
  return data as WearableData | null;
};

export const createWearableData = async (wearableData: Partial<WearableData>) => {
  const { data, error } = await supabase
    .from('wearable_data')
    .insert(wearableData)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as WearableData;
};

export const updateWearableData = async (
  id: string,
  updates: Partial<WearableData>
) => {
  const { data, error } = await supabase
    .from('wearable_data')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as WearableData;
};

export const upsertWearableData = async (wearableData: Partial<WearableData>) => {
  const { data, error } = await supabase
    .from('wearable_data')
    .upsert(wearableData, { onConflict: 'user_id,record_date' })
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as WearableData;
};

// ==================== 疗愈内容 ====================
export const getHealingContents = async (category?: string) => {
  let query = supabase
    .from('healing_contents')
    .select('*')
    .eq('is_active', true);
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const createHealingRecord = async (record: Partial<UserHealingRecord>) => {
  const { data, error } = await supabase
    .from('user_healing_records')
    .insert(record)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as UserHealingRecord;
};

export const getHealingRecords = async (userId: string, limit = 20) => {
  const { data, error } = await supabase
    .from('user_healing_records')
    .select('*, healing_contents(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

// ==================== 树洞 ====================
export const getCommunityPosts = async (limit = 20) => {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .eq('is_hidden', false)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const createCommunityPost = async (post: Partial<CommunityPost>) => {
  // Ensure required anonymous_name is present
  const payload = {
    ...post,
    anonymous_name: post.anonymous_name || post.anonymous_nickname || '匿名用户',
  };
  const { data, error } = await supabase
    .from('community_posts')
    .insert(payload)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as CommunityPost;
};

export const getCommunityComments = async (postId: string) => {
  const { data, error } = await supabase
    .from('community_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const getCommunityPostCommentCount = async (postId: string) => {
  const { count, error } = await supabase
    .from('community_comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);
  
  if (error) throw error;
  return count || 0;
};

export const createCommunityComment = async (comment: Partial<CommunityComment>) => {
  const { data, error } = await supabase
    .from('community_comments')
    .insert(comment)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as CommunityComment;
};

export const deleteCommunityPost = async (postId: string, userId: string) => {
  // 先检查是否是该用户的帖子
  const { data: post } = await supabase
    .from('community_posts')
    .select('user_id')
    .eq('id', postId)
    .maybeSingle();
  
  if (!post || post.user_id !== userId) {
    throw new Error('无权删除此帖子');
  }
  
  const { error } = await supabase
    .from('community_posts')
    .delete()
    .eq('id', postId);
  
  if (error) throw error;
};

export const deleteHealingContent = async (contentId: string) => {
  const { error } = await supabase
    .from('healing_contents')
    .delete()
    .eq('id', contentId);
  
  if (error) throw error;
};

export const togglePostLike = async (postId: string, userId: string) => {
  // 检查是否已点赞
  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (existing) {
    // 取消点赞
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    return false;
  } else {
    // 添加点赞
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });
    if (error) throw error;
    return true;
  }
};

// ==================== 冥想记录 ====================
export const createMeditationSession = async (session: {
  user_id: string;
  content_id: string;
  duration: number;
  completed?: boolean;
  mood_before?: string;
  mood_after?: string;
  notes?: string;
}) => {
  const { data, error } = await supabase
    .from('meditation_sessions')
    .insert(session)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

// ==================== 融合报告相关 ====================
export const syncReport = async (reportData: {
  user_id: string;
  assessment_id?: string;
  score: number;
  risk_level: number; // 0-100 mapped to risk level
  conversation_history?: any[];
  report_details: any;
  weights: { scale: number; voice: number; expression: number };
}) => {
  // 1. 如果有assessment_id，更新assessment
  let assessmentId = reportData.assessment_id;
  const conversationHistory = reportData.conversation_history ?? reportData.report_details?.scaleData?.conversationHistory ?? [];
  
  if (assessmentId) {
    await updateAssessment(assessmentId, {
      score: reportData.score,
      risk_level: reportData.risk_level, // 这里的risk_level如果是0-10，需要转换
      conversation_history: conversationHistory,
      report: {
        ...reportData.report_details,
        weights: reportData.weights,
        synced_at: new Date().toISOString(),
      },
    });
  } else {
    const lowerBound = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    const { data: recent, error: recentError } = await supabase
      .from('assessments')
      .select('id,report')
      .eq('user_id', reportData.user_id)
      .eq('assessment_type', 'fusion_report')
      .gte('created_at', lowerBound)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    const duplicate = (recent || []).find((item: any) => {
      const report = item.report || {};
      return (
        report.scaleData?.score === reportData.report_details?.scaleData?.score &&
        report.voiceData?.score === reportData.report_details?.voiceData?.score &&
        report.expressionData?.depression_risk_score === reportData.report_details?.expressionData?.depression_risk_score
      );
    });

    if (duplicate) {
      await updateAssessment(duplicate.id, {
        score: reportData.score,
        risk_level: reportData.risk_level,
        conversation_history: conversationHistory,
        report: {
          ...reportData.report_details,
          weights: reportData.weights,
          synced_at: new Date().toISOString(),
        },
      });
      return duplicate.id;
    }

    // 否则创建新的assessment
    const newAssessment = await createAssessment({
      user_id: reportData.user_id,
      assessment_type: 'fusion_report',
      score: reportData.score,
      risk_level: reportData.risk_level,
      conversation_history: conversationHistory,
      report: {
        ...reportData.report_details,
        weights: reportData.weights,
        synced_at: new Date().toISOString(),
      },
    });
    assessmentId = newAssessment?.id;
  }

  // 2. 写入报告中心 (这里假设报告中心就是assessments表，或者是另一张表)
  // 如果有专门的 report_center 表，可以在这里写入。
  // 目前沿用 assessments 表作为历史记录。

  return assessmentId;
};

export const getReportHistory = async (userId: string, filters?: any) => {
  let query = supabase
    .from('assessments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (filters) {
    if (filters.startDate && filters.endDate) {
      query = query.gte('created_at', filters.startDate).lte('created_at', filters.endDate);
    }
    if (filters.riskLevel) {
      // 假设 risk_level 存的是 0-10 或 0-100
      // 需要根据具体存储逻辑过滤
    }
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getMeditationSessions = async (userId: string, limit = 50) => {
  const { data, error } = await supabase
    .from('meditation_sessions')
    .select('*, healing_contents(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const getMeditationStats = async (userId: string) => {
  const { data, error } = await supabase
    .from('meditation_sessions')
    .select('duration, completed')
    .eq('user_id', userId)
    .eq('completed', true);
  
  if (error) throw error;
  
  const sessions = Array.isArray(data) ? data : [];
  const totalMinutes = sessions.reduce((sum, s) => sum + Math.floor(s.duration / 60), 0);
  const totalSessions = sessions.length;
  
  return { totalMinutes, totalSessions };
};

// ==================== 内容收藏 ====================
export const toggleFavorite = async (userId: string, contentId: string) => {
  const { data: existing } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .maybeSingle();
  
  if (existing) {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from('user_favorites')
      .insert({ user_id: userId, content_id: contentId });
    if (error) throw error;
    return true;
  }
};

export const getUserFavorites = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_favorites')
    .select('*, healing_contents(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const isFavorited = async (userId: string, contentId: string) => {
  const { data } = await supabase
    .from('user_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('content_id', contentId)
    .maybeSingle();
  
  return !!data;
};

// ==================== 帖子分类 ====================
export const getPostCategories = async () => {
  const { data, error } = await supabase
    .from('post_categories')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const getCommunityPostsByCategory = async (categoryId?: string, limit = 20) => {
  let query = supabase
    .from('community_posts')
    .select('*, post_categories(*)')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const getRecoveryStories = async (limit = 10) => {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*, post_categories(*)')
    .eq('is_recovery_story', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

// ==================== 内容统计 ====================
export const incrementViewCount = async (contentId: string) => {
  const { error } = await supabase.rpc('increment_view_count', { content_id: contentId });
  if (error) throw error;
};

export const incrementLikeCount = async (contentId: string) => {
  const { error } = await supabase.rpc('increment_like_count', { content_id: contentId });
  if (error) throw error;
};

// ==================== 医生患者关系 ====================
export const getDoctorPatients = async (doctorId: string) => {
  const { data, error } = await supabase
    .from('doctor_patients')
    .select('*, profiles!doctor_patients_patient_id_fkey(*)')
    .eq('doctor_id', doctorId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const addPatient = async (doctorId: string, patientId: string, notes?: string) => {
  const { data, error } = await supabase
    .from('doctor_patients')
    .insert({ doctor_id: doctorId, patient_id: patientId, notes })
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as DoctorPatient;
};

// ==================== 风险预警 ====================
export const getRiskAlerts = async (isHandled?: boolean) => {
  let query = supabase
    .from('risk_alerts')
    .select('*, profiles!risk_alerts_patient_id_fkey(username, full_name)');
  
  if (isHandled !== undefined) {
    query = query.eq('is_handled', isHandled);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const handleRiskAlert = async (alertId: string, handledBy: string, notes?: string) => {
  const { data, error } = await supabase
    .from('risk_alerts')
    .update({
      is_handled: true,
      handled_by: handledBy,
      handled_at: new Date().toISOString(),
      notes,
    })
    .eq('id', alertId)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as RiskAlert;
};

export const createRiskAlert = async (alert: Partial<RiskAlert>) => {
  if (alert.source_id) {
    const { data: existing, error: existingError } = await supabase
      .from('risk_alerts')
      .select('*')
      .eq('source_id', alert.source_id)
      .eq('data_source', alert.data_source || 'fusion_report')
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing) return existing as RiskAlert;
  }

  const { data, error } = await supabase
    .from('risk_alerts')
    .insert(alert)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as RiskAlert;
};

// ==================== 知识库 ====================
export const getKnowledgeBase = async (category?: string) => {
  let query = supabase
    .from('knowledge_base')
    .select('*')
    .eq('is_active', true);
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const createKnowledge = async (knowledge: Partial<KnowledgeBase>) => {
  const { data, error } = await supabase
    .from('knowledge_base')
    .insert(knowledge)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as KnowledgeBase;
};

export const updateKnowledge = async (id: string, updates: Partial<KnowledgeBase>) => {
  const { data, error } = await supabase
    .from('knowledge_base')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as KnowledgeBase;
};

export const deleteKnowledge = async (id: string) => {
  const { error } = await supabase
    .from('knowledge_base')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ==================== AI API调用 ====================
export const chatCompletion = async (messages: ChatMessage[], enableThinking = false) => {
  const { data, error } = await supabase.functions.invoke('chat-completion', {
    body: { messages, enable_thinking: enableThinking },
  });
  
  if (error) throw error;
  return data;
};

export const multimodalAnalysis = async (messages: MultimodalMessage[], enableThinking = false) => {
  const { data, error } = await supabase.functions.invoke('multimodal-analysis', {
    body: { messages, enable_thinking: enableThinking },
  });
  
  if (error) throw error;
  return data;
};

export const speechRecognition = async (audioBase64: string, format: 'wav' | 'm4a', rate: 16000 | 8000, len: number) => {
  const { data, error } = await supabase.functions.invoke('speech-recognition', {
    body: {
      format,
      rate,
      cuid: crypto.randomUUID(),
      speech: audioBase64,
      len,
    },
  });
  if (error) {
    const msg = String((error as any)?.message || 'speech_recognition_error');
    if (/API密钥未配置|apikey|authorization/i.test(msg)) {
      throw new Error('语音识别未配置 API Key，请在 Supabase Functions 环境中设置 INTEGRATIONS_API_KEY');
    }
    throw error;
  }
  return data;
};

// RAG检索 - 主动式对话
export const ragRetrieval = async (query: string, conversationHistory: ChatMessage[], assessmentType: string = 'PHQ-9') => {
  const { data, error } = await supabase.functions.invoke('rag-retrieval', {
    body: {
      query,
      conversation_history: conversationHistory,
      assessment_type: assessmentType,
    },
  });
  if (error) throw error;
  return data;
};

// 多模态情绪融合分析
export const multimodalFusion = async (params: {
  text_analysis?: any;
  image_analysis?: any;
  voice_analysis?: any;
  video_analysis?: any;
  user_id: string;
  assessment_id: string;
}) => {
  const { data, error } = await supabase.functions.invoke('multimodal-fusion', {
    body: params,
  });
  if (error) throw error;
  return data;
};

// ==================== 知识文档管理 ====================
// 上传知识文档到Storage
export const uploadKnowledgeDocument = async (file: File, category: string) => {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${category}/${timestamp}_${sanitizedName}`;
  
  const { data, error } = await supabase.storage
    .from('knowledge-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;
  return { path: data.path, name: file.name, size: file.size, type: file.type };
};

// 删除知识文档
export const deleteKnowledgeDocument = async (filePath: string) => {
  const { error } = await supabase.storage
    .from('knowledge-documents')
    .remove([filePath]);
    
  if (error) throw error;
};

// 获取文档公开URL
export const getKnowledgeDocumentUrl = (filePath: string) => {
  const { data } = supabase.storage
    .from('knowledge-documents')
    .getPublicUrl(filePath);
    
  return data.publicUrl;
};

// ==================== 医生验证码管理 ====================
export interface DoctorVerificationCode {
  id: string;
  code: string;
  is_permanent: boolean;
  is_used: boolean;
  used_by?: string;
  used_at?: string;
  created_by?: string;
  created_at: string;
  notes?: string;
}

// 获取所有验证码（仅医生和管理员可用）
export const getVerificationCodes = async () => {
  const { data, error } = await supabase
    .from('doctor_verification_codes')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

// 创建验证码
export const createVerificationCode = async (code: string, notes?: string, createdBy?: string) => {
  const { data, error } = await supabase
    .from('doctor_verification_codes')
    .insert({
      code,
      is_permanent: false,
      is_used: false,
      notes,
      created_by: createdBy,
    })
    .select()
    .maybeSingle();
  
  if (error) throw error;
  return data as DoctorVerificationCode;
};

// 删除验证码（仅能删除非永久验证码）
export const deleteVerificationCode = async (id: string) => {
  const { error } = await supabase
    .from('doctor_verification_codes')
    .delete()
    .eq('id', id)
    .eq('is_permanent', false); // 确保不能删除永久验证码
  
  if (error) throw error;
};

// 验证码校验（用于注册时）
export const verifyCode = async (code: string) => {
  // Normalize user input to avoid false negatives caused by spaces/full-width chars.
  const normalizedCode = code
    .trim()
    .replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
  const { data, error } = await supabase
    .from('doctor_verification_codes')
    .select('*')
    .eq('code', normalizedCode)
    .maybeSingle();
  
  if (error) throw error;
  
  if (!data) {
    return { valid: false, message: '验证码不存在' };
  }
  
  if (!data.is_permanent && data.is_used) {
    return { valid: false, message: '验证码已被使用' };
  }
  
  return { valid: true, data };
};

// 标记验证码为已使用
export const markCodeAsUsed = async (code: string, userId: string) => {
  const normalizedCode = code
    .trim()
    .replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );
  const { error } = await supabase.rpc('verify_and_use_code', {
    p_code: normalizedCode,
    p_user_id: userId,
  });
  
  if (error) throw error;
};
