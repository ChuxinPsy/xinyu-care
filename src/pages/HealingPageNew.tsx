import { 
  Bookmark, Moon, Gamepad2,
  Music, Pause, PenLine, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2,
  Sparkles, Cloud, Zap, Trophy, Target, Clock, TrendingUp, Star, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import GameTab from '@/components/healing/GameTab';
import DiaryTab from '@/components/healing/DiaryTab';
import KnowledgeTab from '@/components/healing/KnowledgeTab';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { 
  createMeditationSession,
  getMeditationStats,
} from '@/db/api';

type LoopMode = 'one' | 'all' | 'shuffle';

const MEDITATION_CATEGORIES = [
  { id: 'all', label: '全部', icon: Sparkles, color: 'from-violet-400 to-purple-500' },
  { id: 'relax', label: '放松', icon: Cloud, color: 'from-sky-400 to-blue-500' },
  { id: 'sleep', label: '睡眠', icon: Moon, color: 'from-indigo-400 to-violet-500' },
  { id: 'focus', label: '专注', icon: Zap, color: 'from-amber-400 to-orange-500' },
];

const CONTENT_GRADIENTS = [
  'from-emerald-400 via-teal-400 to-cyan-400',
  'from-violet-400 via-purple-400 to-pink-400',
  'from-blue-400 via-indigo-400 to-violet-400',
  'from-rose-400 via-pink-400 to-fuchsia-400',
  'from-amber-400 via-orange-400 to-rose-400',
];

// 动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 }
  }
};

// scaleVariants 用于组件动画

// 音乐文件元数据配置（与 public/srcs/music 目录下的实际文件对应）
const rawMusicFiles: Array<{
  fileName: string;
  category: 'relax' | 'sleep' | 'focus';
  description: string;
  coverImage: string;
}> = [
  {
    fileName: '焦虑缓解呼吸法.mp3',
    category: 'relax',
    description: '通过深呼吸练习，平复焦虑情绪，找回内心平静',
    coverImage: 'https://api.dicebear.com/7.x/notionists/svg?seed=anxiety-relief&backgroundColor=b6e3f4'
  },
  {
    fileName: '睡前放松引导.mp3',
    category: 'sleep',
    description: '温柔的引导语音，帮助身心放松，自然进入梦乡',
    coverImage: 'https://api.dicebear.com/7.x/notionists/svg?seed=sleep-guide&backgroundColor=c0aede'
  },
  {
    fileName: '身体扫描冥想.mp3',
    category: 'relax',
    description: '逐步扫描全身感受，释放紧张与压力',
    coverImage: 'https://api.dicebear.com/7.x/notionists/svg?seed=body-scan&backgroundColor=d1d4f9'
  },
  {
    fileName: '专注力训练.mp3',
    category: 'focus',
    description: '训练大脑专注力，提升工作与学习效率',
    coverImage: 'https://api.dicebear.com/7.x/notionists/svg?seed=focus-training&backgroundColor=ffd5dc'
  },
  {
    fileName: '抑郁症康复之路.mp3',
    category: 'focus',
    description: '科学引导，帮助走出低谷，重建积极心态',
    coverImage: 'https://api.dicebear.com/7.x/notionists/svg?seed=recovery-path&backgroundColor=ffdfbf'
  },
];

// public/ 资源需要跟随 Vite base，否则部署在 /xinyucare/ 子路径时会请求到域名根目录。
const PUBLIC_BASE_URL = import.meta.env.BASE_URL || '/';
const MUSIC_BASE_URL = `${PUBLIC_BASE_URL.replace(/\/?$/, '/')}srcs/music`;

const meditationTracks = rawMusicFiles
  .map(({ fileName, category, description, coverImage }) => {
    const nameWithoutExt = fileName.replace(/\.(mp3|ogg|wav|m4a)$/i, '');
    const [title, artist] = nameWithoutExt.split(' - ');
    const url = `${MUSIC_BASE_URL}/${encodeURIComponent(fileName)}`;
    const contentIdByTitle: Record<string, string> = {
      '焦虑缓解呼吸法': 'dddd4444-4444-4444-4444-444444444444',
      '睡前放松引导': 'eeee5555-5555-5555-5555-555555555555',
      '身体扫描冥想': 'ffff6666-6666-6666-6666-666666666666',
      '专注力训练': '9999aaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '抑郁症康复之路': '77778888-8888-8888-8888-888888888888',
    };
    const resolvedTitle = (title || nameWithoutExt).trim();
    return {
      id: fileName,
      contentId: contentIdByTitle[resolvedTitle],
      url,
      title: resolvedTitle,
      artist: (artist || '').trim(),
      fileName,
      category,
      description,
      coverImage,
    };
  });
  // 注意：不要对数组进行排序，以保持与 HomePage.tsx 中 trackIndex 的对应关系

