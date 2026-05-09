import { ChevronLeft, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HTPTab from '@/components/healing/HTPTab';
import { Button } from '@/components/ui/button';

export default function HTPEvaluationPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white">房树人心理测评</h1>
          </div>
          
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <main className="max-w-3xl mx-auto p-4">
        <HTPTab />
      </main>
    </div>
  );
}
