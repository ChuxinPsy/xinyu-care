import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, ClipboardList, Download, Info, Printer, Send, Smile, Stethoscope, History, FileText, Calendar, AlertCircle, Activity, RotateCcw, Brain } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAssessmentPersistence } from '@/hooks/use-assessment-persistence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { getKnowledgeBase } from '@/db/api';
import { modelScopeChatCompletion, formatAIResponse } from '@/db/modelscope';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  avatar?: string;
}

interface HistoryAssessment {
  id: string;
  date: Date;
  scaleTypes: string[];
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
  summary: string;
  messages: Message[];
  reportData: {
    score: number;
    riskLevel: 'low' | 'medium' | 'high';
    suggestion: string;
    dimensionScores?: Array<{ label: string; score: number; max?: number }>;
  };
}

interface ScaleStepProps {
  onComplete: (data: any) => void;
  userId: string;
}

type ScaleJson = { type: 'scale'; scale_id: string; name: string; description?: string; questions: { text: string }[] }
const SCALES = [
  { id: 'PHQ-9', name: '健康问卷', total: 9, description: '用于筛查抑郁症状及其严重程度', duration: 5 },
  { id: 'HAMD-17', name: '汉密尔顿量表', total: 17, description: '临床评估抑郁状态的标准量表', duration: 8 },
  { id: 'SDS-20', name: '自评量表', total: 20, description: '直观反映抑郁的主观感受', duration: 10 },
];

// 内置标准量表题目（与医生端知识库保持一致），确保网络不可用时也能正常运作
const BUILTIN_SCALE_QUESTIONS: Record<string, string[]> = {
  'PHQ-9': [
    '兴趣减退：做事提不起劲或没有兴趣？',
    '情绪低落：感到忧郁、沮丧或绝望？',
    '睡眠问题：入睡困难、多梦、早醒或睡眠过多？',
    '精力不足：感觉疲倦或没有体力？',
    '食欲改变：食欲不振或暴饮暴食？',
    '自我评价低：觉得自己很失败或让自己/家人失望？',
    '注意力困难：很难集中注意力，例如阅读或看电视？',
    '精神运动改变：行动或说话变慢，或烦躁坐立不安？',
    '自伤/自杀意念：有轻生或自残的念头？',
  ],
  'HAMD-17': [
    '抑郁心境：过去一周大部分时间感到抑郁、悲伤？',
    '罪疚感：对过往或现状有明显内疚或自责？',
    '自杀意念：出现轻生或自伤想法与言语？',
    '入睡困难：卧床后半小时以上不能入睡？',
    '睡眠维持：夜间多次醒来且难以再入睡？',
    '早醒：较平时更早醒且无法再睡？',
    '工作/活动减少：工作效率下降或兴趣显著降低？',
    '精神运动迟滞：动作、言语明显缓慢？',
    '激越：烦躁不安，坐立不宁或来回走动？',
    '焦虑（心理）：紧张、担忧、容易紧张的主观体验？',
    '焦虑（躯体）：心悸、出汗、手抖等躯体症状？',
    '胃肠道症状：食欲下降、恶心或胃部不适？',
    '全身躯体症状：头痛、乏力、身体不适？',
    '性功能症状：性欲减退或相关问题？',
    '疑病倾向：过度担心身体疾病？',
    '体重下降：近期体重较以往明显减少？',
    '洞察力：对自身病情的认识与配合程度如何？',
  ],
  'SDS-20': [
    '心境低落：我觉得心情不好，心里很难过？',
    '早晨状态：我觉得早晨心情最好？',
    '哭泣倾向：我要哭，或者想哭？',
    '睡眠问题：我夜间睡眠不好？',
    '食欲情况：我吃饭跟平时一样多？',
    '人际愉悦：我跟异性接触时，和以往一样感到愉快？',
    '体重变化：我发觉我的体重在下降？',
    '便秘困扰：我有便秘的苦恼？',
    '心率变化：我心跳比平时快？',
    '疲乏感：我无缘无故地感到疲乏？',
    '思维清晰度：我的头脑跟平时一样清楚？',
    '做事难度：我觉得做任何事情都没有困难？',
    '焦虑不安：我觉得不安而平静不下来？',
    '未来期望：我对未来抱有希望？',
    '易激惹：我比平时更容易激怒？',
    '决策能力：我觉得决定什么事很容易？',
    '自我价值：我觉得自己是个有用的人，有人需要我？',
    '生活意义：我的生活很有意义？',
    '自杀意念：我觉得如果我死了，别人会生活得更好？',
    '兴趣保持：我仍然喜爱我平时喜爱的东西？',
  ],
};

// 预设头像选项 (与 ProfilePageRedesigned 保持一致)
const PRESET_AVATARS = [
  { id: 'avatar1', emoji: '🧘', bg: 'bg-gradient-to-br from-rose-400 to-orange-300' },
  { id: 'avatar2', emoji: '🌸', bg: 'bg-gradient-to-br from-pink-400 to-rose-300' },
  { id: 'avatar3', emoji: '🌿', bg: 'bg-gradient-to-br from-emerald-400 to-teal-300' },
  { id: 'avatar4', emoji: '☀️', bg: 'bg-gradient-to-br from-amber-400 to-yellow-300' },
  { id: 'avatar5', emoji: '🌊', bg: 'bg-gradient-to-br from-blue-400 to-cyan-300' },
];

/** 确保字符串末尾有中文问号（模块级可复用） */
function ensureQuestionMark(question: string): string {
  const trimmed = question.trim();
  if (!trimmed) return trimmed;
  if (trimmed.endsWith('？') || trimmed.endsWith('?')) return trimmed;
  return `${trimmed}？`;
}

/** 从内置题库或 questionBank 中获取指定索引的题目（已含问号） */
function getQuestionAt(
  index: number,
  questionBank: string[],
  selectedScales: string[]
): string {
  // 优先使用已加载的 questionBank
  if (questionBank.length > 0) {
    const q = questionBank[index] ?? questionBank[questionBank.length - 1] ?? '';
    return ensureQuestionMark(q);
  }
  // 降级到内置题库：按 selectedScales 顺序拼接所有题目
  const allBuiltin = selectedScales.flatMap(id => BUILTIN_SCALE_QUESTIONS[id] ?? []);
  if (allBuiltin.length > 0) {
    const q = allBuiltin[index] ?? allBuiltin[allBuiltin.length - 1] ?? '';
    return ensureQuestionMark(q);
  }
  return ensureQuestionMark('请描述一下您最近两周的心情与兴趣变化');
}

// 常用表情列表
const EMOJI_LIST = [
  '😊', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗',
  '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨',
  '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞',
  '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫',
  '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
  '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥',
  '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐',
  '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲',
  '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢',
  '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '👍',
  '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️', '🤞',
  '🤟', '🤘', '🤙', '💪', '🦾', '🖕', '✍️', '🤳',
  '💅', '🦵', '🦿', '🦶', '👂', '🦻', '👃', '🧠',
  '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'
];

// 医生默认头像
const DOCTOR_AVATAR = 'https://www.keaitupian.cn/cjpic/frombd/1/253/56496682/3498759028.jpg';

