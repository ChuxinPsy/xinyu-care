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
import {
  callRpc,
  deleteRows,
  deleteStorageFiles,
  insertRow,
  invokeFunction,
  publicStorageUrl,
  selectMaybeSingle,
  selectRows,
  updateRow,
  uploadStorageFile,
  type FilterCondition,
  type OrderCondition,
} from '@/lib/backend-api';

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

const eq = (field: string, value: unknown): FilterCondition => ({ op: 'eq', field, value });
const gte = (field: string, value: unknown): FilterCondition => ({ op: 'gte', field, value });
const lte = (field: string, value: unknown): FilterCondition => ({ op: 'lte', field, value });
const desc = (field: string): OrderCondition => ({ field, ascending: false });
const asc = (field: string): OrderCondition => ({ field, ascending: true });

const normalizeCode = (code: string) =>
  code
    .trim()
    .replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    );

async function listRows<T>(
  table: string,
  options: {
    filters?: FilterCondition[];
    orders?: OrderCondition[];
    limit?: number;
    count?: boolean;
    head?: boolean;
  } = {}
) {
  const envelope = await selectRows<T>(table, options);
  return {
    rows: Array.isArray(envelope.data) ? envelope.data : [],
    count: envelope.count || 0,
  };
}

// 用户档案
export const getProfile = async (userId: string) =>
  selectMaybeSingle<Profile>('profiles', { filters: [eq('id', userId)] });

export const updateProfile = async (userId: string, updates: Partial<Profile>) =>
  updateRow<Profile>('profiles', updates as Record<string, unknown>, [eq('id', userId)]);

export const getAllProfiles = async () => {
  const { rows } = await listRows<Profile>('profiles', { orders: [desc('created_at')] });
  return rows;
};

// 情绪日记
export const getEmotionDiaries = async (userId: string, limit = 30) => {
  const { rows } = await listRows<EmotionDiary>('emotion_diaries', {
    filters: [eq('user_id', userId)],
    orders: [desc('diary_date')],
    limit,
  });
  return rows;
};

export const getEmotionDiaryByDate = async (userId: string, date: string) =>
  selectMaybeSingle<EmotionDiary>('emotion_diaries', {
    filters: [eq('user_id', userId), eq('diary_date', date)],
  });

export const createEmotionDiary = async (diary: Partial<EmotionDiary>) =>
  insertRow<EmotionDiary>('emotion_diaries', diary as Record<string, unknown>, {
    upsert: true,
    onConflict: 'user_id,diary_date',
  });

export const updateEmotionDiary = async (id: string, updates: Partial<EmotionDiary>) =>
  updateRow<EmotionDiary>('emotion_diaries', updates as Record<string, unknown>, [eq('id', id)]);

export const deleteEmotionDiary = async (id: string) => {
  await deleteRows('emotion_diaries', [eq('id', id)]);
};

// 评估记录
export const getAssessments = async (userId: string, limit = 10) => {
  const { rows } = await listRows<Assessment>('assessments', {
    filters: [eq('user_id', userId)],
    orders: [desc('created_at')],
    limit,
  });
  return dedupeAssessments(rows).slice(0, limit);
};

export const getAllAssessments = async (limit = 1000) => {
  const { rows } = await listRows<Assessment>('assessments', { orders: [desc('created_at')], limit });
  return dedupeAssessments(rows).slice(0, limit);
};

export const getAllEmotionDiaries = async (limit = 1000) => {
  const { rows } = await listRows<EmotionDiary>('emotion_diaries', {
    orders: [desc('diary_date')],
    limit,
  });
  return rows;
};

export const getAssessmentById = async (id: string) =>
  selectMaybeSingle<Assessment>('assessments', { filters: [eq('id', id)] });

export const createAssessment = async (assessment: Partial<Assessment>) =>
  insertRow<Assessment>('assessments', assessment as Record<string, unknown>);

export const updateAssessment = async (id: string, updates: Partial<Assessment>) =>
  updateRow<Assessment>('assessments', updates as Record<string, unknown>, [eq('id', id)]);

// 手环数据
export const getWearableData = async (userId: string, limit = 30) => {
  const { rows } = await listRows<WearableData>('wearable_data', {
    filters: [eq('user_id', userId)],
    orders: [desc('record_date')],
    limit,
  });
  return rows;
};

