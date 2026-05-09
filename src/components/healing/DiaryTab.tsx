import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, CloudRain, Edit2, Image as ImageIcon, Loader2, Mic, Plus, Sparkles, StopCircle, Sun, X, TrendingUp, Calendar, Tag, PenLine, Heart, Smile } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import MoodFeedbackOverlay from '@/components/record/MoodFeedbackOverlay';
import type { MoodFeedbackType } from '@/components/record/MoodFeedbackOverlay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createEmotionDiary, getEmotionDiaries, updateEmotionDiary } from '@/db/api';
import { transcribeAudio } from '@/db/siliconflow';
import type { EmotionDiary, EmotionLevel } from '@/types';
import { blobToBase64 } from '@/utils/audio';

const EMOTIONS = [
  {
    level: 'very_good' as EmotionLevel,
    label: '极好',
    emoji: '😄',
    colorActive: 'bg-gradient-to-br from-success/20 to-success/10 text-success border-success/40 hover:border-success/60 hover:shadow-success-glow',
    colorBase: 'bg-success/10 text-success border-success/20 hover:bg-success/20'
  },
  {
    level: 'good' as EmotionLevel,
    label: '不错',
    emoji: '😊',
    colorActive: 'bg-gradient-to-br from-info/20 to-info/10 text-info border-info/40 hover:border-info/60 hover:shadow-glow',
    colorBase: 'bg-info/10 text-info border-info/20 hover:bg-info/20'
  },
  {
    level: 'neutral' as EmotionLevel,
    label: '一般',
    emoji: '😐',
    colorActive: 'bg-gradient-to-br from-muted to-muted/50 text-muted-foreground border-border hover:border-muted-foreground/30',
    colorBase: 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
  },
  {
    level: 'bad' as EmotionLevel,
    label: '难过',
    emoji: '😔',
    colorActive: 'bg-gradient-to-br from-warning/20 to-warning/10 text-warning border-warning/40 hover:border-warning/60',
    colorBase: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20'
  },
  {
    level: 'very_bad' as EmotionLevel,
    label: '糟糕',
    emoji: '😢',
    colorActive: 'bg-gradient-to-br from-destructive/20 to-destructive/10 text-destructive border-destructive/40 hover:border-destructive/60',
    colorBase: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20'
  },
];

const POSITIVE_TRIGGERS = [
  '好消息', '与朋友相聚', '顺利完成任务', '感恩时刻', '运动', '社交活动', '阳光/好天气', '音乐', '阅读', '兴趣爱好', '宠物陪伴', '冥想', '健康饮食'
];
const NEGATIVE_TRIGGERS = [
  '睡眠不足', '工作压力', '家庭琐事', '天气阴郁', '身体不适', '学习困难', '人际关系', '经济压力', '饮食不规律', '通勤拥堵', '争执/冲突', '其他'
];

const getEmotionColor = (level: EmotionLevel) => {
  const colors = { 
    very_good: 'bg-success/10 border-success/30', 
    good: 'bg-info/10 border-info/30', 
    neutral: 'bg-muted border-border', 
    bad: 'bg-warning/10 border-warning/30', 
    very_bad: 'bg-destructive/10 border-destructive/30' 
  };
  return colors[level] || 'bg-background';
};

const getEmotionEmoji = (level: EmotionLevel) => EMOTIONS.find(e => e.level === level)?.emoji || '😐';