// 模拟历史评估数据 - 包含完整的题目和对话
const MOCK_HISTORY_ASSESSMENTS: HistoryAssessment[] = [
  {
    id: 'assess-001',
    date: new Date(2024, 0, 15, 14, 30),
    scaleTypes: ['PHQ-9'],
    riskLevel: 'low',
    score: 8,
    summary: '整体心理状态良好，偶尔有轻微焦虑情绪，建议保持规律作息。',
    messages: [
      { role: 'assistant', content: '你好！我是心域智护助手。接下来我们将进行 PHQ-9 评估。我会以温暖、共情的方式引导你逐步完成，每一步都会解释目的。我们开始吧？', timestamp: new Date(2024, 0, 15, 14, 30), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '好的，我准备好了', timestamp: new Date(2024, 0, 15, 14, 31) },
      { role: 'assistant', content: '【第1题】在过去两周内，你是否经常感到心情低落、沮丧或绝望？', timestamp: new Date(2024, 0, 15, 14, 31), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '偶尔会有这样的感觉，大概一周有2-3天吧', timestamp: new Date(2024, 0, 15, 14, 32) },
      { role: 'assistant', content: '【第2题】你是否对平时感兴趣的事情失去了兴趣或乐趣？', timestamp: new Date(2024, 0, 15, 14, 32), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '还好，平时喜欢的运动和阅读还是挺有兴趣的', timestamp: new Date(2024, 0, 15, 14, 33) },
      { role: 'assistant', content: '【第3题】你是否感到入睡困难、睡不安稳或睡眠过多？', timestamp: new Date(2024, 0, 15, 14, 33), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '有时候入睡会比较慢，大概需要30分钟左右', timestamp: new Date(2024, 0, 15, 14, 34) },
      { role: 'assistant', content: '【第4题】你是否感到疲倦或没有活力？', timestamp: new Date(2024, 0, 15, 14, 34), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '工作日下午会有点累，但周末休息后就恢复了', timestamp: new Date(2024, 0, 15, 14, 35) },
      { role: 'assistant', content: '【第5题】你是否食欲不振或吃太多？', timestamp: new Date(2024, 0, 15, 14, 35), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '食欲正常，没有特别的变化', timestamp: new Date(2024, 0, 15, 14, 36) },
      { role: 'assistant', content: '【第6题】你是否觉得自己很糟，或觉得自己很失败，或让自己或家人失望？', timestamp: new Date(2024, 0, 15, 14, 36), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '偶尔会有这种想法，但不会持续太久', timestamp: new Date(2024, 0, 15, 14, 37) },
      { role: 'assistant', content: '【第7题】你是否难以集中注意力，例如阅读报纸或看电视时？', timestamp: new Date(2024, 0, 15, 14, 37), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '有时候会有点分心，但总体还好', timestamp: new Date(2024, 0, 15, 14, 38) },
      { role: 'assistant', content: '【第8题】你是否动作或说话速度缓慢到别人已经察觉？或者正好相反——烦躁或坐立不安、动来动去的情况更胜于平常？', timestamp: new Date(2024, 0, 15, 14, 38), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '没有这种情况', timestamp: new Date(2024, 0, 15, 14, 39) },
      { role: 'assistant', content: '【第9题】你是否有过不如死掉或用某种方式伤害自己的念头？', timestamp: new Date(2024, 0, 15, 14, 39), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '从来没有', timestamp: new Date(2024, 0, 15, 14, 40) },
      { role: 'assistant', content: '感谢你的配合！PHQ-9评估已完成。根据你的回答，你的得分是8分，属于低风险范围。整体心理状态良好，建议继续保持规律作息和适度运动。', timestamp: new Date(2024, 0, 15, 14, 41), avatar: DOCTOR_AVATAR }
    ],
    reportData: {
      score: 8,
      riskLevel: 'low',
      suggestion: '您的得分反映出心理状态相对健康，请继续保持积极的生活方式。'
    }
  },
  {
    id: 'assess-002',
    date: new Date(2024, 0, 22, 10, 15),
    scaleTypes: ['PHQ-9', 'HAMD-17'],
    riskLevel: 'medium',
    score: 15,
    summary: '存在一定程度的抑郁倾向，建议通过运动、社交等方式调节情绪。',
    messages: [
      { role: 'assistant', content: '你好！今天我们将进行 PHQ-9, HAMD-17 综合评估。这将帮助我们更全面地了解你的心理状态。准备好了吗？', timestamp: new Date(2024, 0, 22, 10, 15), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '嗯，可以开始', timestamp: new Date(2024, 0, 22, 10, 16) },
      { role: 'assistant', content: '【PHQ-9 第1题】最近两周，你的睡眠质量如何？是否有入睡困难或早醒的情况？', timestamp: new Date(2024, 0, 22, 10, 16), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '睡眠确实不太好，经常要一两个小时才能入睡', timestamp: new Date(2024, 0, 22, 10, 17) },
      { role: 'assistant', content: '【PHQ-9 第2题】你是否感到心情低落、沮丧或绝望？', timestamp: new Date(2024, 0, 22, 10, 17), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '是的，最近工作压力很大，经常感到沮丧', timestamp: new Date(2024, 0, 22, 10, 18) },
      { role: 'assistant', content: '【PHQ-9 第3题】你是否对平时感兴趣的事情失去了兴趣？', timestamp: new Date(2024, 0, 22, 10, 18), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '有时候，以前喜欢的游戏现在玩得少了', timestamp: new Date(2024, 0, 22, 10, 19) },
      { role: 'assistant', content: '【HAMD-17 第1题】抑郁情绪：你是否感到悲伤、沮丧或绝望？程度如何？', timestamp: new Date(2024, 0, 22, 10, 20), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '比较明显，尤其是晚上一个人时', timestamp: new Date(2024, 0, 22, 10, 21) },
      { role: 'assistant', content: '【HAMD-17 第2题】罪恶感：你是否感到内疚或自责？', timestamp: new Date(2024, 0, 22, 10, 21), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '偶尔会觉得对不起家人，没能给他们更好的生活', timestamp: new Date(2024, 0, 22, 10, 22) },
      { role: 'assistant', content: '【HAMD-17 第3题】自杀意念：你是否有过自杀的念头？', timestamp: new Date(2024, 0, 22, 10, 22), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '没有，虽然难过但不会想伤害自己', timestamp: new Date(2024, 0, 22, 10, 23) },
      { role: 'assistant', content: '【HAMD-17 第4题】入睡困难：你入睡需要多长时间？', timestamp: new Date(2024, 0, 22, 10, 23), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '通常需要1-2小时', timestamp: new Date(2024, 0, 22, 10, 24) },
      { role: 'assistant', content: '【HAMD-17 第5题】睡眠不深：你是否容易醒来或睡眠很浅？', timestamp: new Date(2024, 0, 22, 10, 24), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '是的，半夜经常会醒，然后很难再入睡', timestamp: new Date(2024, 0, 22, 10, 25) },
      { role: 'assistant', content: '感谢你的坦诚回答。综合评估已完成，你的得分是15分，属于中度风险。建议通过运动、社交和充足睡眠来调节情绪。', timestamp: new Date(2024, 0, 22, 10, 26), avatar: DOCTOR_AVATAR }
    ],
    reportData: {
      score: 15,
      riskLevel: 'medium',
      suggestion: '您的得分反映出存在一定的心理压力，可以通过运动、社交和充足睡眠来调节。'
    }
  },
  {
    id: 'assess-003',
    date: new Date(2024, 1, 5, 16, 45),
    scaleTypes: ['SDS-20'],
    riskLevel: 'low',
    score: 6,
    summary: '心理状态稳定，情绪管理良好，继续保持当前的生活节奏。',
    messages: [
      { role: 'assistant', content: '你好！我们今天将进行 SDS-20 自评量表评估。这个量表能帮助你更直观地了解自己的情绪状态。', timestamp: new Date(2024, 1, 5, 16, 45), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '好的，开始吧', timestamp: new Date(2024, 1, 5, 16, 46) },
      { role: 'assistant', content: '【SDS-20 第1题】我感到情绪沮丧，郁闷', timestamp: new Date(2024, 1, 5, 16, 46), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '很少有这种感觉', timestamp: new Date(2024, 1, 5, 16, 47) },
      { role: 'assistant', content: '【SDS-20 第2题】我感到早晨心情最好', timestamp: new Date(2024, 1, 5, 16, 47), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '是的，早上精神最好', timestamp: new Date(2024, 1, 5, 16, 48) },
      { role: 'assistant', content: '【SDS-20 第3题】我要哭或想哭', timestamp: new Date(2024, 1, 5, 16, 48), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '几乎没有', timestamp: new Date(2024, 1, 5, 16, 49) },
      { role: 'assistant', content: '【SDS-20 第4题】我夜间睡眠不好', timestamp: new Date(2024, 1, 5, 16, 49), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '睡眠还可以，偶尔做梦', timestamp: new Date(2024, 1, 5, 16, 50) },
      { role: 'assistant', content: '【SDS-20 第5题】我吃饭像平时一样多', timestamp: new Date(2024, 1, 5, 16, 50), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '是的，食欲正常', timestamp: new Date(2024, 1, 5, 16, 51) },
      { role: 'assistant', content: '评估进展顺利。根据目前的回答，你的情绪状态很稳定。SDS-20评估已完成，得分6分，属于低风险范围。', timestamp: new Date(2024, 1, 5, 16, 55), avatar: DOCTOR_AVATAR }
    ],
    reportData: {
      score: 6,
      riskLevel: 'low',
      suggestion: '您的得分反映出心理状态相对健康，请继续保持积极的生活方式。'
    }
  },
  {
    id: 'assess-004',
    date: new Date(2024, 1, 18, 9, 20),
    scaleTypes: ['PHQ-9'],
    riskLevel: 'high',
    score: 22,
    summary: '检测到明显的抑郁症状，强烈建议及时寻求专业心理咨询或医疗帮助。',
    messages: [
      { role: 'assistant', content: '你好！感谢你选择进行心理评估。我会陪伴你完成整个过程，请放松心情，真实表达你的感受。', timestamp: new Date(2024, 1, 18, 9, 20), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '最近状态很不好，想做个评估看看', timestamp: new Date(2024, 1, 18, 9, 21) },
      { role: 'assistant', content: '【第1题】我理解你的感受。过去两周，你是否经常感到心情低落、沮丧或绝望？', timestamp: new Date(2024, 1, 18, 9, 21), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '是的，几乎每天都有这种感觉', timestamp: new Date(2024, 1, 18, 9, 22) },
      { role: 'assistant', content: '【第2题】你是否对平时感兴趣的事情失去了兴趣或乐趣？', timestamp: new Date(2024, 1, 18, 9, 22), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '是的，以前喜欢的事情现在完全不想做', timestamp: new Date(2024, 1, 18, 9, 23) },
      { role: 'assistant', content: '【第3题】你是否感到疲倦或没有活力？', timestamp: new Date(2024, 1, 18, 9, 23), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '是的，每天都感觉很累，做什么都提不起劲', timestamp: new Date(2024, 1, 18, 9, 24) },
      { role: 'assistant', content: '【第4题】你是否食欲不振或吃太多？', timestamp: new Date(2024, 1, 18, 9, 24), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '最近吃得很少，没什么胃口', timestamp: new Date(2024, 1, 18, 9, 25) },
      { role: 'assistant', content: '【第5题】你是否觉得自己很糟，或觉得自己很失败？', timestamp: new Date(2024, 1, 18, 9, 25), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '是的，觉得自己很没用', timestamp: new Date(2024, 1, 18, 9, 26) },
      { role: 'assistant', content: '【第6题】你是否难以集中注意力？', timestamp: new Date(2024, 1, 18, 9, 26), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '是的，很难集中注意力工作', timestamp: new Date(2024, 1, 18, 9, 27) },
      { role: 'assistant', content: '【第7题】你是否动作或说话速度缓慢，或者烦躁坐立不安？', timestamp: new Date(2024, 1, 18, 9, 27), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '动作变慢了，朋友也说我最近很安静', timestamp: new Date(2024, 1, 18, 9, 28) },
      { role: 'assistant', content: '【第8题】你是否有过不如死掉或用某种方式伤害自己的念头？', timestamp: new Date(2024, 1, 18, 9, 28), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '有时候会有这种想法...', timestamp: new Date(2024, 1, 18, 9, 29) },
      { role: 'assistant', content: '【安全预警】检测到您可能存在自杀风险。我们非常关心您的安全。如果您正处于危险中，请立即拨打心理援助热线 400-161-9995 或联系紧急联系人。', timestamp: new Date(2024, 1, 18, 9, 29), avatar: DOCTOR_AVATAR },
      { role: 'assistant', content: '【第9题】这些症状是否影响到你的工作、学习或人际关系？', timestamp: new Date(2024, 1, 18, 9, 30), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '影响很大，已经请假在家休息了', timestamp: new Date(2024, 1, 18, 9, 31) },
      { role: 'assistant', content: '评估已完成。你的得分是22分，属于高风险范围。我强烈建议你尽快寻求专业心理咨询或医疗帮助。请记住，寻求帮助是勇敢的表现，你并不孤单。', timestamp: new Date(2024, 1, 18, 9, 32), avatar: DOCTOR_AVATAR }
    ],
    reportData: {
      score: 22,
      riskLevel: 'high',
      suggestion: '您的得分反映出显著的抑郁倾向，建议尽快咨询专业医生进行干预。'
    }
  },
  {
    id: 'assess-005',
    date: new Date(2024, 1, 25, 14, 0),
    scaleTypes: ['HAMD-17', 'SDS-20'],
    riskLevel: 'medium',
    score: 13,
    summary: '情绪波动较大，需要关注压力来源，建议加强自我调节和放松训练。',
    messages: [
      { role: 'assistant', content: '你好！今天我们将进行 HAMD-17, SDS-20 综合评估。这将从不同维度了解你的心理状态。', timestamp: new Date(2024, 1, 25, 14, 0), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '好的，麻烦了', timestamp: new Date(2024, 1, 25, 14, 1) },
      { role: 'assistant', content: '【HAMD-17 第1题】抑郁情绪：最近一周你的情绪状态如何？', timestamp: new Date(2024, 1, 25, 14, 1), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '情绪起伏比较大，时好时坏', timestamp: new Date(2024, 1, 25, 14, 2) },
      { role: 'assistant', content: '【HAMD-17 第2题】工作兴趣：你对工作的热情如何？', timestamp: new Date(2024, 1, 25, 14, 2), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '工作热情不如以前，有时候会拖延', timestamp: new Date(2024, 1, 25, 14, 3) },
      { role: 'assistant', content: '【HAMD-17 第3题】精神性焦虑：你是否经常感到紧张、担忧？', timestamp: new Date(2024, 1, 25, 14, 3), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '是的，经常担心各种事情', timestamp: new Date(2024, 1, 25, 14, 4) },
      { role: 'assistant', content: '【SDS-20 第1题】我感到情绪沮丧，郁闷', timestamp: new Date(2024, 1, 25, 14, 5), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '有时候会有这种感觉', timestamp: new Date(2024, 1, 25, 14, 6) },
      { role: 'assistant', content: '【SDS-20 第2题】我感到早晨心情最好', timestamp: new Date(2024, 1, 25, 14, 6), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '不一定，有时候早上也很低落', timestamp: new Date(2024, 1, 25, 14, 7) },
      { role: 'assistant', content: '【SDS-20 第3题】我要哭或想哭', timestamp: new Date(2024, 1, 25, 14, 7), avatar: DOCTOR_AVATAR },
      { role: 'user', content: '偶尔会想哭，但忍住了', timestamp: new Date(2024, 1, 25, 14, 8) },
      { role: 'assistant', content: '综合评估已完成，你的得分是13分，属于中度风险。情绪波动较大，建议关注压力来源，适当进行放松训练。', timestamp: new Date(2024, 1, 25, 14, 10), avatar: DOCTOR_AVATAR }
    ],
    reportData: {
      score: 13,
      riskLevel: 'medium',
      suggestion: '您的得分反映出存在一定的心理压力，可以通过运动、社交和充足睡眠来调节。'
    }
  }
];

