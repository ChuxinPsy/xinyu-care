import { Camera, Loader2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { multimodalAnalysis } from '@/db/api';

// 表情映射
const EMOTION_MAP: Record<string, { label: string; emoji: string; color: string }> = {
  happy: { label: '快乐', emoji: '😊', color: 'bg-success text-white' },
  sad: { label: '悲伤', emoji: '😢', color: 'bg-info text-white' },
  angry: { label: '愤怒', emoji: '😠', color: 'bg-destructive text-white' },
  fear: { label: '恐惧', emoji: '😨', color: 'bg-warning text-white' },
  surprise: { label: '惊讶', emoji: '😲', color: 'bg-chart-4 text-white' },
  disgust: { label: '厌恶', emoji: '🤢', color: 'bg-chart-5 text-white' },
  neutral: { label: '中性', emoji: '😐', color: 'bg-muted text-foreground' },
  embarrassed: { label: '尴尬', emoji: '😅', color: 'bg-chart-3 text-white' },
  anxious: { label: '焦虑', emoji: '😰', color: 'bg-warning text-white' },
  calm: { label: '平静', emoji: '😌', color: 'bg-success text-white' },
};

interface EmotionCameraProps {
  onClose: () => void;
  onEmotionDetected?: (emotion: string, confidence: number) => void;
}

export default function EmotionCamera({ onClose, onEmotionDetected }: EmotionCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // 等待视频加载后开始分析
        videoRef.current.onloadedmetadata = () => {
          startEmotionDetection();
        };
      }
    } catch (err) {
      console.error('摄像头启动失败:', err);
      setError('无法访问摄像头,请检查权限设置');
      toast.error('摄像头启动失败');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startEmotionDetection = () => {
    // 每3秒分析一次表情
    intervalRef.current = setInterval(() => {
      captureAndAnalyze();
    }, 3000);
    
    // 立即执行一次
    captureAndAnalyze();
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    try {
      setIsAnalyzing(true);
      
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      ctx.drawImage(video, 0, 0);
      
      // 转换为base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // 调用多模态分析API
      const result = await multimodalAnalysis([
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '请分析这张面部图片的表情,从以下选项中选择最匹配的一个:快乐(happy)、悲伤(sad)、愤怒(angry)、恐惧(fear)、惊讶(surprise)、厌恶(disgust)、中性(neutral)、尴尬(embarrassed)、焦虑(anxious)、平静(calm)。只返回英文关键词和置信度(0-100),格式:emotion:confidence',
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ]);
      
      // 解析结果
      parseEmotionResult(result);
      
    } catch (err) {
      console.error('表情分析失败:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseEmotionResult = (result: any) => {
    try {
      // 从API响应中提取文本
      let text = '';
      if (result.choices && result.choices[0]?.delta?.content) {
        text = result.choices[0].delta.content;
      } else if (result.content) {
        text = result.content;
      } else if (result.text) {
        text = result.text;
      } else if (typeof result === 'string') {
        text = result;
      }
      
      // 尝试多种解析方式
      let emotion = 'neutral';
      let conf = 50;
      
      // 方式1: emotion:confidence格式
      const match1 = text.match(/(happy|sad|angry|fear|surprise|disgust|neutral|embarrassed|anxious|calm):(\d+)/i);
      if (match1) {
        emotion = match1[1].toLowerCase();
        conf = parseInt(match1[2]);
      } else {
        // 方式2: 直接查找关键词
        const lowerText = text.toLowerCase();
        for (const key of Object.keys(EMOTION_MAP)) {
          if (lowerText.includes(key)) {
            emotion = key;
            // 尝试提取数字作为置信度
            const numMatch = text.match(/(\d+)%?/);
            if (numMatch) {
              conf = parseInt(numMatch[1]);
            }
            break;
          }
        }
        
        // 方式3: 中文匹配
        for (const [key, value] of Object.entries(EMOTION_MAP)) {
          if (lowerText.includes(value.label)) {
            emotion = key;
            const numMatch = text.match(/(\d+)%?/);
            if (numMatch) {
              conf = parseInt(numMatch[1]);
            }
            break;
          }
        }
      }
      
      setCurrentEmotion(emotion);
      setConfidence(conf);
      
      if (onEmotionDetected) {
        onEmotionDetected(emotion, conf);
      }
      
    } catch (err) {
      console.error('解析表情结果失败:', err);
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const emotionInfo = currentEmotion ? EMOTION_MAP[currentEmotion] : null;

  return (
    <Card className="glass border-primary/20 shadow-glow animate-scale-in">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center shadow-glow">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">面部表情识别</h3>
              <p className="text-sm text-muted-foreground">实时分析你的情绪状态</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="hover:bg-destructive/10 hover:text-destructive transition-smooth"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {error ? (
          <div className="text-center py-8 text-destructive">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* 视频预览 */}
            <div className="relative mb-4 rounded-xl overflow-hidden border-2 border-primary/20 shadow-glow">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-md mx-auto"
              />
              
              {/* 分析中指示器 */}
              {isAnalyzing && (
                <div className="absolute top-4 right-4 bg-primary/90 text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-glow animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">分析中...</span>
                </div>
              )}
              
              {/* 表情识别结果 */}
              {emotionInfo && !isAnalyzing && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-fade-in-up">
                  <Badge className={`${emotionInfo.color} px-6 py-3 text-lg font-bold shadow-glow`}>
                    <span className="text-2xl mr-2">{emotionInfo.emoji}</span>
                    {emotionInfo.label}
                    <span className="ml-2 text-sm opacity-90">({confidence}%)</span>
                  </Badge>
                </div>
              )}
            </div>

            {/* 隐藏的canvas用于截图 */}
            <canvas ref={canvasRef} className="hidden" />

            {/* 表情历史 */}
            {currentEmotion && (
              <div className="mt-4 p-4 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border border-border">
                <p className="text-sm text-muted-foreground mb-2">当前检测到的表情:</p>
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{emotionInfo?.emoji}</span>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{emotionInfo?.label}</p>
                    <p className="text-sm text-muted-foreground">置信度: {confidence}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* 提示信息 */}
            <div className="mt-4 p-3 bg-info/10 border border-info/20 rounded-lg">
              <p className="text-sm text-info flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-info animate-pulse" />
                系统每3秒自动分析一次表情,请保持面部清晰可见
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
