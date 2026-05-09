import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import QuickNote from '@/components/record/QuickNote';

export default function VoiceTest() {
  const [savedData, setSavedData] = useState<any>(null);

  const handleSave = async (data: {
    content: string;
    imageUrls: string[];
    voiceUrl?: string;
  }) => {
    console.log('保存的数据:', data);
    setSavedData(data);
    toast.success('测试保存成功！');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>语音识别测试</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickNote onSave={handleSave} />
        </CardContent>
      </Card>

      {savedData && (
        <Card>
          <CardHeader>
            <CardTitle>保存的数据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <strong>文本内容:</strong>
                <p className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  {savedData.content || '无内容'}
                </p>
              </div>
              <div>
                <strong>图片数量:</strong> {savedData.imageUrls?.length || 0}
              </div>
              {savedData.voiceUrl && (
                <div>
                  <strong>语音文件:</strong> {savedData.voiceUrl}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}