export default function ScaleStep({ onComplete, userId }: ScaleStepProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedScales, setSelectedScales] = useState<string[]>(['PHQ-9']);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(9);
  const [showReport, setShowReport] = useState(false);
  const [score, setScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [nextButtonDisabled, setNextButtonDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [questionBank, setQuestionBank] = useState<string[]>([]);
  
  // 打字机效果状态
  const [typingMsgIdx, setTypingMsgIdx] = useState<number | null>(null);
  const [typingText, setTypingText] = useState('');
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 历史评估相关状态
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryAssessment | null>(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [showHistoryReport, setShowHistoryReport] = useState(false);

  // 持久化存储 hook（用 userId prop 保证用户隔离）
  const { loadSession, saveSession, clearSession, hasUnfinishedSession } = useAssessmentPersistence(userId);

  // 是否显示"恢复上次评估"Banner
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const listeningRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const asrBusyRef = useRef(false);
  const asrErrorCountRef = useRef(0);
  const webSpeechRef = useRef<any>(null);
  const prefixRef = useRef('');
  const finalTranscriptRef = useRef('');
  // ── KB 模块级缓存：避免每次发送都发起 Supabase 网络请求 ────
  const kbCacheRef = useRef<{ text: string; loaded: boolean }>({ text: '', loaded: false });

  // ── 持久化：组件挂载时检测未完成会话 ──────────────────────
  useEffect(() => {
    if (userId && hasUnfinishedSession()) {
      setShowResumeBanner(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ── KB 预加载：组件挂载后立即后台加载，缓存到 ref，发送时直接命中 ──
  useEffect(() => {
    if (kbCacheRef.current.loaded) return;
    getKnowledgeBase('assessment').then(kb => {
      kbCacheRef.current.text = (kb || []).slice(0, 3)
        .map(k => `【${k.title}】${(k.content || '').slice(0, 200)}`)
        .join('\n');
      kbCacheRef.current.loaded = true;
    }).catch(() => {
      kbCacheRef.current.loaded = true; // 失败也标记为已尝试，后续不再重试
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 持久化：对话过程中实时保存到 localStorage ─────────────
  useEffect(() => {
    if (!started || messages.length === 0) return;
    // 将 Date 对象序列化为 ISO 字符串再存储
    saveSession({
      selectedScales,
      currentQuestionIndex,
      totalQuestions,
      messages: messages.map(m => ({
        ...m,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
      })),
    });
  }, [started, messages, currentQuestionIndex, totalQuestions, selectedScales, saveSession]);

  // ── 打字机效果驱动：逐字推进显示 ────────────────────────────
  useEffect(() => {
    if (typingMsgIdx === null) return;
    const fullText = messages[typingMsgIdx]?.content ?? '';
    if (typingText.length >= fullText.length) {
      // 打字完成，清除打字机状态
      setTypingMsgIdx(null);
      setTypingText('');
      return;
    }

    // 使用 Intl.Segmenter 按字素簇推进（emoji 不被截断），回退到 codePointAt
    let step = 1;
    const remaining = fullText.slice(typingText.length);
    // 检测当前字符是否是 emoji（U+1F000 以上）或代理对
    const cp = remaining.codePointAt(0) ?? 0;
    if (cp > 0xFFFF) step = 2; // surrogate pair (emoji 等)

    // 速度策略：标点/空格 5ms（快速略过），中文 18ms，其他 12ms
    const ch = remaining[0];
    let delay: number;
    if (/[\s，。！？、：；""''（）【】—…]/.test(ch)) {
      delay = 5;
    } else if (/[\u4e00-\u9fa5]/.test(ch)) {
      delay = 18;
    } else {
      delay = 12;
    }

    typingTimerRef.current = setTimeout(() => {
      setTypingText(fullText.slice(0, typingText.length + step));
    }, delay);
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingMsgIdx, typingText, messages]);

  // 获取用户头像信息
  const getUserAvatarInfo = () => {
    if (profile?.avatar_url) {
      if (profile.avatar_url.startsWith('preset:')) {
        const presetId = profile.avatar_url.replace('preset:', '');
        const preset = PRESET_AVATARS.find(a => a.id === presetId);
        if (preset) return { type: 'preset', emoji: preset.emoji, bg: preset.bg };
      }
      return { type: 'image', url: profile.avatar_url };
    }
    return { type: 'fallback' };
  };

  // 获取用户显示名称的首字母
  const getUserInitial = () => {
    if (profile?.full_name) {
      return profile.full_name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // 格式化历史记录的日期
  const formatHistoryDate = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  // 获取风险等级的显示信息
  const getRiskLevelInfo = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return { label: '高风险', color: 'text-rose-500', bgColor: 'bg-rose-50', borderColor: 'border-rose-200' };
      case 'medium':
        return { label: '中风险', color: 'text-amber-500', bgColor: 'bg-amber-50', borderColor: 'border-amber-200' };
      case 'low':
        return { label: '低风险', color: 'text-emerald-500', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' };
    }
  };

  // 智能生成最后的保底回复
  const generateSmartFallback = (userResponse: string, nextQuestion: string): string => {
    const response = userResponse.toLowerCase();
    let empathyPrefix = '';
    
    // 根据用户回答内容智能匹配共情回应
    if (response.includes('经常') || response.includes('总是') || response.includes('每天')) {
      empathyPrefix = '听起来你最近承受着不小的压力 💔，这种持续性的状态确实需要关注，你愿意说出来真的很勇敢。';
    } else if (response.includes('偶尔') || response.includes('有时') || response.includes('不太')) {
      empathyPrefix = '看得出来这种情况是间歇性的 🌤️，你能够觉察到这一点很好，这份自我觉察很重要。';
    } else if (response.includes('没有') || response.includes('不会') || response.includes('很少')) {
      empathyPrefix = '这方面你保持得不错 💪，继续保持这样的状态，这是很积极的信号。';
    } else if (response.includes('不确定') || response.includes('不知道')) {
      empathyPrefix = '这个问题可能需要仔细回想，没关系，我们慢慢来 😘，不用着急。';
    } else if (response.includes('失眠') || response.includes('睡不着')) {
      empathyPrefix = '睡眠问题确实会影响日常生活 😴，这需要我们特别关注，你不是一个人在面对这些。';
    } else if (response.includes('压力') || response.includes('焦虑')) {
      empathyPrefix = '能够觉察到压力和焦虑是很重要的第一步 💦，我们一起来了解你的状态。';
    } else if (response.includes('难过') || response.includes('伤心') || response.includes('沮丧')) {
      empathyPrefix = '你的感受我能理解 💔，允许自己有这样的情绪是正常的，感谢你愿意告诉我。';
    } else if (response.length > 20) {
      // 用户回答较长，说明愿意分享
      empathyPrefix = '感谢你愿意分享这些细节 💖，这对评估很有帮助，你做得很好。';
    } else {
      // 其他情况
      empathyPrefix = '谢谢你的回答 🥰，我们继续慢慢了解你的状态。';
    }
    
    return `${empathyPrefix} 下面我们继续：${nextQuestion}`;
  };

  // 处理表情选择
  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // 常见回答选项
  const QUICK_RESPONSES = ['是的', '不是', '有时候', '经常', '很少'];

  // 处理快捷回答点击 - 直接发送
  const handleQuickResponse = async (response: string) => {
    if (loading) return;
    
    // 创建用户消息
    const userMsg: Message = { 
      role: 'user', 
      content: response, 
      timestamp: new Date() 
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // ── nextQ 取题：优先命中已缓存的 questionBank ──────────
      let nextQ: string;
      if (questionBank.length > 0) {
        nextQ = getQuestionAt(currentQuestionIndex, questionBank, selectedScales);
      } else {
        // questionBank 尚未缓存，临时从 KB 同步（仅首次触发）
        try {
          const kb = await getKnowledgeBase('assessment');
          const scales = kb.map(k => {
            try { return { ...JSON.parse(k.content || '{}'), _title: k.title, _tags: (k.tags || []) as string[] }; }
            catch { return null; }
          }).filter(Boolean) as any[];
          const matched = scales.filter(s =>
            selectedScales.includes(s.scale_id) ||
            selectedScales.some((id: string) => (s._tags as string[]).includes(id)) ||
            selectedScales.some((id: string) => s._title?.includes(id))
          );
          const allQs = matched.flatMap((s: any) =>
            (s.questions || []).slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((q: any) => q.text as string)
          );
          if (allQs.length > 0) {
            setQuestionBank(allQs);
            nextQ = ensureQuestionMark(allQs[currentQuestionIndex] ?? allQs[allQs.length - 1] ?? '');
          } else {
            nextQ = getQuestionAt(currentQuestionIndex, [], selectedScales);
          }
        } catch {
          nextQ = getQuestionAt(currentQuestionIndex, [], selectedScales);
        }
      }

      // ── 对话历史：最近2轮（4条）已足够上下文，减少token输入 ──
      const conversationHistory = messages.slice(-4).map(m => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content
      }));

      // ── 精简 systemPrompt：去除冗余示例，保留核心指令 ────────
      const kbSnippet = kbCacheRef.current.text;
      const systemPrompt = `你是温暖专业的心理咨询师，正在进行${selectedScales.join('、')}量表评估。

回复要求（严格遵守）：
1. 共情回应（20-40字）：针对用户具体回答，个性化反馈，加1-2个情绪emoji（💔💖😴💪🌤️🥰😘💦😳）
2. 自然过渡到下一题：用"下面我们继续："或"接下来："引出 "${nextQ}"
3. 禁止使用"好的/我理解了/我知道了/我能感受到"等空泛词
4. 若用户提到具体时间/频率，必须在回复中体现${kbSnippet ? `\n\n参考：${kbSnippet}` : ''}`;

      const aiResponse = await modelScopeChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user' as const, content: response }
        ]
      });

      let aiContent = formatAIResponse(aiResponse?.text || '');

      // ── 禁用词检测 & Fallback ────────────────────────────────
      const isFallbackNeeded = !aiContent
        || aiContent.length < 20
        || /^(好的|我理解了|我知道了|我能感受到)/.test(aiContent);

      if (isFallbackNeeded) {
        // Fallback：直接用 generateSmartFallback，不再发起第二次 AI 调用（避免双倍延迟）
        aiContent = formatAIResponse(generateSmartFallback(response, nextQ));
      }

      // 模拟问题进度增加
      if (currentQuestionIndex < totalQuestions) {
        setCurrentQuestionIndex(prev => prev + 1);
      }

      const aiMsg: Message = { 
        role: 'assistant', 
        content: aiContent, 
        timestamp: new Date(),
        avatar: DOCTOR_AVATAR 
      };
      setMessages(prev => {
        const newMessages = [...prev, aiMsg];
        // 触发打字机效果：新消息在末尾
        setTypingMsgIdx(newMessages.length - 1);
        setTypingText('');
        return newMessages;
      });

      // 情感与安全检测
      const distress = /(崩溃|绝望|无助|很痛|难受|不想活|自杀|死亡)/.test(response);
      if (distress) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '【安全预警】检测到您可能存在自杀风险。我们非常关心您的安全。如果您正处于危险中，请立即拨打心理援助热线 400-161-9995 或联系紧急联系人。',
          timestamp: new Date(),
          avatar: DOCTOR_AVATAR
        }]);
      }

      // 澄清不确定回答
      if (/(不确定|不太清楚|说不清|不知道)/.test(response)) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '为了更准确评估，我来帮你澄清一下：在过去两周，出现该情况的频率更接近"几天"还是"超过一半天"？',
          timestamp: new Date(),
          avatar: DOCTOR_AVATAR
        }]);
      }

      // 如果完成所有题目
      if (currentQuestionIndex + 1 >= totalQuestions) {
        handleComplete();
      }

    } catch (error) {
      console.error('Quick response error:', error);
      toast.error('服务暂时不可用，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 点击外部关闭表情面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        // 检查点击的是否是表情按钮
        const target = event.target as HTMLElement;
        const isEmojiButton = target.closest('button[aria-label="选择表情"]');
        if (!isEmojiButton) {
          setShowEmojiPicker(false);
        }
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingText]);

  useEffect(() => {
    return () => {
      try {
        stopRequestedRef.current = true;
        listeningRef.current = false;
        webSpeechRef.current?.stop?.();
      } catch {}
    };
  }, []);

  const stopVoiceInput = () => {
    stopRequestedRef.current = true;
    listeningRef.current = false;
    setListening(false);
    try {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    } catch {}
  };

  const startVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mr;

      stopRequestedRef.current = false;
      listeningRef.current = true;
      setListening(true);
      prefixRef.current = inputText ? `${inputText} ` : '';
      finalTranscriptRef.current = '';

      mr.ondataavailable = async (e) => {
        if (!listeningRef.current) return;
        if (e.data?.size > 0 && !asrBusyRef.current) {
          asrBusyRef.current = true;
          try {
            const { transcribeAudio } = await import('@/db/siliconflow');
            const { convertWebmToWav } = await import('@/utils/audio');
            const wavBlob = await convertWebmToWav(e.data);
            const res = await transcribeAudio(wavBlob, 'TeleAI/TeleSpeechASR');
            const text = res?.text || '';
            if (text) setInputText(prev => `${prev}${text}`.trimStart());
            asrErrorCountRef.current = 0;
          } catch (err) {
            asrErrorCountRef.current += 1;
            if (asrErrorCountRef.current >= 2) {
              // fallback to Web Speech for immediate UX
              try { startWebSpeechFallback(); } catch {}
            }
          }
          asrBusyRef.current = false;
        }
      };

      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
      };

      mr.start(800);
    } catch (e: any) {
      // fallback if MediaRecorder unavailable
      try { startWebSpeechFallback(); } catch {}
    }
  };

  function startWebSpeechFallback() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('浏览器不支持实时识别且语音服务不可用');
      return;
    }
    const rec = new SpeechRecognition();
    webSpeechRef.current = rec;
    listeningRef.current = true; setListening(true);
    rec.continuous = true; rec.interimResults = true; rec.lang = 'zh-CN';
    rec.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i]; const text = res?.[0]?.transcript || '';
        if (res.isFinal) setInputText(prev => `${prev}${text}`.trimStart()); else interim += text;
      }
      if (interim) setInputText(prev => `${prev}${interim}`.trimStart());
    };
    rec.onend = () => { if (listeningRef.current) rec.start(); };
    try { rec.start(); } catch {}
  }

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else {
      setNextButtonDisabled(false);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    (async () => {
      try {
        const kb = await getKnowledgeBase('assessment');
        const scales = kb.map(k => {
          try { 
            const json = JSON.parse(k.content || '{}');
            return { ...json, _id: k.id, _title: k.title, _tags: k.tags || [] } as any;
          } catch { return null }
        }).filter(Boolean);
        
        if (scales.length > 0) {
          // 匹配优先级：scale_id 精确匹配 → tags 包含匹配 → title 包含匹配
          const selected = scales.filter(s =>
            selectedScales.includes(s.scale_id) ||
            selectedScales.some(id => (s._tags as string[]).includes(id)) ||
            selectedScales.some(id => s._title?.includes(id))
          );
          const qs = selected.flatMap(s => (s.questions || [])
            .slice()
            .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
            .map((q: any) => q.text));
          if (qs.length > 0) {
            setQuestionBank(qs);
            setTotalQuestions(qs.length);
            return; // KB 加载成功，直接返回
          }
        }
        // KB 匹配失败或为空，使用内置题库兜底
        const builtinQs = selectedScales.flatMap(id => BUILTIN_SCALE_QUESTIONS[id] ?? []);
        if (builtinQs.length > 0) {
          setQuestionBank(builtinQs);
          setTotalQuestions(builtinQs.length);
        }
      } catch (error) {
        console.error('Failed to load scales from KB:', error);
        // 加载异常，也使用内置题库兜底
        const builtinQs = selectedScales.flatMap(id => BUILTIN_SCALE_QUESTIONS[id] ?? []);
        if (builtinQs.length > 0) {
          setQuestionBank(builtinQs);
          setTotalQuestions(builtinQs.length);
        }
      }
    })();
  }, [selectedScales]);

  const startAssessment = () => {
    if (selectedScales.length === 0) {
      toast.error('请至少选择一个量表');
      return;
    }
    
    if (questionBank.length === 0) {
      const total = SCALES.filter(s => selectedScales.includes(s.id)).reduce((acc, s) => acc + s.total, 0);
      setTotalQuestions(total);
    }
    // 清除旧的未完成会话，开始全新评估
    clearSession();
    setShowResumeBanner(false);
    setStarted(true);
    const greetingMsg: Message = {
      role: 'assistant',
      content: ` 👋 Hi, 我是心域智护心理助手，接下来我们将进行 ${selectedScales.join(', ')} 评估。我会以温暖、共情的方式引导你逐步完成，每一步都会解释目的。我们开始吧？`,
      timestamp: new Date(),
      avatar: DOCTOR_AVATAR
    };
    setMessages([greetingMsg]);
    setTypingMsgIdx(0);
    setTypingText('');
  };

  /** 从 localStorage 恢复上次未完成的评估 */
  const handleResumeSession = useCallback(() => {
    const session = loadSession();
    if (!session) {
      setShowResumeBanner(false);
      return;
    }
    setSelectedScales(session.selectedScales);
    setCurrentQuestionIndex(session.currentQuestionIndex);
    setTotalQuestions(session.totalQuestions);
    // 将 ISO 字符串还原为 Date 对象
    setMessages(
      session.messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
    );
    setShowResumeBanner(false);
    setStarted(true);
    toast.success('已恢复上次未完成的评估');
  }, [loadSession]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    if (listening) stopVoiceInput();

    const userMsg: Message = { role: 'user', content: inputText, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // ── nextQ 取题：优先命中已缓存的 questionBank ──────────
      let nextQ: string;
      if (questionBank.length > 0) {
        nextQ = getQuestionAt(currentQuestionIndex, questionBank, selectedScales);
      } else {
        // questionBank 尚未缓存，临时从 KB 同步（仅首次触发）
        try {
          const kb = await getKnowledgeBase('assessment');
          const scales = kb.map(k => {
            try { return { ...JSON.parse(k.content || '{}'), _title: k.title, _tags: (k.tags || []) as string[] }; }
            catch { return null; }
          }).filter(Boolean) as any[];
          const matched = scales.filter(s =>
            selectedScales.includes(s.scale_id) ||
            selectedScales.some((id: string) => (s._tags as string[]).includes(id)) ||
            selectedScales.some((id: string) => s._title?.includes(id))
          );
          const allQs = matched.flatMap((s: any) =>
            (s.questions || []).slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)).map((q: any) => q.text as string)
          );
          if (allQs.length > 0) {
            setQuestionBank(allQs);
            nextQ = ensureQuestionMark(allQs[currentQuestionIndex] ?? allQs[allQs.length - 1] ?? '');
          } else {
            nextQ = getQuestionAt(currentQuestionIndex, [], selectedScales);
          }
        } catch {
          nextQ = getQuestionAt(currentQuestionIndex, [], selectedScales);
        }
      }

      // ── 对话历史：最近2轮（4条）已足够上下文，减少token输入 ──
      const conversationHistory = messages.slice(-4).map(m => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content
      }));

      // ── 精简 systemPrompt：去除冗余示例，保留核心指令 ────────
      const kbSnippet = kbCacheRef.current.text;
      const systemPrompt = `你是温暖专业的心理咨询师，正在进行${selectedScales.join('、')}量表评估。

回复要求（严格遵守）：
1. 共情回应（20-40字）：针对用户具体回答，个性化反馈，加1-2个情绪emoji（💔💖😴💪🌤️🥰😘💦😳）
2. 自然过渡到下一题：用"下面我们继续："或"接下来："引出 "${nextQ}"
3. 禁止使用"好的/我理解了/我知道了/我能感受到"等空泛词
4. 若用户提到具体时间/频率，必须在回复中体现${kbSnippet ? `\n\n参考：${kbSnippet}` : ''}`;

      const aiResponse = await modelScopeChatCompletion({
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user' as const, content: inputText }
        ]
      });

      let aiContent = formatAIResponse(aiResponse?.text || '');

      // ── 禁用词检测 & Fallback ────────────────────────────────
      const isFallbackNeeded = !aiContent
        || aiContent.length < 20
        || /^(好的|我理解了|我知道了|我能感受到)/.test(aiContent);

      if (isFallbackNeeded) {
        // Fallback：直接用 generateSmartFallback，不再发起第二次 AI 调用（避免双倍延迟）
        aiContent = formatAIResponse(generateSmartFallback(inputText, nextQ));
      }

      // 模拟问题进度增加
      if (currentQuestionIndex < totalQuestions) {
        setCurrentQuestionIndex(prev => prev + 1);
      }

      const aiMsg: Message = { role: 'assistant', content: aiContent, timestamp: new Date(), avatar: DOCTOR_AVATAR };
      setMessages(prev => {
        const newMessages = [...prev, aiMsg];
        // 触发打字机效果：新消息在末尾
        setTypingMsgIdx(newMessages.length - 1);
        setTypingText('');
        return newMessages;
      });

      // 情感与安全检测
      const text = inputText;
      const distress = /(崩溃|绝望|无助|很痛|难受|不想活|自杀|死亡)/.test(text);
      if (distress) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '【安全预警】检测到您可能存在自杀风险。我们非常关心您的安全。如果您正处于危险中，请立即拨打心理援助热线 400-161-9995 或联系紧急联系人。',
          timestamp: new Date(),
          avatar: DOCTOR_AVATAR
        }]);
      }

      // 澄清不确定回答
      if (/(不确定|不太清楚|说不清|不知道)/.test(text)) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '为了更准确评估，我来帮你澄清一下：在过去两周，出现该情况的频率更接近"几天"还是"超过一半天"？',
          timestamp: new Date(),
          avatar: DOCTOR_AVATAR
        }]);
      }

      // 如果完成所有题目
      if (currentQuestionIndex + 1 >= totalQuestions) {
        handleComplete();
      }

    } catch (error) {
      console.error('Scale assessment error:', error);
      toast.error('服务暂时不可用，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    // 模拟评分
    const mockScore = Math.floor(Math.random() * 27);
    setScore(mockScore);
    
    let level: 'low' | 'medium' | 'high' = 'low';
    if (mockScore >= 20) level = 'high';
    else if (mockScore >= 10) level = 'medium';
    
    setRiskLevel(level);
    setShowReport(true);

    // 评估完成后清除临时存储，避免下次恢复到已完成的会话
    clearSession();

    if (level === 'high' || level === 'medium') {
      setNextButtonDisabled(true);
      setCountdown(10);
    }
  };

  if (!started) {
    return (
      <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
        <div className="pt-4 px-4 max-w-md mx-auto space-y-3 pb-10">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">AI主动式对话量表评估</h2>
              <p className="text-slate-500 text-xs mt-0">您可以选择一个或多个量表进行综合评估</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowHistoryDialog(true)}
              className="rounded-2xl w-12 h-12 shrink-0 shadow-sm hover:shadow-md transition-all border-slate-200 dark:border-slate-800"
              aria-label="查看历史评估"
            >
              <History className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 未完成评估恢复 Banner */}
        <AnimatePresence>
          {showResumeBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">发现未完成的评估</p>
                <p className="text-xs text-slate-500 mt-0.5">上次评估尚未完成，是否继续？</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={handleResumeSession}
                  className="h-8 rounded-xl text-xs px-3 shadow-md shadow-primary/20"
                >
                  继续
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    clearSession();
                    setShowResumeBanner(false);
                  }}
                  className="h-8 rounded-xl text-xs px-3 text-slate-400 hover:text-slate-600"
                >
                  忽略
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {SCALES.map(scale => (
            <motion.div
              key={scale.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedScales(prev => 
                  prev.includes(scale.id) 
                    ? prev.filter(id => id !== scale.id)
                    : [...prev, scale.id]
                );
              }}
              className={`
                p-5 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden
                ${selectedScales.includes(scale.id) 
                  ? 'border-primary bg-primary/5 dark:bg-primary/10' 
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'}
              `}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{scale.id} {scale.name}</h3>
                  <p className="text-xs text-slate-400">{scale.description}</p>
                </div>
                {selectedScales.includes(scale.id) && (
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <Badge variant="outline" className="text-[10px] py-0">{scale.total} 题</Badge>
                <Badge variant="outline" className="text-[10px] py-0">约 {(scale as any).duration ?? 5} 分钟</Badge>
              </div>
            </motion.div>
          ))}
        </div>

        <Button 
          onClick={startAssessment}
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
        >
          开始评估 <ChevronRight className="w-5 h-5 ml-2" />
        </Button>

        <Button 
          onClick={() => navigate('/assessment/htp')}
          variant="outline"
          className="w-full h-14 rounded-2xl text-lg font-bold border-2 border-rose-100 text-rose-500 hover:bg-rose-50 transition-all bg-white"
        >
          房树人(HTP)评估
        </Button>

        {/* 历史评估列表弹窗 */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] p-0 overflow-hidden rounded-[24px] border-none">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <DialogTitle className="text-2xl font-black flex items-center gap-2">
                <History className="w-6 h-6 text-primary" />
                历史评估记录
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-500">
                查看你的过往评估记录和分析报告
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[500px] px-6 py-4">
              <div className="space-y-3">
                {MOCK_HISTORY_ASSESSMENTS.map((assessment) => {
                  const riskInfo = getRiskLevelInfo(assessment.riskLevel);
                  return (
                    <motion.div
                      key={assessment.id}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        setSelectedHistory(assessment);
                        setShowHistoryDialog(false);
                        setShowHistoryDetail(true);
                      }}
                      className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <ClipboardList className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                              {assessment.scaleTypes.join(' + ')}
                            </h3>
                            <Badge className={`${riskInfo.bgColor} ${riskInfo.color} border-0 text-xs font-bold`}>
                              {riskInfo.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatHistoryDate(assessment.date)}
                            </div>
                            <div className="flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              得分: {assessment.score}
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                            {assessment.summary}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* 历史评估详情弹窗 */}
        <Dialog open={showHistoryDetail} onOpenChange={(open) => {
          setShowHistoryDetail(open);
          if (!open) {
            setSelectedHistory(null);
            setShowHistoryDialog(true);
          }
        }}>
          <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden rounded-[24px] border-none">
            {selectedHistory && (
              <>
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-2xl font-black">
                        {selectedHistory.scaleTypes.join(' + ')} 评估记录
                      </DialogTitle>
                      <DialogDescription className="text-sm text-slate-500 mt-1">
                        {formatHistoryDate(selectedHistory.date)}
                      </DialogDescription>
                    </div>
                    <Button
                      onClick={() => setShowHistoryReport(true)}
                      className="rounded-xl px-4 h-10 shadow-md"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      查看报告
                    </Button>
                  </div>
                </DialogHeader>

                <ScrollArea className="h-[600px] px-6 py-4">
                  <div className="space-y-4">
                    {selectedHistory.messages.map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        {msg.role === 'assistant' && (
                          <Avatar className="w-9 h-9 shrink-0 border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
                            <AvatarImage 
                              src={msg.avatar || DOCTOR_AVATAR} 
                              className="object-cover w-full h-full"
                              alt="医生头像"
                            />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs">
                              <Stethoscope className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        
                        <div className="flex flex-col">
                          <div className={`
                            max-w-[70vw] p-4 rounded-3xl text-sm font-medium leading-relaxed
                            ${msg.role === 'user' 
                              ? 'bg-primary text-white shadow-lg shadow-primary/10 rounded-tr-none' 
                              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-800 rounded-tl-none'}
                          `}>
                            {msg.content}
                          </div>
                        </div>

                        {msg.role === 'user' && (
                          <Avatar className="w-9 h-9 shrink-0 border-2 border-primary/20">
                            {(() => {
                              const avatarInfo = getUserAvatarInfo();
                              if (avatarInfo.type === 'image') {
                                return <AvatarImage src={avatarInfo.url} className="object-cover" />;
                              } else if (avatarInfo.type === 'preset') {
                                return <AvatarFallback className={`${avatarInfo.bg} text-lg`}>
                                  {avatarInfo.emoji}
                                </AvatarFallback>;
                              } else {
                                return <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-sm font-bold">
                                  {getUserInitial()}
                                </AvatarFallback>;
                              }
                            })()}
                          </Avatar>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* 历史评估报告弹窗 - 与 FusionReport 量表评估报告样式一致 */}
        <Dialog open={showHistoryReport} onOpenChange={setShowHistoryReport}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 border-0 bg-white rounded-2xl mx-auto w-[calc(100%-3rem)]">
            {selectedHistory && (
              <>
                {/* 头部 */}
                <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">量表评估报告</h2>
                      </div>
                      <p className="text-white/80 mt-2 text-sm">PHQ-9 抑郁症筛查量表详细得分与分析</p>
                      <p className="text-white/60 text-xs mt-1">{formatHistoryDate(selectedHistory.date)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6" id={`history-report-card-${selectedHistory.id}`}>
                  {/* 得分卡片 */}
                  <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-slate-600 font-medium">PHQ-9 总分</span>
                      <Badge className={`${
                        selectedHistory.reportData?.riskLevel === 'high' ? 'bg-[#F97316]' : 
                        selectedHistory.reportData?.riskLevel === 'medium' ? 'bg-[#8B5CF6]' : 'bg-[#10B981]'
                      } text-white px-3 py-1`}>
                        {selectedHistory.reportData?.riskLevel === 'high' ? '高风险' : 
                         selectedHistory.reportData?.riskLevel === 'medium' ? '中风险' : '低风险'}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900">{selectedHistory.reportData?.score ?? selectedHistory.score ?? 0}</span>
                      <span className="text-slate-400 text-lg">/ 27</span>
                    </div>
                    <p className="text-slate-500 text-sm mt-3 leading-relaxed">
                      根据您的量表回答，您的抑郁倾向处于<span className="font-semibold text-slate-700">
                        {selectedHistory.reportData?.riskLevel === 'high' ? '高风险' : 
                         selectedHistory.reportData?.riskLevel === 'medium' ? '中风险' : '低风险'}
                      </span>水平。
                    </p>
                  </div>
                   
                  {/* 各维度得分 */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-500" />
                      各维度得分详情
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedHistory.reportData?.dimensionScores && selectedHistory.reportData.dimensionScores.length > 0 ? (
                        selectedHistory.reportData.dimensionScores.map((item: any, idx: number) => (
                          <div key={idx} className="bg-white rounded-lg p-3 border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-lg font-bold ${item.score >= 2 ? 'text-amber-500' : item.score >= 1 ? 'text-blue-500' : 'text-emerald-500'}`}>
                                {item.score}
                              </span>
                              <span className="text-xs text-slate-400">/ {item.max || 3}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        // 默认维度
                        [
                          { label: '兴趣丧失', score: 2, max: 3 },
                          { label: '情绪低落', score: 2, max: 3 },
                          { label: '睡眠问题', score: 1, max: 3 },
                          { label: '疲劳感', score: 2, max: 3 },
                          { label: '食欲变化', score: 1, max: 3 },
                          { label: '自我评价', score: 1, max: 3 },
                          { label: '注意力', score: 2, max: 3 },
                          { label: '动作迟缓', score: 1, max: 3 },
                          { label: '自杀意念', score: 0, max: 3 },
                        ].map((item, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-3 border border-slate-100">
                            <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                            <div className="flex items-baseline gap-1">
                              <span className={`text-lg font-bold ${item.score >= 2 ? 'text-amber-500' : item.score >= 1 ? 'text-blue-500' : 'text-emerald-500'}`}>
                                {item.score}
                              </span>
                              <span className="text-xs text-slate-400">/ {item.max}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* AI 建议 */}
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <Info className="w-4 h-4 text-blue-500" />
                      AI 专业建议
                    </h4>
                    <p className="text-slate-600 text-sm leading-relaxed">
                      {selectedHistory.reportData.riskLevel === 'high' 
                        ? '您的得分反映出显著的抑郁倾向，建议尽快咨询专业医生进行干预。' 
                        : selectedHistory.reportData.riskLevel === 'medium' 
                          ? '您的得分反映出存在一定的心理压力，可以通过运动、社交和充足睡眠来调节。' 
                          : '您的得分反映出心理状态相对健康，请继续保持积极的生活方式。'}
                    </p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex justify-end gap-3 pt-2">
                    <Button 
                      variant="outline" 
                      onClick={async () => {
                        const el = document.getElementById(`history-report-card-${selectedHistory.id}`);
                        if (!el) return;
                        const html2canvas = (await import('html2canvas')).default;
                        const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
                        const imgData = canvas.toDataURL('image/png');
                        const { jsPDF } = await import('jspdf');
                        const pdf = new jsPDF('p', 'mm', 'a4');
                        const pageWidth = pdf.internal.pageSize.getWidth();
                        const pageHeight = pdf.internal.pageSize.getHeight();
                        const imgWidth = pageWidth;
                        const imgHeight = (canvas.height * imgWidth) / canvas.width;
                        const y = Math.max(10, (pageHeight - imgHeight) / 2);
                        pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
                        pdf.save(`assessment-report-${selectedHistory.id}.pdf`);
                      }}
                      className="rounded-xl h-11 px-6"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      导出报告
                    </Button>
                    <Button 
                      onClick={() => setShowHistoryReport(false)}
                      className="rounded-xl h-11 px-6 bg-slate-900 hover:bg-slate-800"
                    >
                      关闭
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden">
      {/* 沉浸式顶部 - 调整padding避免与导航栏重叠 */}
      <div className="px-4 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Progress</span>
            <span className="text-sm font-black text-primary">{currentQuestionIndex} / {totalQuestions}</span>
          </div>
          <Progress value={(currentQuestionIndex / totalQuestions) * 100} className="h-2 rounded-full" />
        </div>
      </div>

      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        <div className="max-w-md mx-auto space-y-6 pb-6">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {/* AI消息左侧头像 */}
                {msg.role === 'assistant' && (
                  <Avatar className="w-9 h-9 shrink-0 border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
                    <AvatarImage 
                      src={msg.avatar || DOCTOR_AVATAR} 
                      className="object-cover w-full h-full"
                      alt="医生头像"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs">
                      <Stethoscope className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className="flex flex-col">
                  <div className={`
                    max-w-[75vw] p-4 rounded-3xl text-sm font-medium leading-relaxed
                    ${msg.role === 'user' 
                      ? 'bg-primary text-white shadow-lg shadow-primary/10 rounded-tr-none' 
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 shadow-sm border border-slate-100 dark:border-slate-800 rounded-tl-none'}
                  `}>
                    {msg.role === 'assistant' && typingMsgIdx === i
                      ? <>{typingText}<span className="inline-block w-0.5 h-4 ml-0.5 bg-slate-400 animate-pulse align-middle" /></>
                      : msg.content}
                  </div>
                </div>

                {/* 用户消息右侧头像 */}
                {msg.role === 'user' && (
                  <Avatar className="w-9 h-9 shrink-0 border-2 border-primary/20">
                    {(() => {
                      const avatarInfo = getUserAvatarInfo();
                      if (avatarInfo.type === 'image') {
                        return <AvatarImage src={avatarInfo.url} className="object-cover" />;
                      } else if (avatarInfo.type === 'preset') {
                        return <AvatarFallback className={`${avatarInfo.bg} text-lg`}>
                          {avatarInfo.emoji}
                        </AvatarFallback>;
                      } else {
                        return <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-sm font-bold">
                          {getUserInitial()}
                        </AvatarFallback>;
                      }
                    })()}
                  </Avatar>
                )}
              </motion.div>
            ))}
            {/* loading 三点动画：仅在等待 API 且打字机尚未启动时显示 */}
            {loading && typingMsgIdx === null && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex justify-start gap-2">
                <Avatar className="w-9 h-9 shrink-0 border-2 border-slate-100 dark:border-slate-800 overflow-hidden">
                  <AvatarImage src={DOCTOR_AVATAR} className="object-cover w-full h-full" alt="医生头像" />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white text-xs">
                    <Stethoscope className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-800">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="shrink-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-md mx-auto space-y-2">
          {/* 表情选择面板 - 位于最上方 */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                ref={emojiPickerRef}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-3 max-h-48 overflow-y-auto"
              >
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_LIST.slice(0, 64).map((emoji, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-lg hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1 transition-colors"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 快捷回答按钮 - 始终位于输入框上方 */}
          <div className="flex flex-wrap gap-2">
            {QUICK_RESPONSES.map((response) => (
              <motion.button
                key={response}
                whileHover={{ scale: loading || typingMsgIdx !== null ? 1 : 1.05 }}
                whileTap={{ scale: loading || typingMsgIdx !== null ? 1 : 0.95 }}
                onClick={() => handleQuickResponse(response)}
                disabled={loading || typingMsgIdx !== null}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all
                  ${loading || typingMsgIdx !== null
                    ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400'
                    : inputText === response 
                      ? 'bg-primary text-white shadow-md' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}
                `}
              >
                {response}
              </motion.button>
            ))}
          </div>

          {/* 输入框区域 */}
          <div className="flex gap-2">
            <input
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={typingMsgIdx !== null ? 'AI 正在回复中…' : '请在此输入您的回答...'}
              readOnly={loading || typingMsgIdx !== null}
              className={`flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 ring-primary transition-all outline-none ${loading || typingMsgIdx !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <Button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              size="icon"
              variant="outline"
              disabled={loading || typingMsgIdx !== null}
              className={`rounded-2xl w-12 h-12 shadow-sm ${showEmojiPicker ? 'border-primary text-primary bg-primary/10' : ''}`}
              aria-pressed={showEmojiPicker}
              aria-label="选择表情"
            >
              <Smile className="w-5 h-5" />
            </Button>
            <Button 
              onClick={handleSend}
              disabled={!inputText.trim() || loading || typingMsgIdx !== null}
              size="icon" 
              className="rounded-2xl w-12 h-12 shadow-lg shadow-primary/20"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 报告弹窗 */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[32px] border-none">
          <div className="bg-gradient-to-br from-primary to-primary-foreground p-8 text-center text-white space-y-4">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto backdrop-blur-md">
              <ClipboardList className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black">评估完成</h2>
              <p className="text-white/70 text-sm">基于您的多轮对话回答生成的报告</p>
            </div>
          </div>

          <div className="p-8 space-y-8 bg-white dark:bg-slate-950" id="assessment-report-card">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Score</span>
                <p className="text-3xl font-black text-primary">{score}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl text-center space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Risk</span>
                <p className={`text-lg font-black ${
                  riskLevel === 'high' ? 'text-rose-500' : 
                  riskLevel === 'medium' ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  {riskLevel === 'high' ? '高风险' : riskLevel === 'medium' ? '中风险' : '低风险'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> AI 建议
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                您的得分反映出{riskLevel === 'high' ? '显著的抑郁倾向，建议尽快咨询专业医生进行干预。' : 
                riskLevel === 'medium' ? '存在一定的心理压力，可以通过运动、社交和充足睡眠来调节。' : 
                '心理状态相对健康，请继续保持积极的生活方式。'}
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl h-12 border-slate-100 dark:border-slate-800"
                  onClick={async () => {
                    const el = document.getElementById('assessment-report-card');
                    if (!el) return;
                    const html2canvas = (await import('html2canvas')).default;
                    const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
                    const imgData = canvas.toDataURL('image/png');
                    const { jsPDF } = await import('jspdf');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    const imgWidth = pageWidth;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;
                    const y = Math.max(10, (pageHeight - imgHeight) / 2);
                    pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
                    pdf.save('assessment-report.pdf');
                  }}
                >
                  <Download className="w-4 h-4 mr-2" /> PDF
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 rounded-xl h-12 border-slate-100 dark:border-slate-800"
                  onClick={async () => {
                    const el = document.getElementById('assessment-report-card');
                    if (!el) return;
                    const html2canvas = (await import('html2canvas')).default;
                    const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png');
                    a.download = 'assessment-report.png';
                    a.click();
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" /> PNG
                </Button>
              </div>
              <Button 
                onClick={() => {
                  setShowReport(false);
                  onComplete({ score, riskLevel });
                }}
                disabled={nextButtonDisabled}
                className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20"
              >
                {nextButtonDisabled ? `请阅读 (${countdown}s)` : '下一步：语音情绪识别'}
              </Button>
              <p className="text-[10px] text-center text-slate-400 leading-relaxed px-4">
                免责声明：本评估由 AI 生成，仅供参考。不代表临床诊断。如感不适请及时就医。
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
