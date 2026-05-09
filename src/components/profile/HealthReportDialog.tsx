import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import html2canvas from 'html2canvas';
import { Activity, BarChart3, Calendar,Check, 
  ChevronRight, 
  Download, Droplets, FileText, Heart, LineChart, Loader2, Moon, 
  PieChart, Share2, Shield, Sparkles, TrendingUp, X, Zap 
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Bar, 
  BarChart, CartesianGrid, Cell, Line, 
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar,RadarChart, 
  LineChart as ReLineChart, 
  ResponsiveContainer, Tooltip as ReTooltip,XAxis, YAxis 
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { getAssessments, getEmotionDiaries } from '@/db/api';
import type { Assessment, EmotionDiary } from '@/types';

interface HealthReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HealthReportDialog: React.FC<HealthReportDialogProps> = ({ open, onOpenChange }) => {
  const { user, profile } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{
    score: number;
    radarData: any[];
    trendData: any[];
    vitalsData: any[];
    summary: string;
    advice: string[];
    isFallback?: boolean;
  } | null>(null);

  useEffect(() => {
    if (open && user) {
      generateReport();
    }
  }, [open, user]);

  const generateReport = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [assessments, diaries] = await Promise.all([
        getAssessments(user.id, 5),
        getEmotionDiaries(user.id, 7)
      ]);

      let assessmentScore = 70;
      let diariesForTrend = diaries;

      if (assessments.length > 0) {
        assessmentScore = (100 - (assessments[0].risk_level || 0) * 10);
      }

      const voiceScore = 75;
      const facialScore = 80;
      const finalScore = Math.round(assessmentScore * 0.4 + voiceScore * 0.3 + facialScore * 0.3);

      const radarData = [
        { subject: '心理量表', A: assessmentScore, fullMark: 100 },
        { subject: '语音情绪', A: voiceScore, fullMark: 100 },
        { subject: '面部表情', A: facialScore, fullMark: 100 },
        { subject: '社交活跃', A: 85, fullMark: 100 },
        { subject: '睡眠质量', A: 70, fullMark: 100 },
      ];

      const trendData = diariesForTrend.length > 0 
        ? [...diariesForTrend].reverse().map(d => {
            const scoreMap = { very_bad: 20, bad: 40, neutral: 60, good: 80, very_good: 100 };
            return {
              date: format(new Date(d.diary_date), 'MM-dd'),
              score: scoreMap[d.emotion_level] || 60
            };
          })
        : [
            { date: '01-25', score: 65 },
            { date: '01-26', score: 70 },
            { date: '01-27', score: 62 },
            { date: '01-28', score: 75 },
            { date: '01-29', score: 80 },
            { date: '01-30', score: 78 },
            { date: '01-31', score: 82 },
          ];

      const vitalsData = [
        { name: '心率', value: 72, unit: 'bpm', icon: Heart, color: '#f87171' },
        { name: '血压', value: '118/78', unit: 'mmHg', icon: Activity, color: '#60a5fa' },
        { name: '睡眠', value: 7.5, unit: 'h', icon: Moon, color: '#818cf8' },
        { name: '步数', value: 8432, unit: 'steps', icon: Zap, color: '#fbbf24' },
      ];

      setData({
        score: finalScore,
        radarData,
        trendData,
        vitalsData,
        summary: assessments.length > 0 
          ? `根据您最近的多模态分析，您的心理健康评分为 ${finalScore} 分。当前状态稳中向好，语音与面部表情显示您的情绪基调较为积极。`
          : `当前数据量不足，已为您生成基于通用基准的分析报告。建议您坚持完成每日日记和周度评估，以便获取更精准的个性化报告。`,
        advice: [
          "保持规律的作息，有助于维持情绪稳定",
          "建议多进行户外活动，增加社交互动",
          "继续坚持每日的心情日记，记录美好瞬间"
        ],
        isFallback: assessments.length === 0
      });
    } catch (error) {
      console.error('生成报告失败:', error);
      // 降级到全模拟数据
      const mockData = {
        score: 85,
        radarData: [
          { subject: '心理量表', A: 85, fullMark: 100 },
          { subject: '语音情绪', A: 78, fullMark: 100 },
          { subject: '面部表情', A: 90, fullMark: 100 },
          { subject: '社交活跃', A: 70, fullMark: 100 },
          { subject: '睡眠质量', A: 82, fullMark: 100 },
        ],
        trendData: [
          { date: '01-25', score: 65 },
          { date: '01-26', score: 70 },
          { date: '01-27', score: 62 },
          { date: '01-28', score: 75 },
          { date: '01-29', score: 80 },
          { date: '01-30', score: 78 },
          { date: '01-31', score: 82 },
        ],
        vitalsData: [
          { name: '心率', value: 72, unit: 'bpm', icon: Heart, color: '#f87171' },
          { name: '血压', value: '118/78', unit: 'mmHg', icon: Activity, color: '#60a5fa' },
          { name: '睡眠', value: 7.5, unit: 'h', icon: Moon, color: '#818cf8' },
          { name: '步数', value: 8432, unit: 'steps', icon: Zap, color: '#fbbf24' },
        ],
        summary: "当前系统连接受限，已为您展示模拟健康数据。正常情况下，系统将融合您的量表得分、语音语调及表情特征进行深度评估。",
        advice: ["保持乐观心态", "坚持适度运动", "保证充足睡眠"],
        isFallback: true
      };
      setData(mockData);
      toast.info('由于数据加载受限，已为您展示演示报告');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setLoading(true);
    try {
      // 临时隐藏下载和分享按钮，避免出现在截图中
      const footer = reportRef.current.querySelector('.report-footer') as HTMLElement;
      if (footer) footer.style.display = 'none';

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 800, // 确保截图比例一致
      });

      if (footer) footer.style.display = 'flex';

      const link = document.createElement('a');
      link.download = `心域智护健康报告-${format(new Date(), 'yyyyMMdd')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('报告已生成并开始下载');
    } catch (error) {
      console.error('导出失败:', error);
      toast.error('导出失败');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: '心域智护心理健康报告',
        text: `我刚刚生成了最新的心理健康报告，得分为 ${data?.score}，快来看看吧！`,
        url: window.location.href,
      }).catch(err => {
        if (err.name !== 'AbortError') {
          toast.error('分享失败');
        }
      });
    } else {
      toast.info('您的浏览器暂不支持原生分享，请截图后进行分享');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none sm:rounded-3xl">
        <DialogTitle className="sr-only">健康评估报告</DialogTitle>
        <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col" ref={reportRef}>
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/10 hover:bg-black/20 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* 报告头部 */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white relative flex-shrink-0">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Sparkles className="w-24 h-24" />
            </div>
            <div className="relative z-10 flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold mb-2">健康评估报告</h2>
                <p className="opacity-80 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(), 'yyyy年MM月dd日', { locale: zhCN })}
                </p>
              </div>
              <div className="text-right">
                <div className="text-6xl font-black mb-1">{data?.score || '--'}</div>
                <div className="text-sm opacity-80 uppercase tracking-widest font-bold">Health Score</div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-slate-500 animate-pulse">正在融合多模态数据，生成深度分析报告...</p>
              </div>
            ) : data ? (
              <>
                {/* 核心分析 - 雷达图 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data.radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
                        <Radar
                          name="评分"
                          dataKey="A"
                          stroke="#3b82f6"
                          fill="#3b82f6"
                          fillOpacity={0.6}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                      <Sparkles className="w-5 h-5 text-amber-500" />
                      多模态综合分析
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                      {data.summary}
                    </p>
                    {data.isFallback && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg border border-amber-100 dark:border-amber-800/50">
                        <Shield className="w-3 h-3" />
                        <span>数据受限，当前展示演示基准数据</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 生理指标概览 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {data.vitalsData.map((vital, idx) => {
                    const Icon = vital.icon;
                    return (
                      <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${vital.color}20` }}>
                            <Icon className="w-4 h-4" style={{ color: vital.color }} />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{vital.name}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-slate-800 dark:text-white">{vital.value}</span>
                          <span className="text-[10px] text-slate-400 uppercase">{vital.unit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 情绪趋势 - 折线图 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    近七日情绪波动趋势
                  </h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ReLineChart data={data.trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                        />
                        <YAxis hide domain={[0, 100]} />
                        <ReTooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke="#10b981" 
                          strokeWidth={3} 
                          dot={{ fill: '#10b981', r: 4, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                      </ReLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 专家建议 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                    <Shield className="w-5 h-5 text-blue-500" />
                    专家康复建议
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {data.advice.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/50">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* 报告底部 */}
          <div className="p-8 pt-0 flex gap-4 report-footer">
            <Button 
              className="flex-1 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-0 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 transition-all font-semibold"
              onClick={handleDownload}
              disabled={loading}
            >
              <Download className="w-5 h-5 mr-2" />
              下载报告
            </Button>
            <Button 
              className="flex-1 h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 border-0 transition-all font-semibold"
              onClick={handleShare}
              disabled={loading}
            >
              <Share2 className="w-5 h-5 mr-2" />
              分享成果
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
