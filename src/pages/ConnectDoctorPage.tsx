import { motion } from 'framer-motion';
import { Award, Calendar, 
  ChevronLeft, Clock, MapPin, 
  MessageCircle, Search, ShieldCheck, Star, 
  UserCheck, Video, X, Check,
  Info, Bell
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Doctor {
  id: number;
  name: string;
  title: string;
  specialty: string;
  hospital: string;
  rating: number;
  reviews: number;
  experience: string;
  tags: string[];
  avatar: string;
  status: 'online' | 'busy' | 'offline';
  desc?: string;
  price?: string;
}

export default function ConnectDoctorPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('全部医生');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const doctors: Doctor[] = [
    {
      id: 1,
      name: '陈医生',
      title: '主任医师',
      specialty: '重度抑郁 / 焦虑障碍',
      hospital: '上海精神卫生中心',
      rating: 4.9,
      reviews: 128,
      experience: '15年经验',
      tags: ['专业亲和', '回复及时'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doctor1',
      status: 'online',
      desc: '擅长各类心理障碍的个性化治疗方案，拥有多年临床经验，特别是在焦虑症与抑郁症的联合疗法上有深厚造诣。',
      price: '¥299/次',
    },
    {
      id: 2,
      name: '李教授',
      title: '资深心理咨询师',
      specialty: '青少年心理 / 家庭关系',
      hospital: '心域智护在线中心',
      rating: 4.8,
      reviews: 256,
      experience: '12年经验',
      tags: ['资深导师', '逻辑清晰'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doctor2',
      status: 'busy',
      desc: '深耕青少年心理辅导多年，在处理家庭冲突、学业压力及青春期叛逆等方面有着丰富的咨询案例。',
      price: '¥199/次',
    },
    {
      id: 3,
      name: '王医师',
      title: '副主任医师',
      specialty: '睡眠障碍 / 职场压力',
      hospital: '华山医院心理科',
      rating: 4.7,
      reviews: 89,
      experience: '8年经验',
      tags: ['耐心周到', '方案落地'],
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=doctor3',
      status: 'offline',
      desc: '专注于失眠症及现代职场压力引发的各种身心问题，主张药物与心理引导相结合的综合治疗。',
      price: '¥249/次',
    },
  ];

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => 
      (doc.name.includes(searchQuery) || doc.specialty.includes(searchQuery) || doc.hospital.includes(searchQuery))
    );
  }, [searchQuery]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (tab !== '全部医生') {
      toast.info(`已切换至: ${tab}`);
    }
  };

  const handleDoctorClick = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
  };

  const handleTextConsult = (e: React.MouseEvent, doctor: Doctor) => {
    e.stopPropagation();
    toast.success(`正在为您连接 ${doctor.name} 的图文咨询窗口...`);
    setTimeout(() => navigate('/assessment'), 1500); // 暂时跳到评估页模拟入口
  };

  const handleVideoBooking = (e: React.MouseEvent, doctor: Doctor) => {
    e.stopPropagation();
    if (doctor.status === 'offline') {
      toast.error(`${doctor.name} 目前不在线，请稍后再试或通过预约系统预约。`);
    } else {
      toast.success(`视频问诊申请已发送给 ${doctor.name}，请在挂号处确认时间。`);
    }
  };

  const handleGuaranteeClick = (title: string) => {
    toast.info(`心域智护保障：${title}`, {
      description: "我们严格筛选每一位合作专家，确保提供最专业、最安全的心理咨询服务。",
      icon: <ShieldCheck className="w-5 h-5 text-emerald-500" />
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-20">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 pt-4 pb-6 sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full">
              <ChevronLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-lg font-black bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              对接医生
            </h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => toast.info('目前暂无新的医生动态')}>
            <Bell className="w-5 h-5 text-slate-400" />
          </Button>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="搜索医生、科室、疾病..." 
            className="pl-11 h-12 bg-slate-100/80 dark:bg-slate-800/50 border-none rounded-2xl text-sm transition-all focus:ring-2 focus:ring-primary/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-4 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery('')}
            >
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* 快速分类 */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['全部医生', '专家门诊', '在线咨询', '视频问诊', '心理咨询'].map((tab) => (
            <motion.div
              key={tab}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleTabClick(tab)}
              className="cursor-pointer"
            >
              <Badge 
                variant={activeTab === tab ? 'default' : 'outline'}
                className={`whitespace-nowrap px-5 py-2 rounded-2xl text-xs font-black border-none transition-all ${
                  activeTab === tab 
                    ? 'bg-indigo-500 shadow-lg shadow-indigo-200 text-white' 
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                }`}
              >
                {tab}
              </Badge>
            </motion.div>
          ))}
        </div>

        {/* 专家列表 */}
        <div className="space-y-5">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.1em] flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> 推荐专家
            </h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-indigo-600 text-xs font-black"
              onClick={() => toast.success('已为您显示全部可用专家列表')}
            >
              查看全部
            </Button>
          </div>

          {filteredDoctors.length > 0 ? filteredDoctors.map((doctor, idx) => (
            <motion.div
              key={doctor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleDoctorClick(doctor)}
            >
              <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden bg-white dark:bg-slate-900 transition-all hover:shadow-2xl">
                <CardContent className="p-5">
                  <div className="flex gap-5">
                    <div className="relative">
                      <Avatar className="w-16 h-16 rounded-[1.2rem] border-2 border-white shadow-md">
                        <AvatarImage src={doctor.avatar} />
                        <AvatarFallback className="bg-indigo-50 text-indigo-500">{doctor.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-white shadow-sm ${
                          doctor.status === 'online' ? 'bg-emerald-500' : 
                          doctor.status === 'busy' ? 'bg-amber-500' : 'bg-slate-300'
                        }`} 
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1.5 pt-0.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-800 dark:text-slate-100 text-base">{doctor.name}</h3>
                          <span className="text-[10px] text-slate-400 font-bold bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-wider">{doctor.title}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="text-[10px] font-black text-amber-600 dark:text-amber-400">{doctor.rating}</span>
                        </div>
                      </div>
                      
                      <p className="text-[11px] text-indigo-500 font-black tracking-tight">{doctor.specialty}</p>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-slate-300" />
                        <span className="truncate">{doctor.hospital}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <span className="whitespace-nowrap">{doctor.experience}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-4">
                    {doctor.tags.map(tag => (
                      <span key={tag} className="text-[9px] px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg font-bold">
                        {tag}
                      </span>
                    ))}
                    <div className="flex-1" />
                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">{doctor.price}</span>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <Button 
                      variant="outline" 
                      className="flex-1 rounded-2xl h-11 text-xs font-black border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={(e) => handleTextConsult(e, doctor)}
                    >
                      <MessageCircle className="w-4 h-4 mr-2 text-indigo-500" />
                      图文咨询
                    </Button>
                    <Button 
                      className="flex-1 rounded-2xl h-11 text-xs font-black bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-100 dark:shadow-none"
                      onClick={(e) => handleVideoBooking(e, doctor)}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      预约视频
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
              <Search className="w-12 h-12 text-slate-200" />
              <p className="text-sm font-bold">未找到匹配的专家，换个搜索词试试？</p>
            </div>
          )}
        </div>

        {/* 底部保障 */}
        <div className="bg-emerald-50/50 dark:bg-emerald-950/10 rounded-[2rem] p-8 grid grid-cols-2 gap-y-6 border border-emerald-100/50">
          {[
            { icon: ShieldCheck, label: '隐私严格加密' },
            { icon: UserCheck, label: '执业资格认证' },
            { icon: Award, label: '三甲名医资源' },
            { icon: Clock, label: '7x24h 在线响应' },
          ].map((item) => (
            <motion.div 
              key={item.label} 
              className="flex items-center gap-3 cursor-pointer"
              whileHover={{ scale: 1.05 }}
              onClick={() => handleGuaranteeClick(item.label)}
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shadow-inner">
                <item.icon className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 tracking-tight">{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 医生详情对话框 */}
      <Dialog open={!!selectedDoctor} onOpenChange={() => setSelectedDoctor(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="p-8">
            <div className="flex gap-6 mb-8">
              <Avatar className="w-24 h-24 rounded-[1.5rem] border-4 border-white shadow-xl bg-white">
                <AvatarImage src={selectedDoctor?.avatar} />
                <AvatarFallback>{selectedDoctor?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 pt-2 space-y-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-800 dark:text-white">{selectedDoctor?.name}</h2>
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-500 hover:bg-indigo-50 border-none font-bold">
                    {selectedDoctor?.title}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-black">{selectedDoctor?.rating}</span>
                  </div>
                  <div className="w-px h-3 bg-slate-200" />
                  <span className="text-sm font-bold text-slate-400">{selectedDoctor?.reviews} 条评价</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500" /> 
                  医疗背景
                </h4>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                  <p className="text-sm font-black text-slate-700 dark:text-slate-200">{selectedDoctor?.hospital}</p>
                  <p className="text-xs font-bold text-slate-500">{selectedDoctor?.specialty}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-500" /> 
                  专家简介
                </h4>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                  {selectedDoctor?.desc}
                </p>
              </div>

              <div className="flex gap-2">
                {selectedDoctor?.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="rounded-lg text-[10px] font-bold py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-10">
              <Button 
                variant="outline" 
                className="h-14 rounded-2xl font-black text-slate-500 hover:bg-slate-50"
                onClick={(e) => selectedDoctor && handleTextConsult(e as any, selectedDoctor)}
              >
                图文咨询
              </Button>
              <Button 
                className="h-14 rounded-2xl font-black bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-100 dark:shadow-none"
                onClick={(e) => selectedDoctor && handleVideoBooking(e as any, selectedDoctor)}
              >
                立即预约
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
