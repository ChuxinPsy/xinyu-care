import { motion } from 'framer-motion';
import { 
  Camera, ChevronRight, Crown, 
  Edit, FileText, HelpCircle, ImageIcon, Loader2, LogOut, 
  Mail, MessageSquare, Phone, Ruler, Scale, Settings, ShieldCheck, Sparkles, Stethoscope, Upload, User, Watch
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import FusionReport from '@/components/assessment/FusionReport';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getProfile, useAuth } from '@/contexts/AuthContext';
import { getAssessments, getEmotionDiaries, updateProfile } from '@/db/api';
import { supabase } from '@/db/supabase';

// 预设头像选项
const PRESET_AVATARS = [
  { id: 'avatar1', emoji: '🧘', bg: 'bg-gradient-to-br from-rose-400 to-orange-300', label: '冥想' },
  { id: 'avatar2', emoji: '🌸', bg: 'bg-gradient-to-br from-pink-400 to-rose-300', label: '樱花' },
  { id: 'avatar3', emoji: '🌿', bg: 'bg-gradient-to-br from-emerald-400 to-teal-300', label: '绿叶' },
  { id: 'avatar4', emoji: '☀️', bg: 'bg-gradient-to-br from-amber-400 to-yellow-300', label: '阳光' },
  { id: 'avatar5', emoji: '🌊', bg: 'bg-gradient-to-br from-blue-400 to-cyan-300', label: '海浪' },
];

// 预设背景图片选项
const PRESET_BACKGROUNDS = [
  { id: 'bg1', gradient: 'from-blue-500 via-indigo-500 to-violet-600', label: '深海蓝', pattern: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)' },
  { id: 'bg2', gradient: 'from-emerald-400 via-teal-500 to-cyan-600', label: '森林绿', pattern: 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 40%)' },
  { id: 'bg3', gradient: 'from-rose-400 via-pink-500 to-purple-600', label: '晚霞粉', pattern: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 60%)' },
];

