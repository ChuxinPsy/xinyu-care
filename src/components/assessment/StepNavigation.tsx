import { motion } from 'framer-motion';
import { Check, ClipboardList, Mic, Video } from 'lucide-react';
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export type AssessmentStep = 'scale' | 'voice' | 'expression' | 'report';

interface StepNavigationProps {
  currentStep: AssessmentStep;
  onStepChange: (step: AssessmentStep) => void;
  completedSteps: AssessmentStep[];
}

const steps: { id: AssessmentStep; label: string; icon: React.ElementType }[] = [
  { id: 'scale', label: '量表评估', icon: ClipboardList },
  { id: 'voice', label: '语音识别', icon: Mic },
  { id: 'expression', label: '表情识别', icon: Video },
];

export default function StepNavigation({ currentStep, onStepChange, completedSteps }: StepNavigationProps) {
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const isMobile = useIsMobile();

  return (
    <div className={`${isMobile ? 'shrink-0' : 'fixed top-0 right-0 left-64'} z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-4`}>
      <div className="max-w-md mx-auto flex items-center justify-between relative">
        {/* 背景连接线 */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-700 -translate-y-1/2 mx-8" />

        {/* 进度连接线 - 带动画 */}
        <motion.div
          initial={false}
          animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="absolute top-5 left-0 h-0.5 bg-gradient-to-r from-primary to-primary/80 -translate-y-1/2 mx-8 origin-left"
        />

        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id);
          const isPast = currentStepIndex > index;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 z-10">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onStepChange(step.id)}
                className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out
                  ${isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : isCompleted || isPast
                      ? 'bg-primary/10 text-primary border-2 border-primary'
                      : 'bg-white dark:bg-slate-800 text-slate-400 border-2 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'}
                `}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}

                {/* 活跃指示器 - 外圈光环 */}
                {isActive && (
                  <motion.div
                    layoutId="active-step-ring"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="absolute -inset-1.5 rounded-full border-2 border-primary/40"
                  />
                )}
              </motion.button>
              <motion.span
                initial={false}
                animate={{
                  color: isActive ? 'var(--primary)' : '#94a3b8',
                  fontWeight: isActive ? 700 : 500,
                }}
                transition={{ duration: 0.2 }}
                className="text-[11px] font-bold whitespace-nowrap"
              >
                {step.label}
              </motion.span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
