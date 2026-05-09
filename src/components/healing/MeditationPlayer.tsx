import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Pause, Play, SkipBack, SkipForward, Volume2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface MeditationPlayerProps {
  content: {
    id: string;
    title: string;
    description?: string;
    content_url?: string;
    duration?: number;
    category: string;
  };
  onClose?: () => void;
}

export default function MeditationPlayer({ content, onClose }: MeditationPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(content.duration || 300);
  const [volume, setVolume] = useState(0.8);
  const [isLiked, setIsLiked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  // 呼吸动画效果 - 4-7-8呼吸法
  useEffect(() => {
    if (!isPlaying) return;
    
    const breathCycle = async () => {
      // 吸气 4秒
      setBreathPhase('inhale');
      await new Promise(r => setTimeout(r, 4000));
      
      // 屏息 7秒
      setBreathPhase('hold');
      await new Promise(r => setTimeout(r, 7000));
      
      // 呼气 8秒
      setBreathPhase('exhale');
      await new Promise(r => setTimeout(r, 8000));
    };
    
    breathCycle();
    const interval = setInterval(breathCycle, 19000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // 音频播放控制
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, currentTime - 15);
    }
  };

  const handleSkipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(duration, currentTime + 15);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const breathText = {
    inhale: '吸气...',
    hold: '屏息...',
    exhale: '呼气...'
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 z-50 flex flex-col"
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl"
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.3, 0.15]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-pink-500/10 blur-3xl"
        />
      </div>

      {/* 顶部导航 */}
      <div className="relative z-10 flex items-center justify-between p-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </Button>
        
        <Badge className="bg-white/10 text-white/80 border-white/20 backdrop-blur-md">
          {content.category || '冥想'}
        </Badge>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsLiked(!isLiked)}
          className="rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md"
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
        </Button>
      </div>

      {/* 主要内容 */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
        {/* 标题区域 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {content.title}
          </h1>
          <p className="text-white/60 text-sm">
            {content.description || '跟随呼吸，放松身心'}
          </p>
        </motion.div>

        {/* 呼吸动画圆圈 */}
        <div className="relative w-64 h-64 mb-12">
          {/* 外层光环 */}
          <motion.div 
            className="absolute inset-0 rounded-full border-2 border-indigo-400/30"
            animate={{
              scale: breathPhase === 'inhale' ? 1.3 : breathPhase === 'hold' ? 1.3 : 1,
              opacity: breathPhase === 'inhale' ? 0.8 : breathPhase === 'hold' ? 0.6 : 0.3,
            }}
            transition={{ duration: breathPhase === 'inhale' ? 4 : breathPhase === 'hold' ? 7 : 8, ease: "easeInOut" }}
          />
          
          {/* 中层光环 */}
          <motion.div 
            className="absolute inset-4 rounded-full border-2 border-purple-400/40"
            animate={{
              scale: breathPhase === 'inhale' ? 1.2 : breathPhase === 'hold' ? 1.2 : 1,
              opacity: breathPhase === 'inhale' ? 0.9 : breathPhase === 'hold' ? 0.7 : 0.4,
            }}
            transition={{ duration: breathPhase === 'inhale' ? 4 : breathPhase === 'hold' ? 7 : 8, ease: "easeInOut" }}
          />
          
          {/* 内层主体 */}
          <motion.div 
            className="absolute inset-8 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl"
            animate={{
              scale: breathPhase === 'inhale' ? 1.1 : breathPhase === 'hold' ? 1.1 : 1,
              boxShadow: breathPhase === 'inhale' 
                ? '0 0 80px rgba(99, 102, 241, 0.6)' 
                : breathPhase === 'hold' 
                  ? '0 0 60px rgba(168, 85, 247, 0.5)' 
                  : '0 0 40px rgba(236, 72, 153, 0.4)'
            }}
            transition={{ duration: breathPhase === 'inhale' ? 4 : breathPhase === 'hold' ? 7 : 8, ease: "easeInOut" }}
          >
            {/* 呼吸文字 */}
            <AnimatePresence mode="wait">
              <motion.p
                key={breathPhase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-white text-lg font-medium"
              >
                {breathText[breathPhase]}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </div>

        {/* 进度条 */}
        <div className="w-full max-w-md mb-8">
          <div className="flex justify-between text-sm text-white/60 mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
              style={{ width: `${progress}%` }}
              layoutId="progress"
            />
            {/* 进度条光晕效果 */}
            <motion.div
              className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="flex items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSkipBack}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-all"
          >
            <SkipBack className="w-5 h-5" />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={togglePlay}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" fill="currentColor" />
            ) : (
              <Play className="w-8 h-8 ml-1" fill="currentColor" />
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSkipForward}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-all"
          >
            <SkipForward className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* 底部音量控制 */}
      <div className="relative z-10 p-6">
        <div className="flex items-center gap-4 max-w-md mx-auto">
          <Volume2 className="w-5 h-5 text-white/60" />
          <Slider
            value={[volume * 100]}
            max={100}
            step={1}
            onValueChange={handleVolumeChange}
            className="flex-1 [&_[data-slot=slider-track]]:bg-white/10 [&_[data-slot=slider-range]]:bg-gradient-to-r [&_[data-slot=slider-range]]:from-indigo-500 [&_[data-slot=slider-range]]:to-pink-500 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:shadow-lg"
          />
        </div>
      </div>

      {/* 隐藏的音频元素 */}
      {content.content_url && (
        <audio ref={audioRef} src={content.content_url} />
      )}
    </motion.div>
  );
}