export default function ProfilePageRedesigned() {
  const { user, profile, signOut, refreshProfile, signInWithUsername } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  
  // 编辑对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('other');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [wechat, setWechat] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [saving, setSaving] = useState(false);
  
  // 头像和背景状态 - 默认使用海浪头像 (avatar5) 和晚霞粉背景 (bg3)
  const [selectedAvatar, setSelectedAvatar] = useState<string>('avatar5');
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<string>('bg3');
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState('profile');
  
  const [doctorDialogOpen, setDoctorDialogOpen] = useState(false);
  const [doctorUsername, setDoctorUsername] = useState('');
  const [doctorPassword, setDoctorPassword] = useState('');
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openReport') === '1') {
      setReportOpen(true);
    }
  }, [location.search]);
  
  // 健康数据
  const [emotionScore, setEmotionScore] = useState(75);
  const [consecutiveDays, setConsecutiveDays] = useState(15);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [diaryCount, setDiaryCount] = useState(0);

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      toast.success('ID已复制到剪贴板', { duration: 1000 });
    }
  };

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setGender((profile.gender as string) || 'other');
      setWechat(profile.wechat || '');
      setProfileEmail(profile.email || '');
      // 计算年龄
      if (profile.birth_date) {
        const today = new Date();
        const birth = new Date(profile.birth_date);
        let calcAge = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) calcAge--;
        setAge(calcAge.toString());
      } else {
        setAge('');
      }
      // 从bio中加载身高体重
      if (profile.bio) {
        try {
          const bioData = JSON.parse(profile.bio);
          setHeight(bioData.height ? bioData.height.toString() : '');
          setWeight(bioData.weight ? bioData.weight.toString() : '');
        } catch {
          // bio 不是JSON格式，忽略
          setHeight('');
          setWeight('');
        }
      } else {
        setHeight('');
        setWeight('');
      }
      // 加载保存的个性化设置
      if (profile.avatar_url) {
        // 检查是否是预设头像格式 (preset:avatar2)
        if (profile.avatar_url.startsWith('preset:')) {
          const presetId = profile.avatar_url.replace('preset:', '');
          setSelectedAvatar(presetId);
          setCustomAvatarUrl(null);
        } else {
          // 自定义上传的头像
          setCustomAvatarUrl(profile.avatar_url);
          setSelectedAvatar('avatar5'); // 保持默认值
        }
      } else {
        // 没有保存过头像，使用默认樱花头像
        setSelectedAvatar('avatar5');
        setCustomAvatarUrl(null);
      }
      
      if (profile.background_url) {
        // 检查是否是预设背景格式
        if (profile.background_url.startsWith('preset:')) {
          const presetBgId = profile.background_url.replace('preset:', '');
          setSelectedBackground(presetBgId);
          setCustomBackgroundUrl(null);
        } else {
          // 自定义上传的背景
          setCustomBackgroundUrl(profile.background_url);
        }
      } else if (profile.selected_background) {
        setSelectedBackground(profile.selected_background);
      }
    }
    loadHealthData();
  }, [profile, user]);

  const loadHealthData = async () => {
    if (!user) return;
    try {
      const [assessments, diaries] = await Promise.all([
        getAssessments(user.id, 100),
        getEmotionDiaries(user.id, 100),
      ]);
      setAssessmentCount(assessments.length);
      setDiaryCount(diaries.length);
      
      // 计算连续打卡天数
      if (diaries.length > 0) {
        const sortedDiaries = diaries.sort((a, b) => 
          new Date(b.diary_date).getTime() - new Date(a.diary_date).getTime()
        );
        let count = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < sortedDiaries.length; i++) {
          const diaryDate = new Date(sortedDiaries[i].diary_date);
          diaryDate.setHours(0, 0, 0, 0);
          const expectedDate = new Date(today);
          expectedDate.setDate(today.getDate() - count);
          
          if (diaryDate.getTime() === expectedDate.getTime()) {
            count++;
          } else {
            break;
          }
        }
        setConsecutiveDays(count);
      }
      
      // 计算情绪评分
      if (diaries.length > 0) {
        const recentDiaries = diaries.slice(0, 7);
        const scoreMap: Record<string, number> = { very_bad: 20, bad: 40, neutral: 60, good: 80, very_good: 100 };
        const avgScore = recentDiaries.reduce((sum, d) => sum + (scoreMap[d.emotion_level as string] || 60), 0) / recentDiaries.length;
        setEmotionScore(Math.round(avgScore));
      }
    } catch (error) {
      console.error('加载健康数据失败:', error);
    }
  };

  const handleLogout = async () => {
    if (!confirm('确定要退出登录吗?')) return;
    try {
      await signOut();
      navigate('/login');
      toast.success('已退出登录');
    } catch (error) {
      console.error('退出登录失败:', error);
      toast.error('退出登录失败');
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // ── 构建头像URL ──────────────────────────────────────────────
      const avatarUrlToSave = customAvatarUrl
        ? customAvatarUrl
        : `preset:${selectedAvatar}`;

      // ── 构建背景URL ──────────────────────────────────────────────
      const backgroundUrlToSave = customBackgroundUrl
        ? customBackgroundUrl
        : `preset:${selectedBackground}`;

      // ── 年龄 → birth_date ────────────────────────────────────────
      let birthDateToSave: string | null = null;
      if (age && !Number.isNaN(Number(age)) && Number(age) > 0) {
        const birthYear = new Date().getFullYear() - Number(age);
        birthDateToSave = `${birthYear}-01-01`;
      }

      // ── 身高体重写入 bio（JSON）───────────────────────────────────
      let bioData: Record<string, unknown> = {};
      try {
        if (profile?.bio) bioData = JSON.parse(profile.bio);
      } catch { /* ignore */ }
      if (height) { bioData.height = Number(height); } else { delete bioData.height; }
      if (weight) { bioData.weight = Number(weight); } else { delete bioData.weight; }
      const bioStr = Object.keys(bioData).length > 0 ? JSON.stringify(bioData) : null;

      // ── 一次性保存所有字段 ────────────────────────────────────────
      // 注意：必须带上 role，否则 RLS 的 WITH CHECK 校验会失败（视缺失字段为 null）
      const updates = {
        full_name: fullName || null,
        phone: phone || null,
        gender: gender || 'other',
        role: profile?.role ?? 'user',
        avatar_url: avatarUrlToSave,
        birth_date: birthDateToSave,
        wechat: wechat || null,
        email: profileEmail || null,
        bio: bioStr,
        background_url: backgroundUrlToSave,
        selected_background: selectedBackground || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateProfile(user.id, updates as any);

      await refreshProfile();
      setEditDialogOpen(false);
      toast.success('保存成功');
    } catch (error) {
      console.error('保存失败:', error);
      toast.error(`保存失败：${error instanceof Error ? error.message : '请重试'}`);
    } finally {
      setSaving(false);
    }
  };

  // 上传图片到 Supabase Storage
  const uploadImageToStorage = async (file: File, bucket: string, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const filePath = `${folder}/${user?.id}_${Date.now()}.${ext}`;
    
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, { upsert: false, cacheControl: '31536000' });
    
    if (error) throw error;
    
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  };

  // 处理头像上传
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 文件大小限制 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }
    
    setUploadingImage(true);
    try {
      const url = await uploadImageToStorage(file, 'diary-images', 'avatars');
      setCustomAvatarUrl(url);
      toast.success('头像已上传');
    } catch (err) {
      console.error('头像上传失败:', err);
      // 上传到 Storage 失败时降级为 base64（用于本地预览）
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCustomAvatarUrl(result);
        toast.warning('头像已加载（将在保存时上传）');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  // 处理背景上传
  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 文件大小限制 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片大小不能超过 5MB');
      return;
    }
    
    setUploadingImage(true);
    try {
      const url = await uploadImageToStorage(file, 'diary-images', 'backgrounds');
      setCustomBackgroundUrl(url);
      toast.success('背景已上传');
    } catch (err) {
      console.error('背景上传失败:', err);
      // 降级为 base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCustomBackgroundUrl(result);
        toast.warning('背景已加载（将在保存时上传）');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  // 获取当前背景样式
  const getCurrentBackground = () => {
    if (customBackgroundUrl) {
      return { backgroundImage: `url(${customBackgroundUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    const bg = PRESET_BACKGROUNDS.find(b => b.id === selectedBackground);
    if (bg) {
      return { 
        background: `linear-gradient(135deg, var(--tw-gradient-stops)), ${bg.pattern}`,
      };
    }
    return {};
  };

  // 获取当前头像显示
  const getCurrentAvatar = () => {
    if (customAvatarUrl) return customAvatarUrl;
    if (selectedAvatar) {
      const avatar = PRESET_AVATARS.find(a => a.id === selectedAvatar);
      if (avatar) return { emoji: avatar.emoji, bg: avatar.bg };
    }
    return null;
  };

  // 菜单项配置
  const menuSections = [
    {
      title: '功能',
      items: [
        { icon: Watch, label: '手环数据', value: '智能健康监测', color: 'text-violet-600', bgColor: 'bg-violet-50', onClick: () => navigate('/profile/smart-band') },
        { icon: Sparkles, label: '疗愈计划', value: '专属定制方案', color: 'text-indigo-600', bgColor: 'bg-indigo-50', onClick: () => navigate('/profile/healing-plan') },
        { icon: Stethoscope, label: '对接医生', value: '专业专家问诊', color: 'text-rose-600', bgColor: 'bg-rose-50', onClick: () => navigate('/profile/connect-doctor') },
        { icon: Crown, label: '会员订阅', value: '开通享特权', color: 'text-amber-600', bgColor: 'bg-amber-50', onClick: () => navigate('/profile/subscription') },
        { icon: ShieldCheck, label: '隐私安全', value: '账号安全加固', color: 'text-emerald-600', bgColor: 'bg-emerald-50', onClick: () => navigate('/profile/privacy') },
        { icon: HelpCircle, label: '关于我们', value: '版本v1.0',color: 'text-slate-600', bgColor: 'bg-slate-50', onClick: () => navigate('/profile/about') },
        {
          icon: Settings,
          label: profile?.role === 'doctor' || profile?.role === 'admin' ? '医生后台' : '医生后台登录',
          value: '',
          color: 'text-slate-600',
          bgColor: 'bg-slate-50',
          onClick: () => {
            if (profile?.role === 'doctor' || profile?.role === 'admin') {
              navigate('/doctor/dashboard');
            } else {
              setDoctorDialogOpen(true);
            }
          },
        },
      ],
    },
  ];

  const currentAvatar = getCurrentAvatar();
  const currentBg = PRESET_BACKGROUNDS.find(b => b.id === selectedBackground);

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-slate-950 md:pb-0 pb-24">
      {/* 紧凑美化后的顶部 Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative px-5 md:px-8 pt-8 md:pt-12 pb-16 md:pb-20 overflow-hidden ${!customBackgroundUrl && currentBg ? `bg-gradient-to-br ${currentBg.gradient}` : 'bg-primary'}`}
        style={getCurrentBackground()}
      >
        {/* 动态背景装饰 */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.15, 0.1]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 w-60 h-60 bg-white/10 rounded-full blur-3xl" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.05, 0.1, 0.05]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" 
          />
        </div>
        
        <div className="max-w-md md:max-w-4xl mx-auto relative z-10">
          {/* 用户信息卡片 - 按照图片样式重新排版 */}
          <div className="flex items-start gap-4 md:gap-6">
            {/* 左侧：头像 */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative flex-shrink-0"
            >
              <div className="absolute inset-0 bg-white/30 rounded-full blur-md scale-110" />
              <div className="relative">
                <Avatar className="w-16 h-16 md:w-20 md:h-20 border-[3px] border-white/80 shadow-xl bg-white">
                  {typeof currentAvatar === 'string' ? (
                    <AvatarImage src={currentAvatar} alt="头像" className="object-cover" />
                  ) : currentAvatar && typeof currentAvatar === 'object' ? (
                    <AvatarFallback className={`${currentAvatar.bg} text-2xl md:text-3xl`}>
                      {currentAvatar.emoji}
                    </AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-primary text-xl md:text-2xl font-black">
                      {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                {/* 在线状态指示器 */}
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 md:w-6 md:h-6 bg-emerald-500 border-[2px] border-white rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full" />
                </div>
              </div>
            </motion.div>
            
            {/* 中间：用户信息 */}
            <div className="flex-1 min-w-0 pt-1">
              {/* 用户名和认证徽章 */}
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-bold text-white truncate drop-shadow-sm">
                  {profile?.username || '心域用户'}
                </h2>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-none text-[10px] px-2 py-0">
                    已认证
                  </Badge>
                </motion.div>
              </div>
              
              {/* ID和复制按钮 */}
              <div className="flex items-center gap-2 mt-2">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-white/20 backdrop-blur-sm rounded px-2 py-0.5 flex items-center gap-1.5 cursor-pointer hover:bg-white/30 transition-all"
                  onClick={handleCopyId}
                >
                  <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">ID</span>
                  <span className="text-[10px] font-mono text-white/90">
                    {user?.id ? `${user.id.slice(0, 4)}****${user.id.slice(-4)}` : '未登录'}
                  </span>
                  <span className="text-[9px] text-white/60 ml-1">复制</span>
                </motion.div>
              </div>
            </div>
            
            {/* 右侧：编辑按钮 - 向下移动并左移两格 */}
            <div className="flex-shrink-0 pt-6 mr-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditDialogOpen(true)}
                  className="text-white/90 hover:text-white hover:bg-white/20 w-9 h-9 rounded-lg backdrop-blur-sm border border-white/20"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-md md:max-w-4xl mx-auto px-4 md:px-6 -mt-8 relative z-20 space-y-3 md:space-y-4">
        {/* 重新设计的健康报告卡片 - 玻璃透明效果 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl md:rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden group cursor-pointer bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-slate-700/50"
          onClick={() => {
            if (reportLoading) return;
            setReportLoading(true);
            setTimeout(() => {
              setReportOpen(true);
              setReportLoading(false);
            }, 3000);
          }}
        >
          {/* 背景装饰光晕 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br from-indigo-400/20 to-purple-400/20 blur-3xl group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-gradient-to-br from-teal-400/20 to-emerald-400/20 blur-2xl group-hover:scale-110 transition-transform duration-700" />
          </div>

          {/* 加载进度条 */}
          {reportLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-x-0 bottom-0 h-1 bg-slate-200/50"
            >
              <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
              />
            </motion.div>
          )}

          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3.5 md:gap-4">
              {/* 图标容器 */}
              <motion.div 
                whileHover={{ rotate: 5, scale: 1.05 }}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shadow-lg ${
                  reportLoading 
                    ? 'bg-gradient-to-br from-indigo-400 to-purple-500' 
                    : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                }`}
              >
                {reportLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-6 h-6 md:w-7 md:h-7 text-white" />
                  </motion.div>
                ) : (
                  <FileText className="w-6 h-6 md:w-7 md:h-7 text-white" />
                )}
              </motion.div>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 dark:text-slate-100 font-bold text-base md:text-lg">
                    {reportLoading ? '生成报告中...' : '查看健康报告'}
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-1">
                  {reportLoading ? 'AI正在分析您的健康数据' : '多模态评估结果与康复建议'}
                </p>
              </div>
            </div>


          </div>
        </motion.div>

        

        {/* 菜单列表（仅显示功能项，无分组标题） */}
        {menuSections.map((section) => (
          <Card key={section.title} className="border-0 shadow-sm rounded-2xl md:rounded-3xl overflow-hidden bg-white dark:bg-slate-900">
            <CardContent className="p-0">
              {section.items.map((item, index) => (
                <div
                  key={item.label}
                  onClick={item.onClick}
                  className={`flex items-center gap-4 md:gap-5 p-5 md:p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    index !== section.items.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''
                  }`}
                >
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-xl ${item.bgColor} dark:bg-slate-800 flex items-center justify-center flex-shrink-0`}>
                    <item.icon className={`w-4 h-4 md:w-5 md:h-5 ${item.color} dark:text-slate-300`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm md:text-base font-bold text-slate-700 dark:text-slate-200">
                      {item.label}
                    </div>
                    {item.value && (
                      <div className="text-[10px] md:text-xs text-slate-400 font-medium mt-0.5">
                        {item.value}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 md:w-5 md:h-5 text-slate-300 flex-shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* 退出登录 */}
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full h-14 md:h-16 rounded-[32px] text-rose-500 font-bold hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-all md:text-base"
        >
          <LogOut className="w-5 h-5 md:w-6 md:h-6 mr-2" />
          退出当前账号
        </Button>

        {/* 版本信息 */}
        <div className="text-center space-y-1 py-4">
          <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em]">
            心域智护 v1.0.0
          </p>
          <p className="text-[9px] text-slate-200 dark:text-slate-800">
            © 2026 心域智护数字化医疗团队
          </p>
        </div>
      </div>

      {/* 增强的编辑资料对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              编辑个人资料
            </DialogTitle>
            <DialogDescription>
              自定义您的头像、背景和基本信息
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeEditTab} onValueChange={setActiveEditTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3 p-1 bg-slate-100 rounded-xl">
              <TabsTrigger value="profile" className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <User className="w-3.5 h-3.5 mr-1.5" />
                基本信息
              </TabsTrigger>
              <TabsTrigger value="avatar" className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                头像设置
              </TabsTrigger>
              <TabsTrigger value="background" className="rounded-lg text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
                背景主题
              </TabsTrigger>
            </TabsList>

            {/* 头像设置 Tab */}
            <TabsContent value="avatar" className="space-y-4 mt-4">
              <div className="text-center py-4">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative inline-block"
                >
                  <Avatar className="w-24 h-24 border-4 border-white shadow-xl mx-auto">
                    {typeof currentAvatar === 'string' ? (
                      <AvatarImage src={currentAvatar} alt="头像" />
                    ) : currentAvatar && typeof currentAvatar === 'object' ? (
                      <AvatarFallback className={`${currentAvatar.bg} text-5xl`}>
                        {currentAvatar.emoji}
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-primary text-3xl font-black">
                        {profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-9 h-9 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                  >
                    <Upload className="w-4 h-4 text-white" />
                  </motion.button>
                </motion.div>
                <p className="text-sm text-slate-500 mt-3">点击上传自定义头像</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">选择预设头像</Label>
                <div className="grid grid-cols-5 gap-3">
                  {PRESET_AVATARS.map((avatar) => (
                    <motion.button
                      key={avatar.id}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setSelectedAvatar(avatar.id);
                        setCustomAvatarUrl(null);
                      }}
                      className={`relative aspect-square rounded-2xl ${avatar.bg} flex items-center justify-center text-3xl shadow-md transition-all ${
                        selectedAvatar === avatar.id && !customAvatarUrl
                          ? 'ring-3 ring-blue-500 ring-offset-2 scale-105'
                          : 'hover:shadow-lg'
                      }`}
                    >
                      {avatar.emoji}
                      {selectedAvatar === avatar.id && !customAvatarUrl && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                        >
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
                <div className="flex justify-center gap-4 text-[10px] text-slate-400">
                  {PRESET_AVATARS.map(a => (
                    <span key={a.id} className="w-[calc(20%-8px)] text-center">{a.label}</span>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 背景主题 Tab */}
            <TabsContent value="background" className="space-y-4 mt-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">上传自定义背景</Label>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => bgFileInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs text-slate-500">点击上传背景图片</span>
                </motion.button>
                <input
                  ref={bgFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundUpload}
                  className="hidden"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-slate-700">选择预设主题</Label>
                <div className="grid grid-cols-1 gap-3">
                  {PRESET_BACKGROUNDS.map((bg) => (
                    <motion.button
                      key={bg.id}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedBackground(bg.id);
                        setCustomBackgroundUrl(null);
                      }}
                      className={`relative h-16 rounded-xl bg-gradient-to-r ${bg.gradient} flex items-center px-4 shadow-md transition-all overflow-hidden ${
                        selectedBackground === bg.id && !customBackgroundUrl
                          ? 'ring-2 ring-blue-500 ring-offset-2'
                          : ''
                      }`}
                      style={{ background: bg.pattern }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r ${bg.gradient}" style={{
                        background: `linear-gradient(135deg, var(--tw-gradient-stops))`
                      }} />
                      <div className={`absolute inset-0 bg-gradient-to-r ${bg.gradient}`} />
                      <span className="relative z-10 text-white font-bold text-sm drop-shadow-md">{bg.label}</span>
                      {selectedBackground === bg.id && !customBackgroundUrl && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg"
                        >
                          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 基本信息 Tab */}
            <TabsContent value="profile" className="space-y-4 mt-4">
              {/* 身份信息 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-blue-100 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">身份信息</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pf-full-name" className="text-sm font-medium text-slate-700">真实姓名</Label>
                  <Input
                    id="pf-full-name"
                    placeholder="请输入您的姓名"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">性别</Label>
                  <RadioGroup
                    value={gender}
                    onValueChange={setGender}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="pf-male" />
                      <Label htmlFor="pf-male" className="text-sm cursor-pointer">👨 男</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="pf-female" />
                      <Label htmlFor="pf-female" className="text-sm cursor-pointer">👩 女</Label>
                    </div>
                   
                  </RadioGroup>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">年龄</Label>
                  <Input
                    type="number"
                    placeholder="请输入年龄"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                    min="1"
                    max="120"
                  />
                </div>
              </div>

              {/* 身体数据 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
                    <Scale className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">身体数据</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-height" className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" /> 身高 (cm)
                    </Label>
                    <Input
                      id="pf-height"
                      type="number"
                      placeholder="175"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="h-10 rounded-xl text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pf-weight" className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5" /> 体重 (kg)
                    </Label>
                    <Input
                      id="pf-weight"
                      type="number"
                      placeholder="65"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="h-10 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* 联系方式 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-md bg-purple-100 flex items-center justify-center">
                    <Phone className="w-3.5 h-3.5 text-purple-600" />
                  </div>
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">联系方式</span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pf-phone" className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> 手机号
                  </Label>
                  <Input
                    id="pf-phone"
                    type="tel"
                    placeholder="请输入手机号"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pf-wechat" className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> 微信号
                  </Label>
                  <Input
                    id="pf-wechat"
                    placeholder="请输入微信号"
                    value={wechat}
                    onChange={(e) => setWechat(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pf-email" className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> 邮箱
                  </Label>
                  <Input
                    id="pf-email"
                    type="email"
                    placeholder="请输入邮箱"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="h-10 rounded-xl text-sm"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-4 border-t mt-4">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="flex-1 h-11 rounded-xl"
              disabled={saving || uploadingImage}
            >
              取消
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={saving || uploadingImage}
              className="flex-1 h-11 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:via-indigo-700 hover:to-violet-700 text-white shadow-lg shadow-blue-500/25"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中
                </>
              ) : (
                '保存更改'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 医生后台登录对话框 */}
      <Dialog open={doctorDialogOpen} onOpenChange={setDoctorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-emerald-600" />
              医生后台登录
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doctor-username">用户名</Label>
              <Input
                id="doctor-username"
                value={doctorUsername}
                onChange={(e) => setDoctorUsername(e.target.value)}
                placeholder="请输入医生账号用户名"
                disabled={doctorLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctor-password">密码</Label>
              <Input
                id="doctor-password"
                type="password"
                value={doctorPassword}
                onChange={(e) => setDoctorPassword(e.target.value)}
                placeholder="请输入密码"
                disabled={doctorLoading}
              />
            </div>
            <p className="text-xs text-slate-500">
              登录成功后将进入医生后台。如非医生账号，将提示失败。
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setDoctorDialogOpen(false)}
              className="flex-1"
              disabled={doctorLoading}
            >
              取消
            </Button>
            <Button
              onClick={async () => {
                if (!doctorUsername || !doctorPassword) {
                  toast.error('请输入用户名和密码');
                  return;
                }
                setDoctorLoading(true);
                const { error } = await signInWithUsername(doctorUsername, doctorPassword);
                if (error) {
                  toast.error('登录失败: ' + error.message);
                  setDoctorLoading(false);
                  return;
                }
                await refreshProfile();
                const { data: { session } } = await supabase.auth.getSession();
                const latestProfile = session?.user ? await getProfile(session.user.id) : null;
                setDoctorLoading(false);
                setDoctorDialogOpen(false);
                if (latestProfile?.role === 'doctor' || latestProfile?.role === 'admin') {
                  toast.success('登录成功，正在进入医生后台');
                  navigate('/doctor/dashboard');
                } else {
                  toast.error('当前账户非医生/管理员角色，无法进入医生后台');
                }
              }}
              disabled={doctorLoading}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            >
              {doctorLoading ? '登录中...' : '登录'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {reportOpen && (
        <FusionReport onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}
