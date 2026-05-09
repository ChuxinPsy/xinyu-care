import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { chatCompletion, createEmotionDiary, getEmotionDiaries, getEmotionDiaryByDate, updateEmotionDiary } from '@/db/api';
import type { EmotionDiary, EmotionLevel } from '@/types';

const emotionLevels: { value: EmotionLevel; label: string; emoji: string }[] = [
  { value: 'very_bad', label: '很差', emoji: '😢' },
  { value: 'bad', label: '较差', emoji: '😔' },
  { value: 'neutral', label: '一般', emoji: '😐' },
  { value: 'good', label: '较好', emoji: '🙂' },
  { value: 'very_good', label: '很好', emoji: '😊' },
];

export default function RecordPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [diaries, setDiaries] = useState<EmotionDiary[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentDiary, setCurrentDiary] = useState<EmotionDiary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // 表单状态
  const [emotionLevel, setEmotionLevel] = useState<EmotionLevel>('neutral');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (user) {
      loadDiaries();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedDate) {
      loadDiaryByDate(selectedDate);
    }
  }, [selectedDate, user]);

  const loadDiaries = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getEmotionDiaries(user.id, 90);
      setDiaries(data);
    } catch (error) {
      console.error('加载日记失败:', error);
      toast.error('加载日记失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDiaryByDate = async (date: Date) => {
    if (!user) return;
    const dateStr = date.toISOString().split('T')[0];
    try {
      const diary = await getEmotionDiaryByDate(user.id, dateStr);
      setCurrentDiary(diary);
      if (diary) {
        setEmotionLevel(diary.emotion_level);
        setTitle(diary.title || '');
        setContent(diary.content || '');
      } else {
        setEmotionLevel('neutral');
        setTitle('');
        setContent('');
      }
    } catch (error) {
      console.error('加载日记失败:', error);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!content.trim()) {
      toast.error('请输入日记内容');
      return;
    }

    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const diaryData = {
        user_id: user.id,
        diary_date: dateStr,
        emotion_level: emotionLevel,
        title: title || undefined,
        content,
      };

      if (currentDiary) {
        await updateEmotionDiary(currentDiary.id, diaryData);
        toast.success('日记已更新');
      } else {
        await createEmotionDiary(diaryData);
        toast.success('日记已保存');
      }

      await loadDiaries();
      await loadDiaryByDate(selectedDate);
      setDialogOpen(false);
    } catch (error: any) {
      console.error('保存日记失败:', error);
      toast.error('保存失败: ' + (error.message || '未知错误'));
    }
  };

  const handleAIAnalysis = async () => {
    if (!content.trim()) {
      toast.error('请先输入日记内容');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await chatCompletion([
        {
          role: 'system',
          content: '你是一位专业的心理咨询师,请分析用户的情绪日记,给出温暖、专业的情绪分析和建议。分析应包括:情绪识别、可能的原因、积极的建议。回复要简洁温暖,不超过150字。',
        },
        {
          role: 'user',
          content: `我今天的情绪是${emotionLevels.find(e => e.value === emotionLevel)?.label},日记内容:\n${content}`,
        },
      ]);

      if (response?.choices?.[0]?.delta?.content) {
        const analysis = response.choices[0].delta.content;
        toast.success('AI分析完成');
        
        // 更新日记的AI分析
        if (currentDiary) {
          await updateEmotionDiary(currentDiary.id, {
            ai_analysis: { analysis, timestamp: new Date().toISOString() },
          });
          await loadDiaryByDate(selectedDate);
        }
      }
    } catch (error) {
      console.error('AI分析失败:', error);
      toast.error('AI分析失败,请稍后重试');
    } finally {
      setAnalyzing(false);
    }
  };

  const markedDates = diaries.map(d => new Date(d.diary_date));

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部标题 */}
      <div className="bg-primary text-primary-foreground p-6">
        <div className="max-w-screen-xl mx-auto">
          <h1 className="text-2xl font-bold flex items-center">
            <CalendarIcon className="w-6 h-6 mr-2" />
            情绪日记
          </h1>
          <p className="text-primary-foreground/90 mt-1">记录每一天的心情</p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto p-4 space-y-4">
        {/* 日历选择 */}
        <Card>
          <CardContent className="pt-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={zhCN}
              className="rounded-md border-0"
              modifiers={{
                marked: markedDates,
              }}
              modifiersStyles={{
                marked: {
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  color: 'hsl(var(--primary))',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* 当前日期的日记 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{selectedDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    {currentDiary ? '编辑' : '记录'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>情绪日记</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>今日情绪</Label>
                      <div className="flex gap-2 flex-wrap">
                        {emotionLevels.map((level) => (
                          <Button
                            key={level.value}
                            variant={emotionLevel === level.value ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setEmotionLevel(level.value)}
                          >
                            <span className="mr-1">{level.emoji}</span>
                            {level.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">标题(可选)</Label>
                      <Input
                        id="title"
                        placeholder="给今天起个标题"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">日记内容</Label>
                      <Textarea
                        id="content"
                        placeholder="写下你今天的心情和想法..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows={8}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleSave} className="flex-1">
                        保存日记
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleAIAnalysis}
                        disabled={analyzing}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        {analyzing ? 'AI分析中...' : 'AI分析'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 bg-muted" />
            ) : currentDiary ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {emotionLevels.find(e => e.value === currentDiary.emotion_level)?.emoji}
                  </span>
                  <Badge>
                    {emotionLevels.find(e => e.value === currentDiary.emotion_level)?.label}
                  </Badge>
                </div>
                {currentDiary.title && (
                  <h3 className="text-lg font-semibold">{currentDiary.title}</h3>
                )}
                <p className="text-muted-foreground whitespace-pre-wrap">{currentDiary.content}</p>
                {currentDiary.ai_analysis?.analysis && (
                  <div className="mt-4 p-4 bg-accent/50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Sparkles className="w-4 h-4 mr-2 text-primary" />
                      <span className="text-sm font-semibold">AI情绪分析</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{currentDiary.ai_analysis.analysis}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>这一天还没有记录</p>
                <Button variant="link" size="sm" className="mt-2" onClick={() => setDialogOpen(true)}>
                  立即记录
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