export default function HealingPageNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('meditation');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [trackIndex, setTrackIndex] = useState(0);
  const [loopMode, setLoopMode] = useState<LoopMode>('all');
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [meditationStats, setMeditationStats] = useState({ totalMinutes: 128, totalSessions: 12, averageRating: 0 });
  const [moodDialogOpen, setMoodDialogOpen] = useState(false);
  const [moodAfter, setMoodAfter] = useState('');
  const [completedSession, setCompletedSession] = useState<{
    contentId: string;
    title: string;
    duration: number;
  } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const loopModeRef = useRef<LoopMode>('all');
  const trackIndexRef = useRef(0);
  const wantPlayRef = useRef(false);
  const playLockRef = useRef(false);
  const lastActionAtRef = useRef(0);

  // 冥想Tab直接使用本地 meditationTracks，无需远程加载
  const loadData = useCallback(async () => {
    // 此函数保留供 ContentDetailDialog onUpdate 回调使用
  }, []);

  const loadMeditationStats = useCallback(async () => {
    if (!user) return;
    try {
      const stats = await getMeditationStats(user.id);
      setMeditationStats({
        totalMinutes: (stats as any).totalMinutes ?? 0,
        totalSessions: (stats as any).totalSessions ?? 0,
        averageRating: (stats as any).averageRating ?? 0,
      });
    } catch (error) {
      setMeditationStats({
        totalMinutes: 0,
        totalSessions: 0,
        averageRating: 0,
      });
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [activeCategory, loadData]);

  // 处理从其他页面传入的 tab 状态和音乐索引
  useEffect(() => {
    const state = location.state as { activeTab?: string; trackIndex?: number; activeCategory?: string } | null;
    let shouldClearState = false;

    if (state?.activeTab) {
      setActiveTab(state.activeTab);
      shouldClearState = true;
    }
    if (state?.activeCategory) {
      setActiveCategory(state.activeCategory);
      shouldClearState = true;
    }
    if (state?.trackIndex !== undefined && meditationTracks.length > 0) {
      setTrackIndex(state.trackIndex);
      // 自动播放
      wantPlayRef.current = true;
      shouldClearState = true;
    }
    // 清除 state 避免刷新后仍生效，但只在有有效数据时执行一次
    if (shouldClearState) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user) {
      loadMeditationStats();
    }
  }, [user, loadMeditationStats]);

  useEffect(() => {
    loopModeRef.current = loopMode;
  }, [loopMode]);

  useEffect(() => {
    trackIndexRef.current = trackIndex;
  }, [trackIndex]);

  useEffect(() => {
    if (activeTab !== 'meditation') return;
    // 不显示错误提示
    setPlayError(null);
  }, [activeTab]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (meditationTracks.length === 0) return;
    const current = meditationTracks[trackIndex];
    
    // 直接加载音频，不预先检查文件是否存在
    const loadAudio = () => {
      audio.preload = 'auto';
      audio.src = current.url;
      audio.volume = muted ? 0 : volume;
      audio.load();
      
      // 音频可以播放时自动播放
      const handleCanPlay = () => {
        if (wantPlayRef.current) {
          audio.play().catch(() => {});
        }
        audio.removeEventListener('canplay', handleCanPlay);
      };
      audio.addEventListener('canplay', handleCanPlay);
      
      // 预加载下一首
      const nextIndex = (trackIndex + 1) % meditationTracks.length;
      const preloader = new Audio();
      preloader.preload = 'auto';
      preloader.src = meditationTracks[nextIndex].url;
      preloader.load();
      preloadRef.current = preloader;
    };
    
    loadAudio();

    return () => {
      preloadRef.current = null;
    };
  }, [trackIndex, muted, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      setTotalTime(Math.floor(duration));
    };
    const onTimeUpdate = () => {
      setCurrentTime(Math.floor(audio.currentTime || 0));
    };
    const onPlay = () => {
      wantPlayRef.current = true;
      setIsPlaying(true);
    };
    const onPause = () => {
      wantPlayRef.current = false;
      setIsPlaying(false);
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onEnded = () => {
      setBuffering(false);
      if (meditationTracks.length === 0) return;
      const current = meditationTracks[trackIndexRef.current];
      if (!current?.contentId) {
        console.warn(`冥想内容缺少 contentId 映射: ${current?.title || 'unknown'}`);
        wantPlayRef.current = false;
        setIsPlaying(false);
        return;
      }
      const completedDuration = Math.max(
        Math.floor(Number.isFinite(audio.duration) ? audio.duration : 0),
        Math.floor(audio.currentTime || 0),
        totalTime || 0
      );
      wantPlayRef.current = false;
      setIsPlaying(false);
      setCurrentTime(completedDuration);
      setCompletedSession({
        contentId: current.contentId,
        title: current.title,
        duration: completedDuration,
      });
      setMoodDialogOpen(true);
    };
    const onError = () => {
      const current = meditationTracks[trackIndexRef.current];
      setBuffering(false);
      setIsPlaying(false);
      // 静默处理错误，不显示提示
      console.log(`音乐加载失败：${current?.fileName || '未知文件'}`);
      // 自动切换到下一首
      if (meditationTracks.length > 1) {
        setTrackIndex((prev) => (prev + 1) % meditationTracks.length);
      }
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    };
  }, []);

  // 根据当前分类筛选本地音乐列表
  const filteredTracks = useMemo(() => {
    if (activeCategory === 'all') return meditationTracks;
    return meditationTracks.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  const togglePlay = async () => {
    if (meditationTracks.length === 0) {
      toast.error('未找到冥想音乐文件');
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    const now = Date.now();
    if (playLockRef.current || now - lastActionAtRef.current < 200) {
      return;
    }
    lastActionAtRef.current = now;
    setPlayError(null);
    try {
      if (audio.paused) {
        wantPlayRef.current = true;
        try {
          await audio.play();
        } catch (err: any) {
          if (String(err?.name) === 'AbortError') {
            // 被外部 pause 打断，忽略
            return;
          }
          throw err;
        }
      } else {
        wantPlayRef.current = false;
        audio.pause();
      }
    } catch (error) {
      console.error('播放失败:', error);
      setPlayError('播放被浏览器阻止或音频不可用');
      toast.error('播放失败，请再次点击播放');
    }
  };

  const playPrev = () => {
    if (meditationTracks.length === 0) return;
    setPlayError(null);
    setTrackIndex((prev) => (prev - 1 + meditationTracks.length) % meditationTracks.length);
  };

  const playNext = () => {
    if (meditationTracks.length === 0) return;
    setPlayError(null);
    if (loopModeRef.current === 'shuffle' && meditationTracks.length > 1) {
      const current = trackIndexRef.current;
      let candidate = current;
      while (candidate === current) {
        candidate = Math.floor(Math.random() * meditationTracks.length);
      }
      setTrackIndex(candidate);
      return;
    }
    setTrackIndex((prev) => (prev + 1) % meditationTracks.length);
  };

  const cycleLoopMode = () => {
    setLoopMode((prev) => (prev === 'all' ? 'one' : prev === 'one' ? 'shuffle' : 'all'));
  };

  const loopIcon = useMemo(() => {
    if (loopMode === 'one') return Repeat1;
    if (loopMode === 'shuffle') return Shuffle;
    return Repeat;
  }, [loopMode]);

  const progressValue = useMemo(() => {
    if (!totalTime) return 0;
    return Math.min(100, Math.max(0, (currentTime / totalTime) * 100));
  }, [currentTime, totalTime]);

  const currentTrackLabel = useMemo(() => {
    const track = meditationTracks[trackIndex];
    if (!track) return '';
    return track.artist ? `${track.title} · ${track.artist}` : track.title;
  }, [trackIndex]);

  const handleMeditationComplete = () => {
    const audio = audioRef.current;
    if (audio) audio.pause();
    const currentTrack = meditationTracks[trackIndex];
    if (!currentTrack?.contentId) {
      toast.error('当前冥想内容缺少保存映射');
      return;
    }
    setCompletedSession({
      contentId: currentTrack.contentId,
      title: currentTrack.title,
      duration: Math.max(currentTime, totalTime ? Math.min(currentTime, totalTime) : currentTime),
    });
    setMoodDialogOpen(true);
  };

  const handleSaveMood = async () => {
    if (!user || !completedSession) return;
    try {
      await createMeditationSession({
        user_id: user.id,
        content_id: completedSession.contentId,
        duration: Math.max(1, completedSession.duration),
        completed: true,
        mood_after: moodAfter,
      });
      toast.success('冥想记录已保存');
      setMoodDialogOpen(false);
      setMoodAfter('');
      setCompletedSession(null);
      setCurrentTime(0);
      await loadMeditationStats();
    } catch (error) {
      console.error('保存失败:', error);
      toast.error('保存失败');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/20">
      {/* 音频元素始终挂载，确保 audioRef 在所有 useEffect 中可用 */}
      <audio ref={(el) => { audioRef.current = el; }} preload="auto" className="hidden" />
      <div className="max-w-2xl md:max-w-6xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
       
        {/* 导航系统 - 冥想、树洞、日记、知识 */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-4 gap-2 md:gap-3"
        >
          {[
            { id: 'meditation', label: '冥想', icon: Music, colors: 'from-indigo-500 via-purple-500 to-pink-500' },
            { id: 'game', label: '游戏', icon: Gamepad2, colors: 'from-blue-500 via-cyan-500 to-teal-500' },
            { id: 'diary', label: '日记', icon: PenLine, colors: 'from-rose-500 via-pink-500 to-fuchsia-500' },
            { id: 'knowledge', label: '知识', icon: Bookmark, colors: 'from-emerald-500 via-teal-500 to-cyan-500' },
          ].map((tab) => (
            <motion.div key={tab.id} variants={itemVariants}>
              <Button
                onClick={() => setActiveTab(tab.id)}
                className={`relative overflow-hidden rounded-2xl py-5 md:py-6 text-sm md:text-base font-medium transition-all duration-300 w-full ${
                  activeTab === tab.id
                    ? 'text-white shadow-lg'
                    : 'bg-white/80 dark:bg-slate-800/80 text-muted-foreground hover:text-foreground backdrop-blur-sm'
                } active:scale-95`}
                style={{
                  boxShadow: activeTab === tab.id ? `0 8px 30px -10px rgba(99, 102, 241, 0.5)` : undefined
                }}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTabBg"
                    className={`absolute inset-0 bg-gradient-to-r ${tab.colors}`}
                    initial={false}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center gap-1.5">
                  <tab.icon className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label}</span>
                </span>
              </Button>
            </motion.div>
          ))}
        </motion.div>

        {/* 冥想Tab内容 */}
        <AnimatePresence mode="wait">
          {activeTab === 'meditation' && (
            <motion.div
              key="meditation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="md:grid md:grid-cols-2 md:gap-6 md:items-start space-y-6 md:space-y-0"
            >
              {/* 左列：主播放器 */}
              <div className="md:sticky md:top-6">
              {/* 主播放器 - 全新设计 */}
              <Card className="relative overflow-hidden border-0 shadow-2xl shadow-indigo-900/30">
                {/* 动态背景渐变 - 深邃星空蓝紫 */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/50 via-transparent to-transparent" />
                
                {/* 星星装饰 */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full animate-pulse" />
                  <div className="absolute top-20 right-20 w-0.5 h-0.5 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                  <div className="absolute top-32 left-1/4 w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
                  <div className="absolute bottom-20 right-10 w-0.5 h-0.5 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
                  <div className="absolute bottom-32 left-20 w-1 h-1 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                  <div className="absolute top-1/2 right-1/3 w-0.5 h-0.5 bg-white/90 rounded-full animate-pulse" style={{ animationDelay: '0.8s' }} />
                </div>
                
                {/* 装饰光晕 - 星云效果 */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
                
                <CardContent className="relative p-6 md:p-10">
                  {/* 状态标签 */}
                  <motion.div 
                    className="flex justify-center mb-4 md:mb-6"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Badge className={`px-4 py-1.5 text-xs md:text-sm font-medium border-0 ${
                      isPlaying 
                        ? 'bg-indigo-500/30 text-indigo-100 backdrop-blur-md shadow-lg shadow-indigo-500/20' 
                        : 'bg-indigo-500/20 text-indigo-200/80 backdrop-blur-sm'
                    }`}>
                      <span className="flex items-center gap-1.5">
                        {isPlaying && (
                          <span className="flex gap-0.5">
                            <span className="w-1 h-3 bg-indigo-300 rounded-full animate-[bounce_1s_infinite]" />
                            <span className="w-1 h-3 bg-purple-300 rounded-full animate-[bounce_1s_infinite_0.1s]" />
                            <span className="w-1 h-3 bg-pink-300 rounded-full animate-[bounce_1s_infinite_0.2s]" />
                          </span>
                        )}
                        {isPlaying ? '正在播放' : '已暂停'}
                      </span>
                    </Badge>
                  </motion.div>

                  {/* 标题区域 */}
                  <motion.div 
                    className="text-center mb-6 md:mb-8"
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-2 tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                      {meditationTracks[trackIndex]?.title || '冥想音乐'}
                    </h2>
                    <p className="text-indigo-200/80 text-sm md:text-base">
                      {meditationTracks[trackIndex]?.description || '让音乐带你进入冥想状态'}
                    </p>
                    {currentTrackLabel && (
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-purple-300/70 text-xs mt-2 font-medium"
                      >
                        ♪ {currentTrackLabel}
                      </motion.p>
                    )}
                  </motion.div>

                  {/* 呼吸动画圆形 - 星空版 */}
                  <motion.div 
                    className="flex justify-center mb-8 md:mb-10"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: 'spring' }}
                  >
                    <div className="relative w-32 h-32 md:w-40 md:h-40">
                      {/* 外层波纹 - 星空紫 */}
                      <motion.div 
                        className="absolute inset-0 rounded-full border-2 border-indigo-400/30"
                        animate={isPlaying ? {
                          scale: [1, 1.2, 1],
                          opacity: [0.5, 0.2, 0.5],
                        } : {}}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      />
                      <motion.div 
                        className="absolute inset-2 rounded-full border-2 border-purple-400/40"
                        animate={isPlaying ? {
                          scale: [1, 1.15, 1],
                          opacity: [0.6, 0.3, 0.6],
                        } : {}}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                      />
                      <motion.div 
                        className="absolute inset-4 rounded-full border-2 border-pink-400/30"
                        animate={isPlaying ? {
                          scale: [1, 1.1, 1],
                          opacity: [0.7, 0.4, 0.7],
                        } : {}}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                      />
                      {/* 中心圆 - 深空效果 */}
                      <motion.div 
                        className="absolute inset-6 md:inset-8 rounded-full bg-gradient-to-br from-indigo-500/80 to-purple-600/80 backdrop-blur-md shadow-2xl flex items-center justify-center border border-indigo-400/50"
                        animate={isPlaying ? {
                          boxShadow: [
                            '0 0 30px rgba(99, 102, 241, 0.5)',
                            '0 0 60px rgba(99, 102, 241, 0.7)',
                            '0 0 30px rgba(99, 102, 241, 0.5)',
                          ]
                        } : {}}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Music className="w-8 h-8 md:w-10 md:h-10 text-white" />
                      </motion.div>
                    </div>
                  </motion.div>

                  {/* 进度条 - 星空版 */}
                  <motion.div 
                    className="mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="flex items-center justify-between text-xs text-indigo-200/60 mb-2 font-medium">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(totalTime || 0)}</span>
                    </div>
                    <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 rounded-full"
                        style={{ width: `${progressValue}%` }}
                        layoutId="progress"
                      />
                      {/* 进度条星光效果 */}
                      <div 
                        className="absolute inset-y-0 w-4 bg-indigo-400/60 blur-sm rounded-full"
                        style={{ left: `calc(${progressValue}% - 8px)` }}
                      />
                    </div>
                  </motion.div>

                  {/* 播放控制 - 星空版 */}
                  <motion.div 
                    className="flex items-center justify-center gap-4 md:gap-6"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6 }}
                  >
                    
                    {/* 上一首 */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={playPrev}
                      disabled={meditationTracks.length === 0}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 border border-white/20"
                    >
                      <SkipBack className="w-5 h-5 md:w-6 md:h-6" />
                    </motion.button>
                    
                    {/* 播放/暂停 - 主按钮 */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={togglePlay}
                      disabled={meditationTracks.length === 0}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40 hover:shadow-indigo-500/60 transition-all disabled:opacity-50 border border-indigo-400/50"
                    >
                      {buffering ? (
                        <span className="w-6 h-6 md:w-8 md:h-8 rounded-full border-3 border-indigo-300 border-t-white animate-spin" />
                      ) : isPlaying ? (
                        <Pause className="w-7 h-7 md:w-9 md:h-9 text-white" fill="currentColor" />
                      ) : (
                        <Play className="w-7 h-7 md:w-9 md:h-9 text-white ml-1" fill="currentColor" />
                      )}
                    </motion.button>
                    
                    {/* 下一首 */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={playNext}
                      disabled={meditationTracks.length === 0}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-all disabled:opacity-30 border border-white/20"
                    >
                      <SkipForward className="w-5 h-5 md:w-6 md:h-6" />
                    </motion.button>
                  </motion.div>


                </CardContent>
              </Card>

              {/* 冥想统计卡片 - 仅桌面端显示 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="hidden md:grid mt-6 grid-cols-3 gap-3"
              >
                <Card className="border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{meditationStats.totalMinutes}</p>
                    <p className="text-xs text-muted-foreground">冥想分钟</p>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{meditationStats.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">完成次数</p>
                  </CardContent>
                </Card>
                <Card className="border shadow-sm">
                  <CardContent className="p-4 text-center">
                    <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <Flame className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-2xl font-bold text-foreground">{Math.min(7, meditationStats.totalSessions)}</p>
                    <p className="text-xs text-muted-foreground">连续天数</p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 本周目标进度 - 仅桌面端显示 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="hidden md:block mt-4"
              >
                <Card className="border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-foreground">本周目标</span>
                      </div>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {Math.min(100, Math.round((meditationStats.totalSessions / 7) * 100))}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">已完成 {meditationStats.totalSessions} 次</span>
                        <span className="text-muted-foreground">目标 7 次</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (meditationStats.totalSessions / 7) * 100)}%` }}
                          transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Star className="w-3 h-3 text-amber-500" fill="currentColor" />
                      <span>坚持冥想有助于改善睡眠质量和情绪管理</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 推荐冥想 - 仅桌面端显示 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="hidden md:block mt-4"
              >
                <Card className="border shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-foreground">为你推荐</span>
                    </div>
                    <div className="space-y-3">
                      {meditationTracks.slice(0, 2).map((track, index) => (
                        <motion.div
                          key={track.id}
                          whileHover={{ x: 4 }}
                          className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                          onClick={() => {
                            const globalIndex = meditationTracks.findIndex((t) => t.id === track.id);
                            if (globalIndex !== -1) setTrackIndex(globalIndex);
                          }}
                        >
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={track.coverImage} alt={track.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <Play className="w-5 h-5 text-white" fill="white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{track.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{track.description}</p>
                          </div>
                          <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{index + 1}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              </div>{/* 结束左列 */}

              {/* 右列：冥想库 */}
              <div>
            {/* 冥想库 - 重新设计 */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-4 md:space-y-5"
            >
              {/* 标题区域 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <Music className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-foreground">冥想库</h3>
                    <p className="text-xs md:text-sm text-muted-foreground">探索内心的宁静</p>
                  </div>
                </div>
              </div>

              {/* 分类标签 - 新设计 */}
              <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {MEDITATION_CATEGORIES.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <motion.button
                      key={cat.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2.5 md:py-3 rounded-xl text-sm md:text-base font-medium whitespace-nowrap transition-all ${
                        activeCategory === cat.id
                          ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                          : 'bg-white dark:bg-slate-800 text-muted-foreground hover:text-foreground shadow-sm border border-border/50'
                      }`}
                    >
                      <CatIcon className="w-4 h-4 md:w-5 md:h-5" />
                      {cat.label}
                    </motion.button>
                  );
                })}
              </div>

              {/* 内容列表 - 新设计 */}
              <div className="space-y-3">
                {filteredTracks.map((track, index) => {
                  const gradient = CONTENT_GRADIENTS[index % CONTENT_GRADIENTS.length];
                  const globalIndex = meditationTracks.findIndex((t) => t.id === track.id);
                  const isActive = trackIndex === globalIndex;
                  
                  // 分类显示名称
                  const categoryLabels: Record<string, string> = { relax: '放松', sleep: '睡眠', focus: '专注' };

                  return (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      whileHover={{ x: 4 }}
                    >
                      <Card
                        onClick={() => {
                          // 点击卡片切换到该曲目
                          if (globalIndex !== -1) setTrackIndex(globalIndex);
                        }}
                        className={`cursor-pointer transition-all duration-300 overflow-hidden ${
                          isActive
                            ? 'ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/20'
                            : 'hover:shadow-md border-border/50'
                        }`}
                      >
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* 封面图片 */}
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (globalIndex !== -1) {
                                  if (isActive) {
                                    togglePlay();
                                  } else {
                                    setTrackIndex(globalIndex);
                                    wantPlayRef.current = true;
                                  }
                                }
                              }}
                              className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg cursor-pointer flex-shrink-0"
                            >
                              <img
                                src={track.coverImage}
                                alt={track.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                              {/* 播放状态遮罩 */}
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                {isActive && isPlaying ? (
                                  <span className="flex gap-0.5">
                                    <span className="w-1 h-4 bg-white rounded-full animate-[bounce_1s_infinite]" />
                                    <span className="w-1 h-4 bg-white rounded-full animate-[bounce_1s_infinite_0.1s]" />
                                    <span className="w-1 h-4 bg-white rounded-full animate-[bounce_1s_infinite_0.2s]" />
                                  </span>
                                ) : (
                                  <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                                )}
                              </div>
                              {/* 当前播放指示器 */}
                              {isActive && (
                                <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                              )}
                            </motion.div>
                            
                            {/* 内容信息 */}
                            <div>
                              <h4 className="font-semibold text-foreground mb-0.5">{track.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="px-2 py-0.5 rounded-full bg-muted">{categoryLabels[track.category] ?? track.category}</span>
                                {track.artist && (
                                  <>
                                    <span>•</span>
                                    <span>{track.artist}</span>
                                  </>
                                )}
                              </div>
                              {track.description && (
                                <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{track.description}</p>
                              )}
                            </div>
                          </div>

                          {/* 当前播放指示 */}
                          <div className="flex items-center gap-1">
                            {isActive && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mr-1"
                              >
                                <Volume2 className="w-4 h-4 text-indigo-600 animate-pulse" />
                              </motion.div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
                {filteredTracks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    该分类暂无音乐
                  </div>
                )}
              </div>
            </motion.div>
            </div>{/* 结束右列 */}
          </motion.div>
        )}
        </AnimatePresence>

        {/* 游戏Tab内容 */}
        <AnimatePresence mode="wait">
          {activeTab === 'game' && (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <GameTab />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 日记Tab内容 */}
        <AnimatePresence mode="wait">
          {activeTab === 'diary' && (
            <motion.div
              key="diary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <DiaryTab />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 知识Tab内容 */}
        <AnimatePresence mode="wait">
          {activeTab === 'knowledge' && (
            <motion.div
              key="knowledge"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <KnowledgeTab />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 冥想完成对话框 */}
        <Dialog open={moodDialogOpen} onOpenChange={setMoodDialogOpen}>
          <DialogContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-0 shadow-2xl rounded-3xl">
            <DialogHeader className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                冥想完成
              </DialogTitle>
              <p className="text-muted-foreground mt-2">
                恭喜你完成了 {completedSession ? Math.max(1, Math.floor(completedSession.duration / 60)) : Math.floor(currentTime / 60)} 分钟的冥想练习
              </p>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {completedSession && (
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                  本次内容：{completedSession.title}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="moodAfter" className="text-foreground font-medium">现在的感受如何？</Label>
                <Textarea
                  id="moodAfter"
                  value={moodAfter}
                  onChange={(e) => setMoodAfter(e.target.value)}
                  placeholder="记录下此刻的心情..."
                  rows={3}
                  className="bg-slate-50 dark:bg-slate-800 border-0 rounded-xl focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setMoodDialogOpen(false);
                  setMoodAfter('');
                  setCompletedSession(null);
                }}
                className="flex-1 rounded-xl border-slate-200 hover:bg-slate-100 transition-all"
              >
                跳过
              </Button>
              <Button
                onClick={handleSaveMood}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 text-white shadow-lg shadow-indigo-500/25 transition-all"
              >
                保存记录
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
