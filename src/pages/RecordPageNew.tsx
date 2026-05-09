import { addMonths, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Cloud, CloudRain, Edit2, Image as ImageIcon, Loader2, Mic, Plus, Smile, Sparkles, StopCircle, Sun, Trash2, Wind, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import MoodFeedbackOverlay, { MoodFeedbackType } from '@/components/record/MoodFeedbackOverlay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { createEmotionDiary, getEmotionDiaries, updateEmotionDiary } from '@/db/api';
import type { EmotionDiary, EmotionLevel } from '@/types';
import { blobToBase64, convertWebmToWav } from '@/utils/audio';
import { transcribeAudio } from '@/db/siliconflow';

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

export default function RecordPageNew() {
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
  const [content, setContent] = useState('');
  const [dayDialogOpen, setDayDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recognizing, setRecognizing] = useState(false);
  const [feedbackType, setFeedbackType] = useState<MoodFeedbackType>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const speechBaseContentRef = useRef('');
  const speechCommittedRef = useRef('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (user) loadDiaries(); }, [user, currentMonth]);
  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);

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

  const handleDiaryImageUpload = async (diaryId: string, files: FileList, replaceIndex?: number) => {
    const target = diaries.find(d => d.id === diaryId);
    if (!target || !files || files.length === 0) return;
    try {
      const newBase64List: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} 超过10MB，已跳过`, { duration: 1000 }); continue; }
        const base64 = await blobToBase64(file);
        newBase64List.push(base64);
      }
      const currentUrls = Array.isArray(target.image_urls) ? target.image_urls.slice() : [];
      let nextUrls: string[] = [];
      if (typeof replaceIndex === 'number') {
        nextUrls = currentUrls.slice();
        nextUrls[replaceIndex] = newBase64List[0];
      } else {
        nextUrls = [...currentUrls, ...newBase64List];
      }
      await updateEmotionDiary(diaryId, { image_urls: nextUrls });
      toast.success('图片已更新', { duration: 1000 });
      await loadDiaries();
    } catch {
      toast.error('图片更新失败', { duration: 1000 });
    }
  };

  const promptUploadForDiary = (diaryId: string, replaceIndex?: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = !Number.isFinite(replaceIndex as number);
    input.onchange = (e: any) => {
      const files = e.target.files as FileList;
      handleDiaryImageUpload(diaryId, files, replaceIndex);
    };
    input.click();
  };

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const list = getDiariesForDate(date);
    if (list.length > 0) {
      setDayDialogOpen(true);
      const latest = getLatestDiaryForDate(date);
      setEditingId(latest?.id || null);
      setEmotionLevel(latest?.emotion_level || 'neutral');
      setSelectedTriggers(latest?.tags || []);
      setContent(latest?.content || '');
      setImageUrls(latest?.image_urls || []);
      setEditContent('');
    } else {
      setEmotionLevel('neutral');
      setSelectedTriggers([]);
      setContent('');
      setImageUrls([]);
    }
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      let asrBusy = false;
      mediaRecorder.ondataavailable = async (event) => {
        if (!isRecordingRef.current) return;
        if (event.data?.size > 0 && !asrBusy) {
          asrBusy = true;
          try {
            const wavBlob = await convertWebmToWav(event.data);
            const res = await transcribeAudio(wavBlob, 'TeleAI/TeleSpeechASR');
            const text = res?.text?.trim();
            if (text) setContent(prev => prev + (prev ? '\n' : '') + text);
          } catch {
            try {
              const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
              if (SpeechRecognition) {
                const recog = new SpeechRecognition();
                recognitionRef.current = recog;
                recog.lang = 'zh-CN';
                recog.continuous = true;
                recog.interimResults = true;
                speechBaseContentRef.current = content;
                speechCommittedRef.current = '';
                recog.onresult = (event: any) => {
                  let committedAdd = '';
                  let interim = '';
                  for (let i = event.resultIndex; i < event.results.length; i++) {
                    const result = event.results[i];
                    const t = result?.[0]?.transcript || '';
                    if (result.isFinal) committedAdd += t; else interim += t;
                  }
                  if (committedAdd) speechCommittedRef.current = (speechCommittedRef.current + committedAdd).trim();
                  const base = speechBaseContentRef.current;
                  const committed = speechCommittedRef.current;
                  const combined = `${committed}${interim}`.trim();
                  const next = base ? [base, combined].filter(Boolean).join('\n') : combined;
                  setContent(next);
                };
                recog.onend = () => { if (isRecordingRef.current) recog.start(); };
                try { recog.start(); } catch {}
              }
            } catch {}
          }
          asrBusy = false;
        }
      };
      mediaRecorder.onstop = () => { stream.getTracks().forEach(track => track.stop()); };
      isRecordingRef.current = true;
      setIsRecording(true);
      mediaRecorder.start(800);
      toast.info('语音识别中...', { duration: 1000 });
    } catch (error) {
      try {
        const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) throw error;
        const recog = new SpeechRecognition();
        recognitionRef.current = recog;
        recog.lang = 'zh-CN';
        recog.continuous = true;
        recog.interimResults = true;
        speechBaseContentRef.current = content;
        speechCommittedRef.current = '';
        recog.onresult = (event: any) => {
          let committedAdd = '';
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            const t = result?.[0]?.transcript || '';
            if (result.isFinal) committedAdd += t; else interim += t;
          }
          if (committedAdd) speechCommittedRef.current = (speechCommittedRef.current + committedAdd).trim();
          const base = speechBaseContentRef.current;
          const committed = speechCommittedRef.current;
          const combined = `${committed}${interim}`.trim();
          const next = base ? [base, combined].filter(Boolean).join('\n') : combined;
          setContent(next);
        };
        recog.onend = () => { if (isRecordingRef.current) recog.start(); };
        isRecordingRef.current = true;
        setIsRecording(true);
        try { recog.start(); } catch {}
        toast.info('浏览器语音识别中...', { duration: 1000 });
      } catch {
        toast.error('无法访问麦克风', { duration: 1000 });
      }
    }
  };

  const handleStopRecording = () => {
    if (!isRecording) return;
    isRecordingRef.current = false;
    setIsRecording(false);
    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      return;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const processAudioRecording = async (_audioBlob: Blob) => {
    // 已改为流式识别，无需停止后统一识别
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImageUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} 超过10MB，已跳过`, { duration: 1000 });
        continue;
      }
      const base64 = await blobToBase64(file);
      newImageUrls.push(base64);
    }

    setImageUrls(prev => [...prev, ...newImageUrls]);
    if (e.target) e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const icsEscape = (value: string) =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');

  const buildDiaryIcs = (diary: EmotionDiary) => {
    const dateStr = diary.diary_date;
    const start = dateStr.replace(/-/g, '');
    const dt = new Date(`${dateStr}T00:00:00`);
    const endDate = new Date(dt.getTime() + 24 * 60 * 60 * 1000);
    const end = format(endDate, 'yyyyMMdd');

    const label = EMOTIONS.find(e => e.level === diary.emotion_level)?.label || '一般';
    const summary = `情绪日记·${label}`;
    const descriptionParts: string[] = [];
    if (diary.tags && diary.tags.length > 0) descriptionParts.push(`触发因素：${diary.tags.join('、')}`);
    if (diary.content) descriptionParts.push(diary.content);
    const description = descriptionParts.join('\n\n');
    const uid = `${diary.id}@mindcare`;
    const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//XinyuCare//EmotionDiary//CN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${icsEscape(uid)}`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  };

  const downloadTextFile = (filename: string, text: string, mime = 'text/plain') => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers(prev => prev.includes(trigger) ? prev.filter(t => t !== trigger) : [...prev, trigger]);
  };

  const addPositiveTag = () => {
    const t = newPositiveTag.trim();
    if (!t) return;
    setPositiveExtra(prev => (prev.includes(t) || POSITIVE_TRIGGERS.includes(t)) ? prev : [...prev, t]);
    setSelectedTriggers(prev => prev.includes(t) ? prev : [...prev, t]);
    setNewPositiveTag('');
  };

  const addNegativeTag = () => {
    const t = newNegativeTag.trim();
    if (!t) return;
    setNegativeExtra(prev => (prev.includes(t) || NEGATIVE_TRIGGERS.includes(t)) ? prev : [...prev, t]);
    setSelectedTriggers(prev => prev.includes(t) ? prev : [...prev, t]);
    setNewNegativeTag('');
  };

  const handleSave = async () => {
    if (!user) { toast.error('请先登录', { duration: 1000 }); return; }
    if (!content.trim() && imageUrls.length === 0) { toast.error('请写下你的心情或上传图片', { duration: 1000 }); return; }
    setLoading(true);
    try {
      let saved: EmotionDiary;
      if (editingId) {
        saved = await updateEmotionDiary(editingId, {
          emotion_level: emotionLevel,
          content,
          tags: selectedTriggers,
          image_urls: imageUrls
        });
      } else {
        saved = await createEmotionDiary({ 
          user_id: user.id, 
          diary_date: format(selectedDate, 'yyyy-MM-dd'), 
          emotion_level: emotionLevel, 
          content,
          tags: selectedTriggers,
          image_urls: imageUrls
        });
        setEditingId(saved.id);
      }

      // 触发反馈
      if (emotionLevel === 'very_good' || emotionLevel === 'good') {
        setFeedbackType('giver');
      } else if (emotionLevel === 'bad' || emotionLevel === 'very_bad') {
        setFeedbackType('receiver');
      } else {
        setFeedbackType('observer');
      }

      // 取消自动下载 .ics（如需导出可在页面手动触发）
      toast.success(editingId ? '记录已更新' : '记录已保存', { duration: 1000 });
      // 编辑模式下不清空，便于重复编辑；新增后进入编辑模式
      await loadDiaries();
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败,请重试', { duration: 1000 });
    } finally {
      setLoading(false);
    }
  };

  const getWeeklySummary = () => {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekDiaries = diaries.filter(d => { const diaryDate = new Date(d.diary_date); return diaryDate >= weekAgo && diaryDate <= today; });
    if (weekDiaries.length === 0) return null;
    const emotionToNumber = (level: EmotionLevel): number => ({ very_bad: 1, bad: 2, neutral: 3, good: 4, very_good: 5 }[level] || 3);
    const avgEmotion = (weekDiaries.reduce((sum, d) => sum + emotionToNumber(d.emotion_level), 0) / weekDiaries.length).toFixed(1);
    const improvement = emotionToNumber(weekDiaries[0]?.emotion_level) > emotionToNumber(weekDiaries[weekDiaries.length - 1]?.emotion_level);
    return { avgEmotion, improvement, count: weekDiaries.length };
  };

  const weeklySummary = getWeeklySummary();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 px-4 md:px-8 py-3 mb-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <h1 className="text-[20px] md:text-xl font-black text-slate-800 truncate">情绪日记</h1>
          </div>
          <motion.div 
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full border border-blue-100 bg-blue-50/60 shadow-sm shrink-0 max-w-[68%] sm:max-w-none"
          >
            <div className="flex flex-col items-end leading-tight min-w-0">
              <span className="hidden sm:block text-[10px] text-blue-400 font-bold tracking-wider">TODAY'S WEATHER</span>
              <span className="text-sm md:text-base font-bold text-blue-600 truncate">晴转多云 · 18°C</span>
            </div>
            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Sun className="w-5 h-5 text-amber-400" />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  <span className="text-primary">📅</span>
                  {format(currentMonth, 'yyyy年M月', { locale: zhCN })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={handlePrevMonth}><ChevronLeft className="w-5 h-5" /></Button>
                  <Button variant="ghost" size="icon" onClick={handleNextMonth}><ChevronRight className="w-5 h-5" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 mb-3">
                {['日', '一', '二', '三', '四', '五', '六'].map(day => <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-2">
                {emptyDays.map((_, index) => <div key={`empty-${index}`} className="aspect-square" />)}
                {daysInMonth.map(date => {
                  const dayDiaries = getDiariesForDate(date);
                  const isSelected = isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, new Date());
                  return (
                    <button key={date.toISOString()} onClick={() => handleDateClick(date)} className={`aspect-square rounded-2xl p-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 ${dayDiaries.length > 0 ? getEmotionColor(dayDiaries[0].emotion_level) : 'bg-background hover:bg-muted'} ${isSelected ? 'ring-2 ring-primary ring-offset-2 scale-105' : ''} ${isToday && !isSelected ? 'ring-1 ring-primary/50' : ''} hover:scale-105 hover:shadow-md`}>
                      <span className={`text-sm font-semibold ${dayDiaries.length > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>{format(date, 'd')}</span>
                      {dayDiaries.length > 0 && (
                        <div className="flex items-center gap-1">
                          <span className="text-lg">{getEmotionEmoji(dayDiaries[0].emotion_level)}</span>
                          {dayDiaries.length > 1 && <span className="text-[10px] px-1 rounded bg-primary/10 text-primary">×{dayDiaries.length}</span>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          {weeklySummary && (
            <></>
          )}
        </div>
        <div className="lg:col-span-1">
          <Card className="shadow-lg border-0 sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Plus className="w-5 h-5 text-primary" />
                记录此时心情
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-3">今天感觉如何?</h4>
                <div className="grid grid-cols-5 gap-2">
                  {EMOTIONS.map(emotion => (
                    <button key={emotion.level} onClick={() => setEmotionLevel(emotion.level)} className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${emotionLevel === emotion.level ? emotion.colorActive + ' scale-110 shadow-md' : emotion.colorBase}`}>
                      <span className="text-2xl">{emotion.emoji}</span>
                      <span className="text-xs font-medium">{emotion.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">随手记</h4>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      disabled={loading}
                      className={isRecording ? 'text-red-500 animate-pulse' : ''}
                    >
                      {isRecording ? <StopCircle className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
                      {isRecording ? '停止' : '语音'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                    >
                      <ImageIcon className="w-4 h-4 mr-1" />
                      图片
                    </Button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                    />
                  </div>
                </div>
                
                <Textarea 
                  placeholder="写下点什么..." 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)} 
                  rows={6} 
                  className="resize-none transition-all duration-300 focus:shadow-inner-glow" 
                />

                {imageUrls.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="relative w-16 h-16 group">
                        <img src={url} alt={`upload-${index}`} className="w-full h-full object-cover rounded-md border" />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleSave} disabled={loading || (!content.trim() && imageUrls.length === 0)} className="w-full h-12 text-base font-medium bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg">
                {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />保存中...</> : '保存记录'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* 当日记录列表弹窗 */}
      <Dialog open={dayDialogOpen} onOpenChange={(open) => setDayDialogOpen(open)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-[28px] border-none">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {format(selectedDate, 'yyyy年M月d日 当天记录', { locale: zhCN })}
            </DialogTitle>
          </DialogHeader>
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-5 border-b">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-black">{format(selectedDate, 'yyyy年M月d日', { locale: zhCN })}</h3>
                <p className="text-[11px] text-muted-foreground">{format(selectedDate, 'EEEE', { locale: zhCN })}</p>
              </div>
              <div className="flex gap-2">
                {getDiariesForDate(selectedDate).slice(0,3).map((d, i) => (
                  <span key={i} className="text-xl">{getEmotionEmoji(d.emotion_level)}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4 p-6">
            {isSameDay(selectedDate, new Date()) && (
              <div className="rounded-2xl border bg-white shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold">编辑当天情绪</h4>
                  {(() => {
                    const latest = getLatestDiaryForDate(selectedDate);
                    return latest ? <span className="text-xs text-muted-foreground">最近记录：{format(new Date(latest.created_at), 'HH:mm')}</span> : null;
                  })()}
                </div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {EMOTIONS.map(emotion => (
                    <button
                      key={emotion.level}
                      onClick={async () => {
                        const latest = getLatestDiaryForDate(selectedDate);
                        if (!latest) return;
                        setLoading(true);
                        try {
                          await updateEmotionDiary(latest.id, { emotion_level: emotion.level });
                          toast.success('当天情绪已更新', { duration: 1000 });
                          await loadDiaries();
                        } catch {
                          toast.error('更新失败', { duration: 1000 });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${emotion.colorActive}`}
                    >
                      <span className="text-2xl">{emotion.emoji}</span>
                      <span className="text-xs font-medium">{emotion.label}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-2">切换图片</h4>
                  <div className="grid grid-cols-6 gap-2">
                    {['开心_1.png','喜悦恋爱_1.png','治愈温暖_1.png','惊讶_1.png','困倦_1.png','悲伤_1.png','生气_1.png','害怕_1.png'].map((name) => {
                      const src = `/srcs/enjoy/${encodeURIComponent(name)}`;
                      return (
                        <button key={name} onClick={async () => {
                          const latest = getLatestDiaryForDate(selectedDate);
                          if (!latest) return;
                          setLoading(true);
                          try {
                            await updateEmotionDiary(latest.id, { image_urls: [src] });
                            toast.success('图片已切换', { duration: 1000 });
                            await loadDiaries();
                          } catch {
                            toast.error('切换失败', { duration: 1000 });
                          } finally {
                            setLoading(false);
                          }
                        }} className="aspect-square rounded-lg overflow-hidden border hover:shadow">
                          <img src={src} alt={name} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {getDiariesForDate(selectedDate).map((d) => (
              <div key={d.id} className="rounded-2xl border bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
                <div className="flex gap-4 p-4">
                  <div className="shrink-0 w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
                    {getEmotionEmoji(d.emotion_level)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1 flex-wrap">
                        {d.tags?.map(tag => (
                          <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(editingId === d.id ? null : d.id);
                          setEditContent(d.content || '');
                        }}
                        className="h-8"
                      >
                        {editingId === d.id ? '取消' : '编辑'}
                      </Button>
                    </div>
                    {editingId === d.id ? (
                      <div className="space-y-2">
                        <Textarea rows={5} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                        <div className="flex justify-end">
                          <Button size="sm" onClick={async () => {
                            setLoading(true);
                            try {
                              await updateEmotionDiary(d.id, { content: editContent });
                              toast.success('已更新', { duration: 1000 });
                              await loadDiaries();
                              setEditingId(null);
                            } catch (e) {
                              toast.error('更新失败', { duration: 1000 });
                            } finally {
                              setLoading(false);
                            }
                          }}>
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                            完成
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-300">
                        {d.content || '暂无内容'}
                      </p>
                    )}
                    {d.image_urls && d.image_urls.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {d.image_urls.map((url, idx) => (
                          <button key={idx} className="aspect-square rounded-lg overflow-hidden border hover:shadow" onClick={() => promptUploadForDiary(d.id, idx)} title="点击替换此图片">
                            <img src={url} alt={`dimg-${idx}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                        <button className="aspect-square rounded-lg overflow-hidden border-dashed border-2 border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground hover:border-primary hover:text-primary" onClick={() => promptUploadForDiary(d.id)} title="添加图片">+
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 pb-6">
            <Button variant="outline" onClick={() => setDayDialogOpen(false)} className="w-full h-11 rounded-xl">关闭</Button>
          </div>
        </DialogContent>
      </Dialog>
      <MoodFeedbackOverlay 
        type={feedbackType} 
        content={content}
        onClose={() => setFeedbackType(null)} 
      />
    </div>
  );
}
