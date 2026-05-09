import { motion } from 'framer-motion';
import { Activity, Award, BookOpen, Clock, CheckCircle2, 
  ChevronLeft, Circle, Heart, Music, Sparkles, 
  Target, Calendar, ArrowRight, Shield, TrendingUp
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface Task {
  id: number;
  title: string;
  time: string;
  duration: string;
  type: 'meditation' | 'record' | 'activity';
  completed: boolean;
  desc?: string;
}

interface Milestone {
  title: string;
  date: string;
  status: 'completed' | 'in-progress' | 'pending';
  desc?: string;
}

export default function HealingPlanPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'daily' | 'roadmap'>('daily');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isPlanDetailOpen, setIsPlanDetailOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const initialDailyTasks: Task[] = [
    { id: 1, title: '晨间呼吸冥想', time: '08:00', duration: '5分钟', type: 'meditation', completed: true, desc: '开启活力的一天，通过深呼吸调节自主神经系统。' },
    { id: 2, title: '心情随笔记录', time: '12:30', duration: '3分钟', type: 'record', completed: true, desc: '午间时刻，通过文字捕捉当下的情绪波动。' },
    { id: 3, title: '午后正念行走', time: '14:00', duration: '10分钟', type: 'activity', completed: false, desc: '在行走中感受身体的律动，缓解午后焦虑感。' },
    { id: 4, title: '睡前助眠引导', time: '22:30', duration: '15分钟', type: 'meditation', completed: false, desc: '放松身心，通过阿尔法波引导进入深度睡眠。' },
  ];

  const milestones: Milestone[] = [
    { title: '初步评估', date: '2026-02-01', status: 'completed', desc: '完成了首次AI心理评估，建立了情绪基础基准。' },
    { title: '建立习惯', date: '2026-02-07', status: 'in-progress', desc: '正在持续坚持7天打卡，形成初步的情绪调节意识。' },
    { title: '情绪稳定', date: '2026-02-14', status: 'pending', desc: '进入深度调节阶段，旨在大幅降低情绪波动频率。' },
    { title: '阶段复盘', date: '2026-03-01', status: 'pending', desc: '对一个月以来的疗愈效果进行系统性回顾与分析。' },
  ];

  const [tasks, setTasks] = useState<Task[]>(initialDailyTasks);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleCompleteTask = (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation();
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: true } : t));
    toast.success('任务已完成！太棒了 🌟');
  };

  const handleGoToTask = (type: string) => {
    if (type === 'record') {
      navigate('/record');
    } else {
      navigate('/healing');
    }
    toast.info('正在由AI助手为您开启专属空间...');
  };

  const handleExploreClick = (title: string) => {
    navigate('/healing');
    toast.success(`计划已添加至收藏：${title}`);
  };

  const handleMilestoneClick = (ms: Milestone) => {
    if (ms.status === 'pending') {
      toast.error('该阶段尚未解锁，请继续努力！');
    } else {
      setSelectedMilestone(ms);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-20">
      {/* Header */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-4 sticky top-0 z-30 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
            <ChevronLeft className="w-6 h-6 text-slate-600 dark:text-slate-400" />
          </Button>
          <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
            疗愈计划
          </h1>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Calendar className="w-5 h-5 text-slate-400" />
        </Button>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* 总体进度卡片 */}
        <motion.div
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsPlanDetailOpen(true)}
          className="cursor-pointer"
        >
          <Card className="border-0 shadow-2xl shadow-indigo-200 dark:shadow-none bg-gradient-to-br from-indigo-500 via-purple-600 to-fuchsia-600 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-12 -mt-12 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-8 -mb-8 blur-3xl" />
            <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-3 h-3 text-white/60" />
                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-[0.2em]">当前阶段：建立习惯</p>
                  </div>
                  <h2 className="text-2xl font-black mt-1 tracking-tight">21天情绪重塑计划</h2>
                </div>
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none px-3 py-1 text-xs font-bold backdrop-blur-md">
                  第 7 天
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold">
                  <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> 总进度 33%</span>
                  <span>还剩 14 天</span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full p-0.5 overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: '33%' }}
                     transition={{ duration: 1.5, ease: "easeOut" }}
                     className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                   />
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-bold text-white/90">
                  <Target className="w-4 h-4 text-white" />
                  <span>目标：每日坚持情绪记录与冥想</span>
                </div>
                <ArrowRight className="w-4 h-4 text-white/60" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 标签切换 - 响应式联动 */}
        <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('daily')}
            className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all duration-300 ${activeTab === 'daily' ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
          >
            今日任务
          </button>
          <button 
            onClick={() => setActiveTab('roadmap')}
            className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all duration-300 ${activeTab === 'roadmap' ? 'bg-white dark:bg-slate-700 shadow-md text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}
          >
            成长路线
          </button>
        </div>

        {activeTab === 'daily' ? (
          <div className="space-y-4">
            {tasks.map((task, idx) => (
              <motion.div 
                key={task.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTaskClick(task)}
              >
                <Card className={`border-0 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden ${task.completed ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : 'bg-white dark:bg-slate-900'}`}>
                  <CardContent className="p-4 flex items-center gap-4 relative">
                    {task.completed && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12" />
                    )}
                    <div 
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-500 ${task.completed ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:scale-110'}`}
                      onClick={(e) => !task.completed && handleCompleteTask(e, task.id)}
                    >
                      {task.completed ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-base font-bold truncate ${task.completed ? 'text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-100'}`}>
                          {task.title}
                        </h3>
                        {task.type === 'meditation' && <Music className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />}
                        {task.type === 'record' && <BookOpen className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {task.time}</span>
                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                        <span>时长：{task.duration}</span>
                      </div>
                    </div>
                    
                    {!task.completed && (
                      <Button 
                        size="sm" 
                        className="rounded-full h-9 text-xs font-black px-5 bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-100 dark:shadow-none"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGoToTask(task.type);
                        }}
                      >
                        去完成
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            
            <div className="pt-2">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  toast.info('正在分析近期生理指标与心理数据...');
                  setTimeout(() => toast.success('今日助眠建议：尝试使用"白噪音"模式播放。'), 2000);
                }}
                className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-100/50 dark:border-amber-900/30 rounded-[2rem] p-5 flex gap-4 cursor-pointer shadow-sm hover:shadow-lg transition-all"
              >
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-black text-amber-800 dark:text-amber-400">今日疗愈建议</p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-500/80 leading-relaxed font-medium">
                    根据最近的生物钟偏移，建议今晚尝试“深海白噪音”助眠。保持作息规律有助于5-羟色胺的自然分泌。
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="space-y-10 py-6 px-4">
            {milestones.map((ms, index) => (
              <motion.div 
                key={ms.title} 
                className="relative flex gap-8 cursor-pointer"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleMilestoneClick(ms)}
              >
                {/* 动态虚线连线 */}
                {index !== milestones.length - 1 && (
                  <div className="absolute left-[17px] top-10 bottom-[-32px] w-[2px] bg-gradient-to-b from-indigo-200 to-slate-50 dark:from-indigo-900 dark:to-slate-900" />
                )}
                
                <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 flex-shrink-0 transition-all duration-500 ring-4 ${
                  ms.status === 'completed' ? 'bg-indigo-500 text-white ring-indigo-50 shadow-lg shadow-indigo-100' : 
                  ms.status === 'in-progress' ? 'bg-white dark:bg-slate-800 border-[3px] border-indigo-500 text-indigo-500 ring-indigo-50 animate-pulse' : 
                  'bg-slate-100 dark:bg-slate-800 text-slate-400 ring-transparent'
                }`}>
                  {ms.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-sm font-black">{index + 1}</span>}
                </div>
                
                <div className={`flex-1 pb-2 transition-all ${ms.status === 'pending' ? 'opacity-50' : 'opacity-100'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <h3 className={`font-black text-lg ${ms.status === 'pending' ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                      {ms.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{ms.date}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {ms.status === 'completed' ? '已达成该阶段目标，情绪基准已建立' : 
                     ms.status === 'in-progress' ? '当前核心攻坚阶段，建议每日打卡' : 
                     '锁定中，完成习惯建立阶段后自动开启'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 底部探索区域 - 卡片质感升级 */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-5 px-1">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-100">探索更多计划</h3>
            <Button variant="ghost" size="sm" className="text-xs text-indigo-500 font-bold" onClick={() => navigate('/healing')}>查看全部</Button>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-6 scrollbar-hide -mx-1 px-1">
            {[
              { title: '正念减压', icon: Heart, color: 'from-rose-400 to-pink-500', shadow: 'shadow-rose-100' },
              { title: '自信重塑', icon: Award, color: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-100' },
              { title: '职场焦虑', icon: Activity, color: 'from-indigo-400 to-blue-500', shadow: 'shadow-indigo-100' },
            ].map((p, idx) => (
              <motion.div 
                key={p.title} 
                className="flex-shrink-0 w-36 space-y-3 cursor-pointer"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleExploreClick(p.title)}
              >
                <div className={`h-40 rounded-[2.5rem] bg-gradient-to-br ${p.color} flex items-center justify-center shadow-xl ${p.shadow} dark:shadow-none relative overflow-hidden`}>
                   <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
                   <p.icon className="w-12 h-12 text-white drop-shadow-lg" />
                </div>
                <p className="text-sm font-black text-center text-slate-700 dark:text-slate-200 tracking-tight">{p.title}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 任务详情对话框 */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0">
          <div className={`h-32 bg-gradient-to-br ${selectedTask?.type === 'meditation' ? 'from-indigo-500 to-purple-600' : selectedTask?.type === 'record' ? 'from-amber-400 to-orange-500' : 'from-emerald-400 to-teal-500'} flex items-center justify-center relative`}>
             <div className="absolute inset-0 bg-white/10" />
             <div className="w-20 h-20 rounded-[2rem] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-2xl">
                {selectedTask?.type === 'meditation' && <Music className="w-10 h-10 text-white" />}
                {selectedTask?.type === 'record' && <BookOpen className="w-10 h-10 text-white" />}
                {selectedTask?.type === 'activity' && <Activity className="w-10 h-10 text-white" />}
             </div>
          </div>
          <div className="p-8">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`${selectedTask?.completed ? 'text-emerald-500 border-emerald-500 bg-emerald-50' : 'text-indigo-500 border-indigo-500 bg-indigo-50'} text-[10px] font-bold`}>
                  {selectedTask?.completed ? '已完成' : '待处理'}
                </Badge>
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{selectedTask?.type}</span>
              </div>
              <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white">{selectedTask?.title}</DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed pt-2 font-medium">
                {selectedTask?.desc}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-8">
              <div className="flex items-center gap-6 bg-slate-50 dark:bg-slate-800/80 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">建议时间</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{selectedTask?.time}</p>
                </div>
                <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">预估时长</p>
                  <p className="text-lg font-black text-slate-800 dark:text-white">{selectedTask?.duration}</p>
                </div>
              </div>
            </div>
            <DialogFooter className="flex-row gap-4 sm:justify-end">
              <Button variant="ghost" className="flex-1 h-14 rounded-2xl font-black text-slate-500" onClick={() => setSelectedTask(null)}>
                返回
              </Button>
              <Button className="flex-1 h-14 rounded-2xl font-black bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-200 dark:shadow-none" onClick={() => {
                setSelectedTask(null);
                handleGoToTask(selectedTask?.type || '');
              }}>
                立即开启
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 计划详情对话框 */}
      <Dialog open={isPlanDetailOpen} onOpenChange={setIsPlanDetailOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl p-8">
          <DialogHeader className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500 flex items-center justify-center mb-2 shadow-lg shadow-indigo-200">
               <Shield className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">21天情绪重塑计划</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              基于医学实证的数字化疗愈方案，旨在21天内通过多维干预手段，帮助您构建更具韧性的心理防御机制。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-8 py-6">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" /> 
                核心目标
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {[
                  '建立每日5分钟的正念冥想惯性',
                  '通过AI对话识别情绪触发源',
                  '改善睡眠效率及清晨觉醒压力',
                  '完成全周期的阶段性AI复盘报告'
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl p-6 space-y-4 border border-indigo-100/50">
              <div className="flex justify-between items-center text-indigo-600 dark:text-indigo-400">
                <span className="text-xs font-black uppercase tracking-wider">坚持进度</span>
                <span className="text-sm font-black">第 7 / 21 天</span>
              </div>
              <div className="h-2 bg-white dark:bg-slate-800 rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: '33%' }}
                   transition={{ duration: 1.5 }}
                   className="h-full bg-indigo-500"
                 />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 rounded-2xl font-black bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-100" onClick={() => setIsPlanDetailOpen(false)}>
              好的，我也要坚持
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 里程碑详情对话框 */}
      <Dialog open={!!selectedMilestone} onOpenChange={() => setSelectedMilestone(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-2xl p-8">
          <DialogHeader className="space-y-4 text-center">
            <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 mx-auto flex items-center justify-center shadow-xl shadow-indigo-200">
               <Award className="w-10 h-10 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black text-slate-800 dark:text-white">{selectedMilestone?.title}</DialogTitle>
            <Badge variant="secondary" className="mx-auto w-fit bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-4 py-1">
              完成日期：{selectedMilestone?.date}
            </Badge>
            <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed pt-2">
              {selectedMilestone?.desc}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 p-5 rounded-2xl border border-emerald-100">
              <p className="text-xs font-bold text-emerald-800 dark:text-emerald-400 text-center">
                您通过此阶段获得了“情绪感知者”称号！🎉
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 rounded-2xl font-black bg-slate-900 dark:bg-white dark:text-black" onClick={() => setSelectedMilestone(null)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
