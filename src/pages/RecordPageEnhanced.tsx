import { zhCN } from 'date-fns/locale';
import { BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import NoteDetailDialog from '@/components/record/NoteDetailDialog';
import QuickNote from '@/components/record/QuickNote';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { 
  createEmotionDiary, 
  deleteEmotionDiary, 
  getEmotionDiaries, 
  updateEmotionDiary
} from '@/db/api';
import type { EmotionDiary, EmotionLevel } from '@/types';

export default function RecordPageEnhanced() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [diaries, setDiaries] = useState<EmotionDiary[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDiary, setSelectedDiary] = useState<EmotionDiary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadDiaries();
    }
  }, [user]);

  const loadDiaries = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getEmotionDiaries(user.id, 100);
      setDiaries(data);
    } catch (error) {
      console.error('加载日记失败:', error);
      toast.error('加载日记失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存快速记录
  const handleQuickNoteSave = async (data: {
    content: string;
    imageUrls: string[];
    voiceUrl?: string;
  }) => {
    if (!user) return;

    try {
      await createEmotionDiary({
        user_id: user.id,
        diary_date: new Date().toISOString().split('T')[0],
        emotion_level: 'neutral' as EmotionLevel,
        content: data.content,
        image_urls: data.imageUrls,
        voice_url: data.voiceUrl,
      });

      await loadDiaries();
      toast.success('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      throw error;
    }
  };

  // 更新日记
  const handleUpdateDiary = async (id: string, updates: Partial<EmotionDiary>) => {
    try {
      await updateEmotionDiary(id, updates);
      await loadDiaries();
      
      // 更新选中的日记
      if (selectedDiary && selectedDiary.id === id) {
        setSelectedDiary({ ...selectedDiary, ...updates });
      }
    } catch (error) {
      console.error('更新失败:', error);
      throw error;
    }
  };

  // 删除日记
  const handleDeleteDiary = async (id: string) => {
    try {
      await deleteEmotionDiary(id);
      await loadDiaries();
      setSelectedDiary(null);
    } catch (error) {
      console.error('删除失败:', error);
      throw error;
    }
  };

  // 获取有记录的日期
  const getDiaryDates = () => {
    return diaries.map(diary => new Date(diary.diary_date));
  };

  // 检查日期是否有记录
  const hasRecordOnDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return diaries.some(diary => diary.diary_date === dateStr);
  };

  // 点击日期
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);

    const dateStr = date.toISOString().split('T')[0];
    const diaryOnDate = diaries.find(diary => diary.diary_date === dateStr);
    
    if (diaryOnDate) {
      setSelectedDiary(diaryOnDate);
      setDialogOpen(true);
    }
  };

  // 获取当月的日记统计
  const getMonthStats = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthDiaries = diaries.filter(diary => {
      const diaryDate = new Date(diary.diary_date);
      return diaryDate.getMonth() === currentMonth && diaryDate.getFullYear() === currentYear;
    });

    return {
      total: monthDiaries.length,
      withImages: monthDiaries.filter(d => d.image_urls && d.image_urls.length > 0).length,
    };
  };

  const monthStats = getMonthStats();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* 顶部标题 */}
      <div className="bg-white dark:bg-slate-800 px-4 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-200">随手记</h1>
          </div>
          <Badge variant="secondary" className="text-sm">
            本月 {monthStats.total} 条记录
          </Badge>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
        {/* 快速记录 */}
        <div className="space-y-2 animate-fade-in-down">
          <QuickNote onSave={handleQuickNoteSave} />
        </div>

        {/* 日历视图 */}
        <Card className="border-0 shadow-lg animate-fade-in-up bg-white dark:bg-slate-800" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">日历视图</h2>
            </div>

            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              locale={zhCN}
              className="rounded-lg border-0 w-full"
              modifiers={{
                hasRecord: getDiaryDates(),
              }}
              modifiersStyles={{
                hasRecord: {
                  backgroundColor: 'rgb(16 185 129 / 0.15)',
                  color: 'rgb(5 150 105)',
                  fontWeight: 'bold',
                  position: 'relative',
                  borderRadius: '6px',
                  border: '2px solid rgb(16 185 129 / 0.3)',
                },
              }}
              modifiersClassNames={{
                hasRecord: 'relative after:content-["📝"] after:absolute after:top-0 after:right-0 after:text-xs after:leading-none',
              }}
              disabled={(date) => date > new Date()}
            />

            <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-emerald-600 dark:text-emerald-400">💡</span>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  使用提示
                </span>
              </div>
              <ul className="text-sm text-emerald-600 dark:text-emerald-400 space-y-1">
                <li>• 点击有 📝 标记的日期查看记录</li>
                <li>• 绿色边框表示该日期有记录</li>
                <li>• 本月已记录 {monthStats.total} 天</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* 最近记录 */}
        <div className="space-y-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">最近记录</h3>
            <Badge variant="outline" className="text-xs">
              共 {diaries.length} 条
            </Badge>
          </div>

          {loading ? (
            <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
              <CardContent className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ) : diaries.length > 0 ? (
            diaries.slice(0, 10).map((diary) => (
              <Card
                key={diary.id}
                className="border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-white dark:bg-slate-800"
                onClick={() => {
                  setSelectedDiary(diary);
                  setDialogOpen(true);
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          {new Date(diary.diary_date).toLocaleDateString('zh-CN', {
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                        {diary.image_urls && diary.image_urls.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            📷 {diary.image_urls.length}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">
                        {diary.content || '暂无内容'}
                      </p>
                    </div>
                    {diary.image_urls && diary.image_urls.length > 0 && (
                      <img
                        src={diary.image_urls[0]}
                        alt="预览"
                        className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-0 shadow-md bg-white dark:bg-slate-800">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 mb-2">暂无记录</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  开始记录你的每一天吧
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 详情对话框 */}
      <NoteDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        diary={selectedDiary}
        onUpdate={handleUpdateDiary}
        onDelete={handleDeleteDiary}
      />
    </div>
  );
}
