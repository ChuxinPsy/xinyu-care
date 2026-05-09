import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Brain, Check, ClipboardList, Mic, Video } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExpressionStep from '@/components/assessment/ExpressionStep';
import FusionReport from '@/components/assessment/FusionReport';
import ScaleStep from '@/components/assessment/ScaleStep';
import StepNavigation, { AssessmentStep } from '@/components/assessment/StepNavigation';
import VoiceStep from '@/components/assessment/VoiceStep';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

export default function EnhancedAssessmentPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // 移动端步骤状态
  const [currentStep, setCurrentStep] = useState<AssessmentStep>('scale');
  const [completedSteps, setCompletedSteps] = useState<AssessmentStep[]>([]);

  // 三个模块数据（桌面端和移动端共用）
  const [scaleData, setScaleData] = useState<any>(null);
  const [voiceData, setVoiceData] = useState<any>(null);
  const [expressionData, setExpressionData] = useState<any>(null);

  // 是否显示融合报告
  const [showReport, setShowReport] = useState(false);

  // 移动端：步骤完成处理
  const handleStepComplete = (step: AssessmentStep, data: any) => {
    setCompletedSteps(prev => [...new Set([...prev, step])]);
    if (step === 'scale') {
      setScaleData(data);
      setCurrentStep('voice');
    } else if (step === 'voice') {
      setVoiceData(data);
      setCurrentStep('expression');
    } else if (step === 'expression') {
      setExpressionData(data);
      setCurrentStep('report');
    }
  };

  const handleStepChange = (step: AssessmentStep) => {
    setCurrentStep(step);
  };

  // 融合报告展示（桌面端和移动端均使用）
  if ((isMobile && currentStep === 'report') || showReport) {
    return (
      <div
        className={isMobile ? "bg-slate-50 dark:bg-slate-950 overflow-auto" : "min-h-screen bg-slate-50 dark:bg-slate-950"}
        style={isMobile ? { height: 'calc(100dvh - 64px)' } : undefined}
      >
        <FusionReport
          scaleData={scaleData}
          voiceData={voiceData}
          expressionData={expressionData}
          onClose={() => navigate('/profile')}
        />
      </div>
    );
  }

  // ─── 移动端：原有步骤式流程 ───────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        className="bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden"
        style={{ height: 'calc(100dvh - 64px)' }}
      >
        <StepNavigation
          currentStep={currentStep}
          onStepChange={handleStepChange}
          completedSteps={completedSteps}
        />
        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait" initial={false}>
            {currentStep === 'scale' && (
              <motion.div
                key="scale"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 overflow-hidden"
              >
                <ScaleStep
                  userId={user?.id || ''}
                  onComplete={(data) => handleStepComplete('scale', data)}
                />
              </motion.div>
            )}
            {currentStep === 'voice' && (
              <motion.div
                key="voice"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 overflow-hidden"
              >
                <VoiceStep onComplete={(data) => handleStepComplete('voice', data)} />
              </motion.div>
            )}
            {currentStep === 'expression' && (
              <motion.div
                key="expression"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 overflow-hidden"
              >
                <ExpressionStep onComplete={(data) => handleStepComplete('expression', data)} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );
  }

  // ─── 桌面端：三栏统一界面 ────────────────────────────────────────────────

  const desktopModules = [
    { id: 'scale' as const, label: '量表评估', icon: ClipboardList, color: 'from-violet-600 to-indigo-600', done: !!scaleData },
    { id: 'voice' as const, label: '语音情绪识别', icon: Mic, color: 'from-indigo-600 to-blue-600', done: !!voiceData },
    { id: 'expression' as const, label: '表情识别', icon: Video, color: 'from-blue-600 to-cyan-600', done: !!expressionData },
  ];

  const allDone = !!scaleData && !!voiceData && !!expressionData;
  const doneCnt = [scaleData, voiceData, expressionData].filter(Boolean).length;

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* ── 顶部状态栏 ── */}
      <div className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between shadow-sm z-40">
        {/* 左：标题 */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 dark:text-white leading-none">AI 多模态心理评估</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">同步完成三项评估后可生成综合报告</p>
          </div>
        </div>

        {/* 右：进度 + 报告按钮 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-full">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{doneCnt} / 3 完成</span>
          </div>
          <Button
            onClick={() => setShowReport(true)}
            disabled={!allDone}
            className="h-9 px-5 text-sm font-bold rounded-xl shadow-md shadow-primary/20 disabled:opacity-40"
          >
            生成融合报告
          </Button>
        </div>
      </div>

      {/* ── 三栏主体 ── */}
      <div className="flex-1 grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden min-h-0">

        {/* 列 1：量表评估 */}
        <div className="flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          {/* 列头 */}
          <div className="shrink-0 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/30 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">量表评估</span>
            {scaleData && <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">已完成</span>}
          </div>
          {/* 内容（可滚动） */}
          <div className="flex-1 overflow-y-auto">
            <ScaleStep
              userId={user?.id || ''}
              onComplete={(data) => setScaleData(data)}
            />
          </div>
        </div>

        {/* 列 2：语音情绪识别 */}
        <div className="flex flex-col overflow-hidden bg-white dark:bg-slate-900">
          {/* 列头 */}
          <div className="shrink-0 px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
              <Mic className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">语音情绪识别</span>
            {voiceData && <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">已完成</span>}
          </div>
          {/* 内容（可滚动） */}
          <div className="flex-1 overflow-y-auto">
            <VoiceStep onComplete={(data) => setVoiceData(data)} />
          </div>
        </div>

        {/* 列 3：表情识别 */}
        {/*
          ExpressionStep 内部使用 `fixed inset-0`，
          给父容器添加 transform 可使其成为新的包含块，
          将 fixed 子元素约束在列容器内。
        */}
        <div
          className="flex flex-col overflow-hidden bg-slate-950 relative"
          style={{ transform: 'translateZ(0)' }}
        >
          {/* 列头（浮在视频上方，使用绝对定位） */}
          <div className="absolute top-0 left-0 right-0 z-50 px-5 py-3 bg-gradient-to-b from-slate-950/90 to-transparent flex items-center gap-2 pointer-events-none">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center pointer-events-auto">
              <Video className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-white">表情识别</span>
            {expressionData && <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full pointer-events-auto">已完成</span>}
          </div>
          {/* ExpressionStep 撑满列容器 */}
          <div className="flex-1 relative">
            <ExpressionStep onComplete={(data) => setExpressionData(data)} />
          </div>
        </div>

      </div>
    </div>
  );
}