export default function DiaryTab() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [diaries, setDiaries] = useState<EmotionDiary[]>([]);
  const [loading, setLoading] = useState(false);
  const [emotionLevel, setEmotionLevel] = useState<EmotionLevel>('neutral');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [positiveExtra, setPositiveExtra] = useState<string[]>([]);
  const [negativeExtra, setNegativeExtra] = useState<string[]>([]);
  const [newPositiveTag, setNewPositiveTag] = useState('');
  const [newNegativeTag, setNewNegativeTag] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [feedbackType, setFeedbackType] = useState<MoodFeedbackType>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (user) loadDiaries(); }, [user, currentMonth]);

  const loadDiaries = async () => {
    if (!user) return;
    try {
      const data = await getEmotionDiaries(user.id, 100);
      setDiaries(data);
    } catch (error) {
      console.error('加载日记失败:', error);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const firstDayOfWeek = monthStart.getDay();
  const emptyDays = Array(firstDayOfWeek).fill(null);

  const getDiariesForDate = (date: Date) => diaries.filter(d => isSameDay(new Date(d.diary_date), date));
  const getLatestDiaryForDate = (date: Date) => {
    const list = getDiariesForDate(date);
    if (list.length === 0) return null;
    return list.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const existing = getDiariesForDate(date);
    if (existing.length > 0) {
      const latest = existing.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      setEditingId(latest.id);
      setEditContent(latest.content || '');
      setEmotionLevel((latest.emotion_level as EmotionLevel) || 'neutral');
      // 触发因素存储在tags字段中
      const savedTags = (latest as any).tags || [];
      setSelectedTriggers(Array.isArray(savedTags) ? savedTags : []);
    } else {
      setEditingId(null);
      setEditContent('');
      setEmotionLevel('neutral');
      setSelectedTriggers([]);
      setPositiveExtra([]);
      setNegativeExtra([]);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const diaryDate = format(selectedDate, 'yyyy-MM-dd');
      const payload = {
        user_id: user.id,
        diary_date: diaryDate,
        emotion_level: emotionLevel,
        content: editContent,
        tags: [...selectedTriggers, ...positiveExtra, ...negativeExtra],
        image_urls: imageUrls,
      };
      
      if (editingId) {
        await updateEmotionDiary(editingId, payload);
        toast.success('日记已更新', {
          icon: '✅',
          duration: 2000,
        });
      } else {
        await createEmotionDiary(payload);
        toast.success('日记已保存', {
          icon: '📝',
          duration: 2000,
        });
        
        // 根据情绪显示反馈
        if (emotionLevel === 'very_bad' || emotionLevel === 'bad') {
          setFeedbackType('receiver');
        } else if (emotionLevel === 'very_good' || emotionLevel === 'good') {
          setFeedbackType('giver');
        }
      }
      
      await loadDiaries();
      resetForm();
    } catch (error: any) {
      console.error('保存失败:', error);
      toast.error(`保存失败: ${error.message || '请检查网络连接'}`, {
        icon: '❌',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmotionLevel('neutral');
    setSelectedTriggers([]);
    setPositiveExtra([]);
    setNegativeExtra([]);
    setEditContent('');
    setImageUrls([]);
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers(prev => 
      prev.includes(trigger) 
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    );
  };

  const addPositiveTag = () => {
    if (newPositiveTag.trim()) {
      setPositiveExtra(prev => [...prev, newPositiveTag.trim()]);
      setNewPositiveTag('');
    }
  };

  const addNegativeTag = () => {
    if (newNegativeTag.trim()) {
      setNegativeExtra(prev => [...prev, newNegativeTag.trim()]);
      setNewNegativeTag('');
    }
  };

  const removeTag = (tag: string, type: 'positive' | 'negative') => {
    if (type === 'positive') {
      setPositiveExtra(prev => prev.filter(t => t !== tag));
    } else {
      setNegativeExtra(prev => prev.filter(t => t !== tag));
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.info('开始录音...');
    } catch (error) {
      console.error('录音失败:', error);
      toast.error('无法访问麦克风');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAudioTranscription = async (audioBlob: Blob) => {
    setRecognizing(true);
    try {
      const wavBlob = await convertWebmToWav(audioBlob);
      const result = await transcribeAudio(wavBlob);
      if (result.text) {
        setEditContent(prev => prev + (prev ? '\n' : '') + result.text);
        toast.success('语音识别完成');
      }
    } catch (error) {
      console.error('识别失败:', error);
      toast.error('语音识别失败');
    } finally {
      setRecognizing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 超过10MB`);
        continue;
      }
      try {
        const base64 = await blobToBase64(file);
        setImageUrls(prev => [...prev, base64]);
      } catch (error) {
        console.error('图片处理失败:', error);
      }
    }
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="animate-fade-in-up">
      {/* 情绪反馈遮罩 */}
      <MoodFeedbackOverlay 
        type={feedbackType} 
        content={editContent || '今天的记录'}
        onClose={() => setFeedbackType(null)} 
      />

      {/* 左右布局容器 - 电脑端左右排列，移动端上下排列 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：日历卡片 + 补充组件 */}
        <div className="space-y-4 lg:sticky lg:top-6">
        <Card className="glass border-0 shadow-xl overflow-hidden h-fit">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                情绪日历
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium min-w-[80px] text-center">
                  {format(currentMonth, 'yyyy年MM月', { locale: zhCN })}
                </span>
                <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 星期标题 */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map(day => (
                <div key={day} className="text-center text-xs text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            
            {/* 日期网格 */}
            <div className="grid grid-cols-7 gap-1">
              {emptyDays.map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}
              {daysInMonth.map(date => {
                const diary = getLatestDiaryForDate(date);
                const isToday = isSameDay(date, new Date());
                const isSelected = isSameDay(date, selectedDate);
                
                return (
                  <motion.button
                    key={date.toISOString()}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDayClick(date)}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center gap-1
                      transition-all duration-200 relative
                      ${isToday ? 'ring-2 ring-primary ring-offset-2' : ''}
                      ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'}
                      ${diary ? getEmotionColor(diary.emotion_level as EmotionLevel) : 'bg-muted/30'}
                    `}
                  >
                    <span className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                      {format(date, 'd')}
                    </span>
                    {diary && (
                      <span className="text-lg">{getEmotionEmoji(diary.emotion_level as EmotionLevel)}</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* 写作统计卡片 - 仅桌面端显示 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hidden lg:grid grid-cols-3 gap-3"
        >
          <Card className="border shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <p className="text-lg font-bold text-foreground">{diaries.length}</p>
              <p className="text-xs text-muted-foreground">日记总数</p>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <PenLine className="w-4 h-4 text-white" />
              </div>
              <p className="text-lg font-bold text-foreground">{Math.min(7, diaries.filter(d => {
                const diaryDate = new Date(d.diary_date);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return diaryDate >= weekAgo;
              }).length)}</p>
              <p className="text-xs text-muted-foreground">本周记录</p>
            </CardContent>
          </Card>
          <Card className="border shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="w-8 h-8 mx-auto mb-1 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <p className="text-lg font-bold text-foreground">{Math.round((diaries.filter(d => d.emotion_level === 'very_good' || d.emotion_level === 'good').length / (diaries.length || 1)) * 100)}%</p>
              <p className="text-xs text-muted-foreground">积极情绪</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* 心情趋势 - 仅桌面端显示 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="hidden lg:block"
        >
          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-foreground">心情趋势</span>
              </div>
              <div className="space-y-3">
                {[
                  { label: '极好', emoji: '😄', count: diaries.filter(d => d.emotion_level === 'very_good').length, color: 'from-success to-success/70' },
                  { label: '不错', emoji: '😊', count: diaries.filter(d => d.emotion_level === 'good').length, color: 'from-info to-info/70' },
                  { label: '一般', emoji: '😐', count: diaries.filter(d => d.emotion_level === 'neutral').length, color: 'from-muted-foreground to-muted-foreground/70' },
                  { label: '难过', emoji: '😔', count: diaries.filter(d => d.emotion_level === 'bad').length, color: 'from-warning to-warning/70' },
                  { label: '糟糕', emoji: '😢', count: diaries.filter(d => d.emotion_level === 'very_bad').length, color: 'from-destructive to-destructive/70' },
                ].map((item) => {
                  const maxCount = Math.max(...[
                    diaries.filter(d => d.emotion_level === 'very_good').length,
                    diaries.filter(d => d.emotion_level === 'good').length,
                    diaries.filter(d => d.emotion_level === 'neutral').length,
                    diaries.filter(d => d.emotion_level === 'bad').length,
                    diaries.filter(d => d.emotion_level === 'very_bad').length,
                  ], 1);
                  const percentage = (item.count / maxCount) * 100;
                  return (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-lg w-6">{item.emoji}</span>
                      <span className="text-xs text-muted-foreground w-10">{item.label}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <span className="text-xs font-medium w-6 text-right">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 标签云 - 仅桌面端显示 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="hidden lg:block"
        >
          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center">
                  <Tag className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold text-foreground">常用标签</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { tag: '好消息', count: 12, type: 'positive' },
                  { tag: '运动', count: 8, type: 'positive' },
                  { tag: '冥想', count: 6, type: 'positive' },
                  { tag: '工作压力', count: 5, type: 'negative' },
                  { tag: '睡眠不足', count: 4, type: 'negative' },
                  { tag: '社交活动', count: 4, type: 'positive' },
                  { tag: '音乐', count: 3, type: 'positive' },
                  { tag: '阅读', count: 3, type: 'positive' },
                  { tag: '家庭琐事', count: 2, type: 'negative' },
                  { tag: '宠物陪伴', count: 2, type: 'positive' },
                ].map((item) => (
                  <motion.div
                    key={item.tag}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all ${
                      item.type === 'positive'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 hover:bg-emerald-200'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 hover:bg-rose-200'
                    }`}
                  >
                    {item.tag}
                    <span className="ml-1 opacity-60">{item.count}</span>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 心情提示 - 仅桌面端显示 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="hidden lg:block"
        >
          <Card className="border shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <Smile className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-medium text-foreground mb-1">每日小贴士</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    记录情绪是自我关怀的第一步。坚持写日记可以帮助你发现情绪模式，更好地了解自己。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        </div>{/* 结束左侧容器 */}

        {/* 右侧：日记编辑区域 */}
        <Card className="glass border-0 shadow-xl overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              {editingId ? '编辑日记' : '写日记'} - {format(selectedDate, 'MM月dd日', { locale: zhCN })}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetForm}
              className="text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              重置
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 情绪选择 */}
          <div className="space-y-3">
            <label className="text-sm font-medium">今天感觉如何？</label>
            <div className="grid grid-cols-5 gap-2">
              {EMOTIONS.map(emotion => (
                <motion.button
                  key={emotion.level}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEmotionLevel(emotion.level)}
                  className={`
                    flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all
                    ${emotionLevel === emotion.level ? emotion.colorActive : emotion.colorBase}
                  `}
                >
                  <span className="text-2xl">{emotion.emoji}</span>
                  <span className="text-xs font-medium">{emotion.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* 触发因素 */}
          <div className="space-y-3">
            <label className="text-sm font-medium">是什么影响了你的情绪？</label>
            
            {/* 正面因素 */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">积极因素</p>
              <div className="flex flex-wrap gap-2">
                {POSITIVE_TRIGGERS.map(trigger => (
                  <Badge
                    key={trigger}
                    variant={selectedTriggers.includes(trigger) ? 'default' : 'outline'}
                    onClick={() => toggleTrigger(trigger)}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    <Sun className="w-3 h-3 mr-1" />
                    {trigger}
                  </Badge>
                ))}
                {positiveExtra.map(tag => (
                  <Badge key={tag} variant="default" className="gap-1">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag, 'positive')} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPositiveTag}
                  onChange={(e) => setNewPositiveTag(e.target.value)}
                  placeholder="添加自定义标签..."
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background"
                  onKeyPress={(e) => e.key === 'Enter' && addPositiveTag()}
                />
                <Button size="sm" variant="outline" onClick={addPositiveTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* 负面因素 */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">消极因素</p>
              <div className="flex flex-wrap gap-2">
                {NEGATIVE_TRIGGERS.map(trigger => (
                  <Badge
                    key={trigger}
                    variant={selectedTriggers.includes(trigger) ? 'destructive' : 'outline'}
                    onClick={() => toggleTrigger(trigger)}
                    className="cursor-pointer hover:scale-105 transition-transform"
                  >
                    <CloudRain className="w-3 h-3 mr-1" />
                    {trigger}
                  </Badge>
                ))}
                {negativeExtra.map(tag => (
                  <Badge key={tag} variant="destructive" className="gap-1">
                    {tag}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => removeTag(tag, 'negative')} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNegativeTag}
                  onChange={(e) => setNewNegativeTag(e.target.value)}
                  placeholder="添加自定义标签..."
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-background"
                  onKeyPress={(e) => e.key === 'Enter' && addNegativeTag()}
                />
                <Button size="sm" variant="outline" onClick={addNegativeTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 日记内容 */}
          <div className="space-y-3">
            <label className="text-sm font-medium">详细记录</label>
            <div className="relative">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="记录下今天的想法和感受..."
                rows={5}
                className="resize-none pr-12"
              />
              <div className="absolute bottom-3 right-3 flex gap-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant={isRecording ? 'destructive' : 'ghost'}
                  className="h-8 w-8"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={recognizing}
                >
                  {recognizing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isRecording ? (
                    <StopCircle className="w-4 h-4" />
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 图片预览 */}
            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 保存按钮 */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={resetForm}
              className="flex-1 rounded-xl"
            >
              清空
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:opacity-90 text-white shadow-lg"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {editingId ? '更新' : '保存'}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

// 辅助函数：转换 WebM 到 WAV
async function convertWebmToWav(webmBlob: Blob): Promise<Blob> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const wavBuffer = audioBufferToWav(audioBuffer);
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels = 1;
  const sampleRate = buffer.sampleRate;
  
  // WAV 头部
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + buffer.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, buffer.length * 2, true);
  
  // 音频数据
  const data = new Float32Array(buffer.getChannelData(0));
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  return arrayBuffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
