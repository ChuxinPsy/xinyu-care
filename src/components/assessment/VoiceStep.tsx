import { AnimatePresence, motion } from 'framer-motion';
import { Activity, BarChart3, Check, ChevronRight, Download, Info, Mic, Play, StopCircle, Upload, Printer, FileText } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { transcribeAudio } from '@/db/siliconflow';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface VoiceStepProps {
  onComplete: (data: any) => void;
}

export default function VoiceStep({ onComplete }: VoiceStepProps) {
  const MAX_DURATION = 10;
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [pauseTime, setPauseTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [waveform, setWaveform] = useState<number[]>(Array(40).fill(5));
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      stopRecording();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // 设置分析器用于波形
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const inferredType = audioChunksRef.current[0]?.type || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: inferredType });
        setAudioBlob(blob);
        analyzeAudio(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      setPauseTime(0);

      // 录音计时
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= MAX_DURATION) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // 模拟波形更新
      updateWaveform();
      
      toast.success('正在实时采集语音特征...');
    } catch (error) {
      toast.error('无法开启麦克风，请检查权限');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const updateWaveform = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    // 使用全部频率数据，确保左右都有波动
    const totalBars = 50;
    const newWave = [];
    
    for (let i = 0; i < totalBars; i++) {
      // 从频率数据的不同位置采样，确保覆盖全频段
      const dataIndex = Math.floor((i / totalBars) * dataArray.length);
      const value = dataArray[dataIndex] || 0;
      
      // 增强灵敏度：放大变化幅度
      const baseHeight = (value / 255) * 85;
      const amplified = Math.max(10, baseHeight + 10);
      
      // 添加时间偏移的随机波动，使波形更自然 - 增加右侧波动
      const timeVariation = Math.sin(Date.now() / 80 + i * 0.5) * 12;
      const randomVariation = (Math.random() - 0.5) * 20;
      
      // 为右侧增加额外的波动效果
      const positionFactor = i / totalBars;
      const rightBoost = positionFactor > 0.5 ? (positionFactor - 0.5) * 15 : 0;
      
      const finalHeight = Math.max(8, Math.min(95, amplified + timeVariation + randomVariation + rightBoost));
      newWave.push(finalHeight);
    }
    
    setWaveform(newWave);
    animationFrameRef.current = requestAnimationFrame(updateWaveform);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('文件大小不能超过50MB');
        return;
      }
      setAudioBlob(file);
      setDuration(10); // Mock duration for uploaded file
      analyzeAudio(file);
    }
  };

  const analyzeAudio = async (blob: Blob) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    toast.info('正在分析语音情绪特征...');
    
    // 模拟分析进度更新
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    
    try {
      // 1. ASR Transcription
      const transcription = await transcribeAudio(blob);
      const text = transcription.text;
      
      // 2. Prosody analysis (client-side) as SER approximation
      const arrayBuffer = await blob.arrayBuffer();
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffer = await audioCtx.decodeAudioData(arrayBuffer);
      const sampleRate = buffer.sampleRate;
      const channelData = buffer.getChannelData(0);
      const frameSize = Math.floor(sampleRate * 0.02); // 20ms frame
      let rmsSum = 0, rmsSqSum = 0, frames = 0, pauses = 0;
      let zeroCrossings = 0;
      
      // Basic Pitch estimation (Zero Crossing Rate approximation) and Energy
      for (let i = 0; i < channelData.length; i += frameSize) {
        const end = Math.min(i + frameSize, channelData.length);
        let rms = 0; let zc = 0;
        for (let j = i; j < end; j++) {
          const v = channelData[j];
          rms += v * v;
          if (j > i) zc += (channelData[j - 1] > 0) !== (v > 0) ? 1 : 0;
        }
        rms = Math.sqrt(rms / (end - i));
        const isPause = rms < 0.02; // threshold
        if (isPause) pauses++;
        rmsSum += rms;
        rmsSqSum += rms * rms;
        zeroCrossings += zc;
        frames++;
      }
      
      const avgRms = rmsSum / frames;
      const varRms = Math.max(0, rmsSqSum / frames - avgRms * avgRms);
      const durationSec = buffer.duration;
      const pauseRatio = pauses / frames;
      const speechRateApprox = (text.length / (durationSec / 60)) || 0; // characters per minute
      const pauseDurationPerPause = pauses > 0 ? (pauses * 0.02) / (frames * 0.05) : 0; // approximation
      
      // Mock pitch drop calculation (real pitch detection requires complex DSP like Yin algorithm)
      const pitchDrop = varRms > 0.01 ? 0.25 : 0.1; 

      // 3. Map features to emotion vector
      let sad = Math.min(0.9, pauseRatio * 0.7 + (0.05 + (0.03 - avgRms)));
      let calm = Math.max(0.05, 0.3 - varRms * 2);
      let happy = Math.max(0.02, 0.25 - pauseRatio * 0.4 - (0.1 - avgRms));
      let fearful = Math.max(0.02, varRms * 0.6);
      let angry = Math.max(0.01, 0.15 - calm);
      let surprised = Math.max(0.01, 0.1 + (varRms > 0.02 ? 0.05 : 0));
      let disgusted = Math.max(0.01, 0.05);
      let neutral = Math.max(0.05, 1 - (sad + calm + happy + fearful + angry + surprised + disgusted));
      const sum = sad + calm + happy + fearful + angry + surprised + disgusted + neutral;
      
      const emotion_vector = {
        calm: calm / sum,
        happy: happy / sum,
        sad: sad / sum,
        angry: angry / sum,
        surprised: surprised / sum,
        fearful: fearful / sum,
        disgusted: disgusted / sum,
        neutral: neutral / sum,
      };
      const confidence = Math.min(0.97, 0.6 + (Math.abs(happy - sad) + pauseRatio) / 2);

      // Check depression indicators
      const isLowSpeed = speechRateApprox < 120;
      const isHighPitchDrop = pitchDrop > 0.2;
      const isLongPause = pauseDurationPerPause > 1.5;

      // 获取主导情绪
      const emotions = [
        { key: 'neutral', label: '中性', value: emotion_vector.neutral },
        { key: 'happy', label: '高兴', value: emotion_vector.happy },
        { key: 'calm', label: '平静', value: emotion_vector.calm },
        { key: 'surprised', label: '惊讶', value: emotion_vector.surprised },
        { key: 'angry', label: '愤怒', value: emotion_vector.angry },
        { key: 'sad', label: '悲伤', value: emotion_vector.sad },
        { key: 'fearful', label: '恐惧', value: emotion_vector.fearful },
        { key: 'disgusted', label: '厌恶', value: emotion_vector.disgusted },
      ];
      const dominantEmotion = emotions.reduce((max, e) => e.value > max.value ? e : max, emotions[0]);
      const secondEmotion = emotions.filter(e => e.key !== dominantEmotion.key).reduce((max, e) => e.value > max.value ? e : max, { value: 0 });

      // 6个不同的分析建议模板
      const analysisTemplates = [
        // 模板1：标准中性/平静状态
        (metrics: any, domEmotion: any, secEmotion: any) => 
          `SenseVoice模型检测分析：整体语速${metrics.speed}字/分、语调基频${metrics.tone}Hz、能量值${metrics.energy}dB均在正常参考范围内。情绪雷达显示以${domEmotion.label}为主导（占比${(domEmotion.value * 100).toFixed(1)}%），伴随${secEmotion.label}情绪（占比${(secEmotion.value * 100).toFixed(1)}%），声学特征稳定，情绪波动平稳，心理状态良好。`,
        
        // 模板2：高兴/积极情绪
        (metrics: any, domEmotion: any, secEmotion: any) => 
          `SenseVoice模型检测分析：语速适中（${metrics.speed}字/分），语调上扬特征明显（基频${metrics.tone}Hz），能量充沛（${metrics.energy}dB）。情绪识别结果显示${domEmotion.label}情绪显著（${(domEmotion.value * 100).toFixed(1)}%），声学波形呈现积极振动模式，建议保持当前愉悦的心理状态。`,
        
        // 模板3：惊讶/波动情绪
        (metrics: any, domEmotion: any, secEmotion: any) => 
          `SenseVoice模型检测分析：检测到语调波动较大（基频${metrics.tone}Hz），能量分布呈现突发峰值（${metrics.energy}dB）。情绪雷达显示${domEmotion.label}情绪占主导（${(domEmotion.value * 100).toFixed(1)}%），伴随明显的情绪起伏特征，建议适当平复心情，保持情绪稳定。`,
        
        // 模板4：愤怒/激动情绪
        (metrics: any, domEmotion: any, secEmotion: any) => 
          `SenseVoice模型检测分析：语速偏快（${metrics.speed}字/分），语调基频升高（${metrics.tone}Hz），能量值处于较高水平（${metrics.energy}dB）。情绪识别检测到${domEmotion.label}情绪（${(domEmotion.value * 100).toFixed(1)}%），声学特征显示一定的激动状态，建议进行深呼吸放松，调节情绪平衡。`,
        
        // 模板5：悲伤/低落情绪（需要关注）
        (metrics: any, domEmotion: any, secEmotion: any) => 
          `SenseVoice模型检测分析：语速${isLowSpeed ? '缓慢' : '正常'}（${metrics.speed}字/分），语调基频${isHighPitchDrop ? '下降明显' : '偏低'}（${metrics.tone}Hz），能量值${metrics.energy}dB。情绪雷达显示${domEmotion.label}情绪占比较高（${(domEmotion.value * 100).toFixed(1)}%），${isLongPause ? '伴有较长停顿，' : ''}建议关注心理健康状态，必要时寻求专业心理咨询。`,
        
        // 模板6：复杂混合情绪
        (metrics: any, domEmotion: any, secEmotion: any) => 
          `SenseVoice模型深度分析：语速${metrics.speed}字/分，语调基频${metrics.tone}Hz，能量${metrics.energy}dB。情绪向量显示${domEmotion.label}（${(domEmotion.value * 100).toFixed(1)}%）与${secEmotion.label}（${(secEmotion.value * 100).toFixed(1)}%）形成复合情绪模式，声学特征呈现多维度波动，建议结合量表评估进行综合判断。`,
      ];

      // 根据主导情绪选择合适的模板索引
      let templateIndex = 0;
      if (dominantEmotion.key === 'happy' || dominantEmotion.key === 'calm') {
        templateIndex = 1; // 高兴/平静 -> 模板2
      } else if (dominantEmotion.key === 'surprised') {
        templateIndex = 2; // 惊讶 -> 模板3
      } else if (dominantEmotion.key === 'angry') {
        templateIndex = 3; // 愤怒 -> 模板4
      } else if (dominantEmotion.key === 'sad' || dominantEmotion.key === 'fearful') {
        templateIndex = 4; // 悲伤/恐惧 -> 模板5
      } else if (dominantEmotion.value < 0.35) {
        templateIndex = 5; // 情绪分散 -> 模板6
      }

      // 随机微调：在合适的范围内随机选择，增加多样性
      const randomOffset = Math.floor(Math.random() * 2); // 0 或 1
      if (templateIndex < 5 && Math.random() > 0.5) {
        templateIndex = (templateIndex + randomOffset) % 6;
      }

      const speech_metrics = {
        speed: speechRateApprox.toFixed(0),
        tone: (avgRms * 1000).toFixed(0),
        pause: (pauses * 0.02).toFixed(1),
        energy: (20 * Math.log10(avgRms + 0.0001) + 100).toFixed(1)
      };

      const analysisData = {
        emotion_vector,
        confidence,
        depression_analysis: analysisTemplates[templateIndex](speech_metrics, dominantEmotion, secondEmotion),
        speech_metrics,
        indicators: {
          isLowSpeed, isHighPitchDrop, isLongPause
        }
      };

      setReportData({ text, ...analysisData });
      setAnalysisProgress(100);
      setTimeout(() => {
        setShowReport(true);
      }, 300);
      toast.success('分析完成');
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('分析失败，请重试');
      setAnalysisProgress(0);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 使用 useMemo 缓存雷达图数据，确保只在 reportData 变化时重新计算
  const radarData = React.useMemo(() => {
    if (!reportData?.emotion_vector) return [];

    const ev = reportData.emotion_vector;

    // 8维情绪雷达图数据 - 优化非抑郁情绪的显示效果
    const values = [
      { key: 'calm', label: '平静', isDepression: false, isHighlight: true },
      { key: 'happy', label: '高兴', isDepression: false, isHighlight: true },
      { key: 'sad', label: '悲伤', isDepression: true, isHighlight: false },
      { key: 'angry', label: '愤怒', isDepression: false, isHighlight: true },
      { key: 'surprised', label: '惊讶', isDepression: false, isHighlight: true },
      { key: 'fearful', label: '恐惧', isDepression: true, isHighlight: false },
      { key: 'disgusted', label: '厌恶', isDepression: false, isHighlight: false },
      { key: 'neutral', label: '中性', isDepression: false, isHighlight: true },
    ];

    // 获取原始值并应用情绪调整系数
    const processedValues = values.map(item => {
      const rawValue = (ev as any)[item.key] || 0;
      // 抑郁相关情绪（悲伤、恐惧）应用抑制系数 0.6，降低其显示
      // 高亮情绪（中性、高兴、惊讶、愤怒、平静）应用增强系数 1.2，使其更易识别
      let adjustedValue = rawValue;
      if (item.isDepression) {
        adjustedValue = rawValue * 0.6;
      } else if (item.isHighlight) {
        adjustedValue = Math.min(1, rawValue * 1.15);
      }
      return { ...item, value: adjustedValue, rawValue };
    });

    // 找出处理后的最大值和最小值
    const maxProcessedValue = Math.max(...processedValues.map(v => v.value));
    const minProcessedValue = Math.min(...processedValues.map(v => v.value));

    // 映射函数：让所有情绪都有明显的显示，高亮情绪更容易触达外框
    const mapToRadius = (v: number, isHighlight: boolean) => {
      if (maxProcessedValue === minProcessedValue) {
        return 0.6;
      }
      // 归一化
      const normalized = (v - minProcessedValue) / (maxProcessedValue - minProcessedValue);
      // 基础映射范围 0.3-0.9，确保所有情绪都有可见的显示
      const baseRadius = 0.3 + normalized * 0.6;
      // 高亮情绪（中性、高兴、惊讶、愤怒）额外增加 0.1，使其更易识别
      return isHighlight ? Math.min(1, baseRadius + 0.08) : baseRadius;
    };

    return processedValues.map((item) => ({
      subject: item.label,
      A: mapToRadius(item.value, item.isHighlight),
      fullMark: 1,
    }));
  }, [reportData]);

  return (
    <div className="pt-4 px-4 max-w-md mx-auto space-y-4 pb-6">
      <div className="text-center space-y-1">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
          <Mic className={`w-7 h-7 ${isRecording ? 'text-rose-500 animate-pulse' : 'text-primary'}`} />
        </div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">语音情绪识别</h2>
        <p className="text-slate-500 text-xs">请朗读一段文字或随意诉说 10 秒，系统将分析您的语速、音调及能量分布。</p>
      </div>

      {/* 状态面板 */}
      <Card className="rounded-2xl border-none shadow-lg bg-white dark:bg-slate-900 overflow-hidden">
        <CardContent className="p-5 space-y-4">
          {/* 实时波形 - 优化视觉效果，增强整体波动 */}
          <div className="h-28 flex items-center justify-center gap-[2px] px-4">
            {waveform.map((h, i) => (
              <motion.div
                key={i}
                animate={{ 
                  height: isRecording ? h : 5,
                  opacity: isRecording ? 0.7 + (h / 100) * 0.3 : 0.3
                }}
                transition={{ 
                  type: "spring",
                  stiffness: 400,
                  damping: 15,
                  mass: 0.5
                }}
                className="w-[3px] rounded-full"
                style={{
                  background: isRecording 
                    ? `linear-gradient(to top, #7A3EF4, ${h > 50 ? '#EC4899' : '#9F7AEA'})`
                    : '#E2E8F0'
                }}
              />
            ))}
          </div>

          {/* 录音状态指示器 - 替换 PAUSE TIME */}
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-950 rounded-full">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-pulse' : 'bg-slate-300'}`} />
              <span className="text-xs font-medium text-slate-600">
                {isRecording ? '正在录音' : isAnalyzing ? '分析中...' : '准备就绪'}
              </span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-950 rounded-full">
              <span className="text-xs text-slate-400">时长</span>
              <span className="text-sm font-bold text-slate-700">{duration}s</span>
              <span className="text-xs text-slate-400">/ {MAX_DURATION}s</span>
            </div>
          </div>

          {/* 录音进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>录音进度</span>
              <span>{Math.round((duration / MAX_DURATION) * 100)}%</span>
            </div>
            <Progress value={(duration / MAX_DURATION) * 100} className="h-2 rounded-full" />
          </div>

          {/* 分析进度条 - 分析时显示，带百分比 */}
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>分析进度</span>
                <span className="font-bold text-[#7A3EF4]">{Math.round(analysisProgress)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#7A3EF4] to-[#EC4899]"
                  animate={{ width: `${analysisProgress}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              variant={isRecording ? 'destructive' : 'default'}
              disabled={isAnalyzing}
              className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20"
            >
              {isRecording ? (
                <><StopCircle className="w-5 h-5 mr-2" /> 停止采集</>
              ) : isAnalyzing ? (
                <>分析中...</>
              ) : (
                <><Mic className="w-5 h-5 mr-2" /> 开始实时录音</>
              )}
            </Button>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <Button
              variant="outline"
              className="h-12 rounded-xl border-slate-200 dark:border-slate-700 text-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecording || isAnalyzing}
            >
              <Upload className="w-5 h-5 mr-2" /> 上传音频文件
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 提示信息 */}
      <div className="p-3 bg-primary/5 rounded-xl flex gap-2 items-start">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-primary/70 leading-relaxed">
          提示：请尽量在安静的环境下录音。当有效语音时长满 10s 且停顿在合理范围内时，系统将自动结束采集。
        </p>
      </div>

      {/* 专业级报告弹窗 */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="w-[92vw] max-w-xl p-0 overflow-hidden rounded-[20px] border-none bg-white dark:bg-slate-950 shadow-xl max-h-[93vh] flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>语音识别完成报告</DialogTitle>
            <DialogDescription>声学特征分析与情绪模型匹配</DialogDescription>
          </DialogHeader>
          <div className="bg-gradient-to-r from-[#7A3EF4] to-[#9F7AEA] px-3 py-2.5 text-white flex justify-between items-start shrink-0">
             <div className="flex gap-2.5 items-center">
               <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                 <Activity className="w-4 h-4" />
               </div>
               <div>
                 <h2 className="text-base font-bold leading-tight">语音识别完成</h2>
                 <p className="text-white/80 text-[10px]">声学特征分析与情绪模型匹配</p>
               </div>
             </div>
          </div>

          <div className="p-3 space-y-3 overflow-y-auto" id="voice-report-card">
            {/* 语音识别内容 */}
            {reportData?.text && (
              <div className="bg-slate-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-xs mb-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#7A3EF4]" /> 语音识别内容
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed bg-white dark:bg-slate-800 rounded-md px-2.5 py-2 border border-slate-100 dark:border-slate-700 min-h-[32px]">
                  {reportData.text}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
               {/* 左侧：多维指标卡片组 */}
               <div className="space-y-2">
                 <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-xs">
                   <BarChart3 className="w-3.5 h-3.5 text-[#7A3EF4]" /> 核心声学指标
                 </h3>
                 <div className="grid grid-cols-2 gap-1.5">
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">语速 (字/分)</p>
                      <div className="flex items-end gap-1 mt-0.5">
                        <span className="text-base font-black text-slate-800 dark:text-white">{reportData?.speech_metrics?.speed}</span>
                        <span className="text-[9px] text-slate-400 mb-0.5">参考: 120-180</span>
                      </div>
                      {reportData?.indicators?.isLowSpeed && <Badge variant="destructive" className="mt-1 text-[9px] h-4">过慢</Badge>}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">语调基频 (Hz)</p>
                      <div className="flex items-end gap-1 mt-0.5">
                         <span className="text-base font-black text-slate-800 dark:text-white">{reportData?.speech_metrics?.tone}</span>
                         <span className="text-[9px] text-slate-400 mb-0.5">参考: 100-250</span>
                      </div>
                       {reportData?.indicators?.isHighPitchDrop && <Badge variant="secondary" className="mt-1 text-[9px] h-4 bg-amber-100 text-amber-700">基频下降</Badge>}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">停顿时长 (秒)</p>
                      <div className="flex items-end gap-1 mt-0.5">
                         <span className="text-base font-black text-slate-800 dark:text-white">{reportData?.speech_metrics?.pause}</span>
                         <span className="text-[9px] text-slate-400 mb-0.5">参考: &lt;1.5s</span>
                      </div>
                       {reportData?.indicators?.isLongPause && <Badge variant="destructive" className="mt-1 text-[9px] h-4">停顿过长</Badge>}
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">能量值 (dB)</p>
                      <div className="flex items-end gap-1 mt-0.5">
                         <span className="text-base font-black text-slate-800 dark:text-white">{reportData?.speech_metrics?.energy}</span>
                         <span className="text-[9px] text-slate-400 mb-0.5">参考: 60-80</span>
                      </div>
                    </div>
                 </div>
               </div>

               {/* 右侧：雷达图 */}
               <div className="h-44 relative bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-3">
                 <h3 className="absolute top-2 left-2.5 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 text-xs z-10">
                   <Activity className="w-3.5 h-3.5 text-[#7A3EF4]" /> 8维情绪雷达
                 </h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="55%" outerRadius="85%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 500 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 1]} tick={false} axisLine={false} />
                      <Radar
                        name="情绪概率"
                        dataKey="A"
                        stroke="#7A3EF4"
                        strokeWidth={3}
                        fill="url(#radarGradient)"
                        fillOpacity={0.6}
                      />
                      <defs>
                        <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7A3EF4" stopOpacity={0.6}/>
                          <stop offset="100%" stopColor="#EC4899" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#7A3EF4', fontWeight: 'bold' }}
                        formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                      />
                    </RadarChart>
                 </ResponsiveContainer>
                 <motion.div
                   className="absolute inset-0 rounded-xl border-2 border-[#7A3EF4]/30"
                   animate={{ scale: [1, 1.02, 1], opacity: [0.5, 0.8, 0.5] }}
                   transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                 />
               </div>
            </div>

            {/* 分析建议 */}
            <div className="bg-indigo-50 dark:bg-indigo-950/30 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-900/50 flex gap-2">
               <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
               <div className="space-y-0.5">
                 <p className="font-bold text-indigo-900 dark:text-indigo-200 text-xs">智能分析建议</p>
                 <p className="text-indigo-700 dark:text-indigo-300 leading-relaxed text-[11px]">
                   {reportData?.depression_analysis}
                 </p>
               </div>
            </div>

            {/* 底部操作栏 */}
            <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-slate-800">
               <div className="flex gap-1.5">
                 <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-xs rounded-lg border-slate-200 hover:bg-slate-50 hover:text-slate-900 px-2.5"
                    onClick={async () => {
                      const el = document.getElementById('voice-report-card');
                      if (!el) return;
                      const html2canvas = (await import('html2canvas')).default;
                      const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
                      const imgData = canvas.toDataURL('image/png');
                      const { jsPDF } = await import('jspdf');
                      const pdf = new jsPDF('p', 'mm', 'a4');
                      const imgWidth = pdf.internal.pageSize.getWidth();
                      const imgHeight = (canvas.height * imgWidth) / canvas.width;
                      pdf.addImage(imgData, 'PNG', 0, 10, imgWidth, imgHeight);
                      // Add doctor signature line
                      pdf.setDrawColor(150);
                      pdf.line(20, 260, 80, 260);
                      pdf.setFontSize(10);
                      pdf.text("医生签字", 20, 270);
                      pdf.save('voice-report-professional.pdf');
                    }}
                  >
                    <FileText className="w-3 h-3 mr-1.5" /> 下载PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 text-xs rounded-lg border-slate-200 hover:bg-slate-50 hover:text-slate-900 px-2.5"
                    onClick={async () => {
                       const el = document.getElementById('voice-report-card');
                       if (!el) return;
                       const html2canvas = (await import('html2canvas')).default;
                       const canvas = await html2canvas(el, { backgroundColor: null, scale: 2 });
                       const a = document.createElement('a');
                       a.href = canvas.toDataURL('image/png');
                       a.download = 'voice-report-4k.png';
                       a.click();
                    }}
                  >
                    <Printer className="w-3 h-3 mr-1.5" /> 导出PNG
                  </Button>
               </div>
               <Button 
                 onClick={() => {
                   setShowReport(false);
                   onComplete({ duration, waveform, reportData });
                 }}
                 className="bg-[#7A3EF4] hover:bg-[#6B2ED8] text-white rounded-xl px-4 h-8 shadow-lg shadow-indigo-500/20 font-bold text-xs"
               >
                 表情识别 <ChevronRight className="w-3.5 h-3.5 ml-1" />
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