export const getWearableDataByDateRange = async (userId: string, startDate: string, endDate: string) => {
  const { rows } = await listRows<WearableData>('wearable_data', {
    filters: [eq('user_id', userId), gte('record_date', startDate), lte('record_date', endDate)],
    orders: [asc('record_date')],
  });
  return rows;
};

export const getLatestWearableData = async (userId: string) =>
  selectMaybeSingle<WearableData>('wearable_data', {
    filters: [eq('user_id', userId)],
    orders: [desc('record_date')],
  });

export const createWearableData = async (wearableData: Partial<WearableData>) =>
  insertRow<WearableData>('wearable_data', wearableData as Record<string, unknown>);

export const updateWearableData = async (id: string, updates: Partial<WearableData>) =>
  updateRow<WearableData>('wearable_data', updates as Record<string, unknown>, [eq('id', id)]);

export const upsertWearableData = async (wearableData: Partial<WearableData>) =>
  insertRow<WearableData>('wearable_data', wearableData as Record<string, unknown>, {
    upsert: true,
    onConflict: 'user_id,record_date',
  });

// 疗愈内容
export const getHealingContents = async (category?: string) => {
  const filters = [eq('is_active', true)];
  if (category) filters.push(eq('category', category));
  const { rows } = await listRows<HealingContent>('healing_contents', {
    filters,
    orders: [desc('created_at')],
  });
  return rows;
};

export const createHealingRecord = async (record: Partial<UserHealingRecord>) =>
  insertRow<UserHealingRecord>('user_healing_records', record as Record<string, unknown>);

export const getHealingRecords = async (userId: string, limit = 20) => {
  const { rows } = await listRows<UserHealingRecord>('user_healing_records', {
    filters: [eq('user_id', userId)],
    orders: [desc('created_at')],
    limit,
  });
  return rows;
};

// 社区
export const getCommunityPosts = async (limit = 20) => {
  const { rows } = await listRows<CommunityPost>('community_posts', {
    filters: [eq('is_hidden', false)],
    orders: [desc('is_pinned'), desc('created_at')],
    limit,
  });
  return rows;
};

export const createCommunityPost = async (post: Partial<CommunityPost>) => {
  const payload = {
    ...post,
    anonymous_name: post.anonymous_name || post.anonymous_nickname || '匿名用户',
  };
  return insertRow<CommunityPost>('community_posts', payload as Record<string, unknown>);
};

export const getCommunityComments = async (postId: string) => {
  const { rows } = await listRows<CommunityComment>('community_comments', {
    filters: [eq('post_id', postId)],
    orders: [asc('created_at')],
  });
  return rows;
};

export const getCommunityPostCommentCount = async (postId: string) => {
  const { count } = await listRows<CommunityComment>('community_comments', {
    filters: [eq('post_id', postId)],
    head: true,
    count: true,
  });
  return count;
};

export const createCommunityComment = async (comment: Partial<CommunityComment>) =>
  insertRow<CommunityComment>('community_comments', comment as Record<string, unknown>);

export const deleteCommunityPost = async (postId: string, userId: string) => {
  const post = await selectMaybeSingle<CommunityPost>('community_posts', { filters: [eq('id', postId)] });
  if (!post || post.user_id !== userId) {
    throw new Error('无权删除此帖子');
  }
  await deleteRows('community_posts', [eq('id', postId)]);
};

export const deleteHealingContent = async (contentId: string) => {
  await deleteRows('healing_contents', [eq('id', contentId)]);
};

export const togglePostLike = async (postId: string, userId: string) => {
  const existing = await selectMaybeSingle<{ id: string }>('post_likes', {
    filters: [eq('post_id', postId), eq('user_id', userId)],
  });
  if (existing) {
    await deleteRows('post_likes', [eq('id', existing.id)]);
    return false;
  }
  await insertRow('post_likes', { post_id: postId, user_id: userId });
  return true;
};

// 冥想记录
export const createMeditationSession = async (session: {
  user_id: string;
  content_id: string;
  duration: number;
  completed?: boolean;
  mood_before?: string;
  mood_after?: string;
  notes?: string;
}) => insertRow('meditation_sessions', session);

