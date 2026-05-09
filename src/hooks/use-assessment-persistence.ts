import { useCallback } from 'react';

/** 存储版本号，升级时清除旧版数据 */
const STORAGE_VERSION = 'v1';
/** 单条记录最大保留天数 */
const MAX_AGE_DAYS = 7;

export interface PersistedMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  /** ISO 8601 字符串，避免 Date 序列化问题 */
  timestamp: string;
  avatar?: string;
}

export interface AssessmentSession {
  /** 格式: STORAGE_VERSION */
  version: string;
  /** 用户 ID，用于隔离不同账户的数据 */
  userId: string;
  /** 选中的量表 ID 列表 */
  selectedScales: string[];
  /** 当前问题索引 */
  currentQuestionIndex: number;
  /** 题目总数 */
  totalQuestions: number;
  /** 对话消息列表 */
  messages: PersistedMessage[];
  /** 最后更新时间（ISO 8601） */
  updatedAt: string;
  /** 是否已完成（完成后清除临时数据） */
  completed: boolean;
}

/** 根据 userId 生成唯一 localStorage key */
function buildKey(userId: string): string {
  return `mindcare_assessment_session_${STORAGE_VERSION}_${userId}`;
}

/** 判断一条记录是否已过期 */
function isExpired(session: AssessmentSession): boolean {
  const updated = new Date(session.updatedAt).getTime();
  const now = Date.now();
  return now - updated > MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

/** 清理所有旧版本或过期的评估存储条目 */
function pruneOldEntries(currentUserId: string): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // 只处理本应用的 key
      if (!key.startsWith('mindcare_assessment_session_')) continue;
      // 旧版本 key（不含当前版本号）
      if (!key.includes(`_${STORAGE_VERSION}_`)) {
        keysToRemove.push(key);
        continue;
      }
      // 其他用户的 key 不处理
      if (!key.endsWith(`_${currentUserId}`)) continue;
      // 检查当前用户数据是否过期
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const session: AssessmentSession = JSON.parse(raw);
        if (isExpired(session) || session.completed) {
          keysToRemove.push(key);
        }
      } catch {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // localStorage 不可用时静默失败
  }
}

export function useAssessmentPersistence(userId: string) {
  const storageKey = buildKey(userId);

  /** 读取当前会话，若不存在或过期则返回 null */
  const loadSession = useCallback((): AssessmentSession | null => {
    if (!userId) return null;
    try {
      // 顺带清理过期/旧版数据
      pruneOldEntries(userId);
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const session: AssessmentSession = JSON.parse(raw);
      // 版本不匹配或已过期或已完成，视为无效
      if (
        session.version !== STORAGE_VERSION ||
        session.userId !== userId ||
        isExpired(session) ||
        session.completed
      ) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }, [storageKey, userId]);

  /** 保存/更新当前会话 */
  const saveSession = useCallback(
    (data: Pick<AssessmentSession, 'selectedScales' | 'currentQuestionIndex' | 'totalQuestions' | 'messages'>) => {
      if (!userId) return;
      try {
        const session: AssessmentSession = {
          version: STORAGE_VERSION,
          userId,
          updatedAt: new Date().toISOString(),
          completed: false,
          ...data,
        };
        localStorage.setItem(storageKey, JSON.stringify(session));
      } catch {
        // 存储空间不足时静默失败
      }
    },
    [storageKey, userId]
  );

  /** 标记评估已完成并清除存储 */
  const clearSession = useCallback(() => {
    if (!userId) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey, userId]);

  /** 检查是否存在未完成会话（不加载完整数据，用于决策是否显示恢复提示） */
  const hasUnfinishedSession = useCallback((): boolean => {
    return loadSession() !== null;
  }, [loadSession]);

  return { loadSession, saveSession, clearSession, hasUnfinishedSession };
}
