import { Check, Edit, Image, Loader2, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { EmotionDiary, EmotionLevel } from '@/types';

interface NoteDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  diary: EmotionDiary | null;
  onUpdate: (id: string, data: Partial<EmotionDiary>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const emotionLevelMap: Record<EmotionLevel, { label: string; emoji: string; color: string }> = {
  very_bad: { label: '很差', emoji: '😢', color: 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400' },
  bad: { label: '较差', emoji: '😔', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400' },
  neutral: { label: '一般', emoji: '😐', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
  good: { label: '较好', emoji: '🙂', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' },
  very_good: { label: '很好', emoji: '😊', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' },
};

export default function NoteDetailDialog({
  open,
  onOpenChange,
  diary,
  onUpdate,
  onDelete,
}: NoteDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!diary) return null;

  const emotionInfo = emotionLevelMap[diary.emotion_level];

  // 开始编辑
  const handleStartEdit = () => {
    setEditContent(diary.content || '');
    setIsEditing(true);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent('');
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      toast.error('内容不能为空');
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(diary.id, { content: editContent.trim() });
      setIsEditing(false);
      toast.success('更新成功');
    } catch (error) {
      console.error('更新失败:', error);
      toast.error('更新失败');
    } finally {
      setIsUpdating(false);
    }
  };

  // 删除记录
  const handleDelete = async () => {
    if (!confirm('确定要删除这条记录吗?')) return;

    setIsDeleting(true);
    try {
      await onDelete(diary.id);
      onOpenChange(false);
      toast.success('删除成功');
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-200">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{emotionInfo.emoji}</span>
              <div>
                <div className="text-lg font-semibold">
                  {new Date(diary.diary_date).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400 font-normal">
                  {new Date(diary.diary_date).toLocaleDateString('zh-CN', {
                    weekday: 'long',
                  })}
                </div>
              </div>
            </div>
            <Badge className={`${emotionInfo.color} border-0 shadow-sm`}>
              {emotionInfo.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 标题 */}
          {diary.title && (
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {diary.title}
              </h3>
            </div>
          )}

          {/* 内容 */}
          <div>
            {isEditing ? (
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[120px] resize-none"
                placeholder="写下你的想法..."
              />
            ) : (
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                {diary.content || '暂无内容'}
              </p>
            )}
          </div>

          {/* 图片 */}
          {diary.image_urls && diary.image_urls.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <Image className="w-4 h-4" />
                图片 ({diary.image_urls.length})
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {diary.image_urls.map((url, index) => (
                  <div key={index} className="group relative">
                    <img
                      src={url}
                      alt={`图片 ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-all duration-200 shadow-sm hover:shadow-md"
                      onClick={() => window.open(url, '_blank')}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors duration-200 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 dark:bg-slate-800/90 rounded-full p-2">
                        <Image className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 标签 */}
          {diary.tags && diary.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {diary.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* AI分析 */}
          {diary.ai_analysis && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                AI分析
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                {typeof diary.ai_analysis === 'string' 
                  ? diary.ai_analysis 
                  : diary.ai_analysis.summary || '暂无分析'}
              </p>
            </div>
          )}

          {/* 时间信息 */}
          <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
            创建于 {new Date(diary.created_at).toLocaleString('zh-CN')}
            {diary.updated_at !== diary.created_at && (
              <> · 更新于 {new Date(diary.updated_at).toLocaleString('zh-CN')}</>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          {isEditing ? (
            <div className="flex items-center gap-2 w-full">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isUpdating}
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    保存
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleStartEdit}
                className="hover:bg-blue-50 dark:hover:bg-blue-950/30"
              >
                <Edit className="w-4 h-4 mr-2" />
                编辑
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    删除中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    删除
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