// 融合报告
export const syncReport = async (reportData: {
  user_id: string;
  assessment_id?: string;
  score: number;
  risk_level: number;
  conversation_history?: any[];
  report_details: any;
  weights: { scale: number; voice: number; expression: number };
}) => {
  let assessmentId = reportData.assessment_id;
  const conversationHistory =
    reportData.conversation_history ?? reportData.report_details?.scaleData?.conversationHistory ?? [];

  if (assessmentId) {
    await updateAssessment(assessmentId, {
      score: reportData.score,
      risk_level: reportData.risk_level,
      conversation_history: conversationHistory,
      report: {
        ...reportData.report_details,
        weights: reportData.weights,
        synced_at: new Date().toISOString(),
      },
    });
    return assessmentId;
  }

  const lowerBound = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { rows: recent } = await listRows<Assessment>('assessments', {
    filters: [
      eq('user_id', reportData.user_id),
      eq('assessment_type', 'fusion_report'),
      gte('created_at', lowerBound),
    ],
    orders: [desc('created_at')],
    limit: 5,
  });

  const duplicate = recent.find((item: any) => {
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

  const created = await createAssessment({
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
  return created?.id;
};

export const getReportHistory = async (userId: string, filters?: any) => {
  const queryFilters = [eq('user_id', userId)];
  if (filters?.startDate && filters?.endDate) {
    queryFilters.push(gte('created_at', filters.startDate), lte('created_at', filters.endDate));
  }
  const { rows } = await listRows<Assessment>('assessments', {
    filters: queryFilters,
    orders: [desc('created_at')],
  });
  return rows;
};

export const getMeditationSessions = async (userId: string, limit = 50) => {
  const { rows } = await listRows<any>('meditation_sessions', {
    filters: [eq('user_id', userId)],
    orders: [desc('created_at')],
    limit,
  });
  return rows;
};

export const getMeditationStats = async (userId: string) => {
  const { rows } = await listRows<{ duration: number; completed: boolean }>('meditation_sessions', {
    filters: [eq('user_id', userId), eq('completed', true)],
  });
  const totalMinutes = rows.reduce((sum, item) => sum + Math.floor((item.duration || 0) / 60), 0);
  return { totalMinutes, totalSessions: rows.length };
};

// 收藏
export const toggleFavorite = async (userId: string, contentId: string) => {
  const existing = await selectMaybeSingle<{ id: string }>('user_favorites', {
    filters: [eq('user_id', userId), eq('content_id', contentId)],
  });
  if (existing) {
    await deleteRows('user_favorites', [eq('id', existing.id)]);
    return false;
  }
  await insertRow('user_favorites', { user_id: userId, content_id: contentId });
  return true;
};

export const getUserFavorites = async (userId: string) => {
  const { rows } = await listRows<any>('user_favorites', {
    filters: [eq('user_id', userId)],
    orders: [desc('created_at')],
  });
  return rows;
};

export const isFavorited = async (userId: string, contentId: string) =>
  !!(await selectMaybeSingle('user_favorites', {
    filters: [eq('user_id', userId), eq('content_id', contentId)],
  }));

// 分类
export const getPostCategories = async () => {
  const { rows } = await listRows<any>('post_categories', { orders: [asc('created_at')] });
  return rows;
};

export const getCommunityPostsByCategory = async (categoryId?: string, limit = 20) => {
  const filters = categoryId ? [eq('category_id', categoryId)] : undefined;
  const { rows } = await listRows<CommunityPost>('community_posts', {
    filters,
    orders: [desc('created_at')],
    limit,
  });
  return rows;
};

export const getRecoveryStories = async (limit = 10) => {
  const { rows } = await listRows<CommunityPost>('community_posts', {
    filters: [eq('is_recovery_story', true)],
    orders: [desc('created_at')],
    limit,
  });
  return rows;
};

// 内容统计
export const incrementViewCount = async (contentId: string) => {
  await callRpc('increment_view_count', { content_id: contentId });
};

export const incrementLikeCount = async (contentId: string) => {
  await callRpc('increment_like_count', { content_id: contentId });
};

// 医患关系
export const getDoctorPatients = async (_doctorId: string) => {
  const { rows } = await listRows<any>('doctor_patients', { orders: [desc('created_at')] });
  return rows;
};

export const addPatient = async (doctorId: string, patientId: string, notes?: string) =>
  insertRow<DoctorPatient>('doctor_patients', { doctor_id: doctorId, patient_id: patientId, notes });

// 风险预警
export const getRiskAlerts = async (isHandled?: boolean) => {
  const filters = isHandled === undefined ? undefined : [eq('is_handled', isHandled)];
  const { rows } = await listRows<RiskAlert>('risk_alerts', { filters, orders: [desc('created_at')] });
  return rows;
};

export const handleRiskAlert = async (alertId: string, handledBy: string, notes?: string) =>
  updateRow<RiskAlert>(
    'risk_alerts',
    {
      is_handled: true,
      handled_by: handledBy,
      handled_at: new Date().toISOString(),
      notes,
    },
    [eq('id', alertId)]
  );

export const createRiskAlert = async (alert: Partial<RiskAlert>) => {
  if (alert.source_id) {
    const existing = await selectMaybeSingle<RiskAlert>('risk_alerts', {
      filters: [eq('source_id', alert.source_id), eq('data_source', alert.data_source || 'fusion_report')],
    });
    if (existing) {
      return existing;
    }
  }
  return insertRow<RiskAlert>('risk_alerts', alert as Record<string, unknown>);
};

// 知识库
export const getKnowledgeBase = async (category?: string) => {
  const filters = [eq('is_active', true)];
  if (category) filters.push(eq('category', category));
  const { rows } = await listRows<KnowledgeBase>('knowledge_base', {
    filters,
    orders: [desc('created_at')],
  });
  return rows;
};

export const createKnowledge = async (knowledge: Partial<KnowledgeBase>) =>
  insertRow<KnowledgeBase>('knowledge_base', knowledge as Record<string, unknown>);

export const updateKnowledge = async (id: string, updates: Partial<KnowledgeBase>) =>
  updateRow<KnowledgeBase>('knowledge_base', updates as Record<string, unknown>, [eq('id', id)]);

export const deleteKnowledge = async (id: string) => {
  await deleteRows('knowledge_base', [eq('id', id)]);
};

// AI
export const chatCompletion = async (messages: ChatMessage[], enableThinking = false) =>
  invokeFunction<any>('chat-completion', { messages, enable_thinking: enableThinking });

export const multimodalAnalysis = async (messages: MultimodalMessage[], enableThinking = false) =>
  invokeFunction<any>('multimodal-analysis', { messages, enable_thinking: enableThinking });

export const speechRecognition = async (
  audioBase64: string,
  format: 'wav' | 'm4a',
  rate: 16000 | 8000,
  len: number
) => invokeFunction<any>('speech-recognition', {
  format,
  rate,
  cuid: crypto.randomUUID(),
  speech: audioBase64,
  len,
});

export const ragRetrieval = async (
  query: string,
  conversationHistory: ChatMessage[],
  assessmentType = 'PHQ-9'
) => invokeFunction<any>('rag-retrieval', {
  query,
  conversation_history: conversationHistory,
  assessment_type: assessmentType,
});

export const multimodalFusion = async (params: {
  text_analysis?: any;
  image_analysis?: any;
  voice_analysis?: any;
  video_analysis?: any;
  user_id: string;
  assessment_id: string;
}) => invokeFunction<any>('multimodal-fusion', params);

// 知识文档
export const uploadKnowledgeDocument = async (file: File, category: string) => {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${category}/${timestamp}_${sanitizedName}`;
  const data = await uploadStorageFile('knowledge-documents', filePath, file);
  return { path: data.path, name: file.name, size: file.size, type: file.type };
};

export const deleteKnowledgeDocument = async (filePath: string) => {
  await deleteStorageFiles('knowledge-documents', [filePath]);
};

export const getKnowledgeDocumentUrl = (filePath: string) =>
  publicStorageUrl('knowledge-documents', filePath);

// 医生验证码
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

export const getVerificationCodes = async () => {
  const { rows } = await listRows<DoctorVerificationCode>('doctor_verification_codes', {
    orders: [desc('created_at')],
  });
  return rows;
};

export const createVerificationCode = async (code: string, notes?: string, createdBy?: string) =>
  insertRow<DoctorVerificationCode>('doctor_verification_codes', {
    code,
    is_permanent: false,
    is_used: false,
    notes,
    created_by: createdBy,
  });

export const deleteVerificationCode = async (id: string) => {
  await deleteRows('doctor_verification_codes', [eq('id', id), eq('is_permanent', false)]);
};

export const verifyCode = async (code: string) => {
  const data = await selectMaybeSingle<DoctorVerificationCode>('doctor_verification_codes', {
    filters: [eq('code', normalizeCode(code))],
  });
  if (!data) {
    return { valid: false, message: '验证码不存在' };
  }
  if (!data.is_permanent && data.is_used) {
    return { valid: false, message: '验证码已被使用' };
  }
  return { valid: true, data };
};

export const markCodeAsUsed = async (code: string, userId: string) => {
  await callRpc('verify_and_use_code', {
    p_code: normalizeCode(code),
    p_user_id: userId,
  });
};
