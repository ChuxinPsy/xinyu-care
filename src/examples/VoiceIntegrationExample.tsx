import { useState } from 'react';
import { toast } from 'sonner';
import QuickNote from '@/components/record/QuickNote';

/**
 * 语音功能集成示例
 * 展示如何在其他组件中使用 QuickNote 的语音输入功能
 */
export default function VoiceIntegrationExample() {
  const [notes, setNotes] = useState<Array<{
    id: string;
    content: string;
    imageUrls: string[];
    timestamp: Date;
  }>>([]);

  // 处理保存笔记
  const handleSaveNote = async (data: {
    content: string;
    imageUrls: string[];
    voiceUrl?: string;
  }) => {
    try {
      // 这里可以添加你的保存逻辑
      // 例如：保存到数据库、本地存储等
      
      const newNote = {
        id: Date.now().toString(),
        content: data.content,
        imageUrls: data.imageUrls,
        timestamp: new Date(),
      };

      setNotes(prev => [newNote, ...prev]);
      
      // 可选：保存到后端
      // await saveToDatabase(newNote);
      
      toast.success('笔记保存成功！');
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败，请重试');
      throw error; // 重新抛出错误，让 QuickNote 组件处理
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">语音笔记应用</h1>
        <p className="text-gray-600">支持语音输入、文字编辑和图片上传</p>
      </div>

      {/* 语音输入组件 */}
      <QuickNote onSave={handleSaveNote} />

      {/* 笔记列表 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">我的笔记</h2>
        {notes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            还没有笔记，开始记录吧！
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm text-gray-500">
                  {note.timestamp.toLocaleString()}
                </span>
              </div>
              
              {note.content && (
                <p className="text-gray-800 dark:text-gray-200 mb-3">
                  {note.content}
                </p>
              )}
              
              {note.imageUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {note.imageUrls.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`图片 ${index + 1}`}
                      className="w-full h-20 object-cover rounded"
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * 使用说明：
 * 
 * 1. 导入 QuickNote 组件
 * 2. 实现 onSave 回调函数处理保存逻辑
 * 3. QuickNote 会自动处理：
 *    - 语音录制和识别
 *    - 图片上传
 *    - 文本输入
 *    - 用户界面和交互
 * 
 * 语音功能特性：
 * - 自动请求麦克风权限
 * - 实时录音状态显示
 * - 语音转文字并自动填充
 * - 完整的错误处理
 */