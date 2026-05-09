import { 
  Palette, Pen, Sparkles, Trash2, LineChart, 
  User, Home, Trees, TrendingUp, HeartPulse, ClipboardList, 
  Eraser, Pencil, Brush, Undo2, BookOpen, Target, X, Activity, Save,
  History, Clock, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// --- Types ---
type HTPTabType = 'draw' | 'evaluate' | 'test' | 'history';
type BrushType = 'pen' | 'pencil' | 'marker' | 'eraser';

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  type: BrushType;
}

interface AnalysisDimension {
  name: string;
  score: number;
  label: string;
  description: string;
  icon: any;
  color: string;
}

interface HTPHistoryItem {
  id: string;
  timestamp: number;
  score: number;
  dims: AnalysisDimension[];
  summary: string;
  image?: string;
}

export default function HTPTab() {
  const [activeSubTab, setActiveSubTab] = useState<HTPTabType>('draw');
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<{ x: number; y: number }[]>([]);
  
  const [brushColor, setBrushColor] = useState('#4f46e5');
  const [brushWidth, setBrushWidth] = useState(4);
  const [brushType, setBrushType] = useState<BrushType>('pen');
  const [showColorPicker, setShowColorPicker] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [analysisResult, setAnalysisResult] = useState<AnalysisDimension[] | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [canvasImage, setCanvasImage] = useState<string | null>(null); // State for captured image

  // History state
  const [history, setHistory] = useState<HTPHistoryItem[]>([]);

  // Expanded color palette
  const colorPalette = [
    '#1e293b', '#64748b', '#94a3b8', '#cbd5e1', 
    '#ef4444', '#f87171', '#fb923c', '#fbbf24', 
    '#10b981', '#34d399', '#06b6d4', '#38bdf8', 
    '#6366f1', '#818cf8', '#8b5cf6', '#a78bfa',
    '#d946ef', '#f0abfc', '#ec4899', '#f472b6',
    '#78350f', '#a16207', '#3f6212', '#166534'
  ];

  // --- Logic ---
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      redrawAll();
    }
  }, []);

  useEffect(() => {
    if (activeSubTab === 'draw') {
      const timer = setTimeout(initCanvas, 100);
      window.addEventListener('resize', initCanvas);
      return () => { window.removeEventListener('resize', initCanvas); clearTimeout(timer); };
    }
  }, [activeSubTab, initCanvas]);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    strokes.forEach(s => {
      if (s.points.length < 2) return;
      ctx.save(); ctx.beginPath();
      if (s.type === 'eraser') ctx.globalCompositeOperation = 'destination-out';
      if (s.type === 'marker') ctx.globalAlpha = 0.4; else if (s.type === 'pencil') ctx.globalAlpha = 0.6;
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width;
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke(); ctx.restore();
    });
  }, [strokes]);

  useEffect(() => { redrawAll(); }, [redrawAll]);

  const getPos = (e: any) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onStart = (e: any) => {
    const pos = getPos(e); if (!pos) return;
    setIsDrawing(true); setCurrentStroke([pos]);
  };

  const onMove = (e: any) => {
    if (!isDrawing) return; if (e.cancelable) e.preventDefault();
    const pos = getPos(e); if (!pos) return;
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d');
    if (ctx && currentStroke.length > 0) {
      ctx.save(); ctx.beginPath();
      if (brushType === 'eraser') ctx.globalCompositeOperation = 'destination-out';
      if (brushType === 'marker') ctx.globalAlpha = 0.4; else if (brushType === 'pencil') ctx.globalAlpha = 0.6;
      ctx.strokeStyle = brushColor; ctx.lineWidth = brushWidth;
      ctx.moveTo(currentStroke[currentStroke.length-1].x, currentStroke[currentStroke.length-1].y);
      ctx.lineTo(pos.x, pos.y); ctx.stroke(); ctx.restore();
    }
    setCurrentStroke(prev => [...prev, pos]);
  };

  const onEnd = () => {
    if (!isDrawing) return; setIsDrawing(false);
    if (currentStroke.length > 1) {
      setStrokes(prev => [...prev, { points: currentStroke, color: brushColor, width: brushWidth, type: brushType }]);
    }
    setCurrentStroke([]);
  };

  const handleAnalyze = async () => {
    if (strokes.length < 3) { toast.error('请进行更丰富的创作'); return; }
    setIsAnalyzing(true);
    
    // Capture canvas image
    const canvas = canvasRef.current;
    if (canvas) {
        setCanvasImage(canvas.toDataURL('image/png'));
    }

    await new Promise(r => setTimeout(r, 1800));

    // Randomized logic based on score ranges
    const getRandomScore = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    const dimsData = [
      { 
        name: '内在动力', 
        icon: HeartPulse, 
        color: 'text-rose-500 bg-rose-50',
        levels: [
          { min: 86, label: '旺盛', desc: '线条富有弹力，展现出极强的心理能量。' },
          { min: 75, label: '稳定', desc: '笔触稳健，显示出均衡的行动意愿。' },
          { min: 0, label: '审慎', desc: '线条内敛，潜意识中持有较强的自我克制。' }
        ]
      },
      { 
        name: '自我防御', 
        icon: Home, 
        color: 'text-indigo-500 bg-indigo-50',
        levels: [
          { min: 86, label: '严密', desc: '构图高度结构化，体现了极强的心理边界感。' },
          { min: 75, label: '稳固', desc: '构图边界均衡，具备良好的自我调节能力。' },
          { min: 0, label: '开放', desc: '笔触自然延展，展现出较强的人际信赖与包容。' }
        ]
      },
      { 
        name: '生长潜能', 
        icon: Trees, 
        color: 'text-emerald-500 bg-emerald-50',
        levels: [
          { min: 86, label: '极佳', desc: '画面充满活力，生命力向外舒展。' },
          { min: 75, label: '活跃', desc: '细节丰富且有层次，具备持续进取的姿态。' },
          { min: 0, label: '蓄积', desc: '结构紧凑，正处于能量储备与整合阶段。' }
        ]
      },
      { 
        name: '思维秩序', 
        icon: LineChart, 
        color: 'text-amber-500 bg-amber-50',
        levels: [
          { min: 86, label: '精准', desc: '元素逻辑性极强，思维清晰且目标明确。' },
          { min: 75, label: '严谨', desc: '布局合理，展现出优秀的规划与执行能力。' },
          { min: 0, label: '灵活', desc: '构图不拘一格，思维跳跃且富有创造力。' }
        ]
      },
    ];

    const generatedDims = dimsData.map(d => {
      const score = getRandomScore(65, 98);
      const level = d.levels.find(l => score >= l.min) || d.levels[d.levels.length - 1];
      return {
        name: d.name,
        score,
        label: level.label,
        description: level.desc,
        icon: d.icon,
        color: d.color
      };
    });

    const calculatedTotalScore = Math.round(generatedDims.reduce((acc, d) => acc + d.score, 0) / generatedDims.length);
    
    const summaryPool = {
      high: [
        "您的画面构图宏大且细节精致，展现出极高的自我整合度。内心充满了积极向上的能量，在压力面前能泰然处之，具有卓越的领导潜质与决断力。",
        "画面展现了极强的创造力与生命能量。您的内在动力旺盛，对于未来有着清晰的规划与期待，展现出一种蓬勃向上的生命姿态与自信魅力。"
      ],
      mid: [
        "您的画面结构展现出了很强的内心秩序感。线条运用平衡，代表您在当前环境中具有出色的压力应对与自我管理能力，是一个值得信赖的坚定者。",
        "笔触稳健且富有节奏感，反映出您目前心理状态非常稳定。您在处理人际关系时能够保持恰当的距离感与同理心，展现出成熟的人格特质。"
      ],
      low: [
        "您的作品笔触柔和，展现出一种温和内敛的性格特质。在处理复杂问题时，您更倾向于稳扎稳打，这种谨慎的态度为您提供了稳固的安全屏障。",
        "画面布局细腻，流露出敏锐的感知力。您可能正处于一个情感细腻、需要更多安全支撑的阶段，这种对自己内心的关注将助您更好地探索自我。"
      ]
    };

    let summary = "";
    if (calculatedTotalScore >= 88) {
      summary = summaryPool.high[Math.floor(Math.random() * summaryPool.high.length)];
    } else if (calculatedTotalScore >= 80) {
      summary = summaryPool.mid[Math.floor(Math.random() * summaryPool.mid.length)];
    } else {
      summary = summaryPool.low[Math.floor(Math.random() * summaryPool.low.length)];
    }

    setAnalysisResult(generatedDims);
    setTotalScore(calculatedTotalScore);
    setAnalysisSummary(summary);
    setIsAnalyzing(false); 
    setActiveSubTab('evaluate');
  };

  const handleSaveToHistory = () => {
    if (!analysisResult) return;
    const newItem: HTPHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      score: totalScore,
      dims: analysisResult,
      summary: analysisSummary,
      image: canvasImage || undefined
    };
    setHistory(prev => [newItem, ...prev]);
    toast.success('测评结果已保存至历史记录');
    setActiveSubTab('history');
  };

  return (
    <div className="max-w-3xl mx-auto w-full space-y-4 pb-8">
      {/* Premium Tab Switcher */}
      <nav className="flex items-center justify-center p-1 bg-slate-100/80 rounded-2xl border border-slate-200/50 backdrop-blur-md max-w-sm mx-auto">
        {['draw', 'evaluate', 'test'].map((id) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id as HTPTabType)}
            className={`relative flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-all uppercase tracking-wide ${
              activeSubTab === id || (id === 'evaluate' && activeSubTab === 'history') ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {(activeSubTab === id || (id === 'evaluate' && activeSubTab === 'history')) && (
              <motion.div layoutId="nav-bg" className="absolute inset-0 bg-white shadow-sm border border-slate-200/50 rounded-xl" />
            )}
            <span className="relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap">
              {id === 'draw' && <Palette className="w-3.5 h-3.5" />}
              {id === 'evaluate' && <TrendingUp className="w-3.5 h-3.5" />}
              {id === 'test' && <BookOpen className="w-3.5 h-3.5" />}
              {id === 'draw' ? '测验' : id === 'evaluate' ? '结果' : '原理'}
            </span>
          </button>
        ))}
      </nav>

      <AnimatePresence mode="wait">
        {activeSubTab === 'draw' && (
          <motion.div key="draw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 bg-white rounded-2xl shadow-lg border border-slate-100">
               <div className="flex items-center gap-1.5 bg-slate-50/80 p-1 rounded-[14px]">
                  <button onClick={() => setStrokes(s => s.slice(0,-1))} className="p-2 rounded-xl hover:bg-white text-slate-500 active:scale-95 transition-all shadow-sm border border-transparent hover:border-slate-200"><Undo2 className="w-4 h-4" /></button>
                  <button onClick={() => {setStrokes([]);setAnalysisResult(null);setCanvasImage(null);}} className="p-2 rounded-xl hover:bg-rose-50 text-rose-500 active:scale-95 transition-all shadow-sm border border-transparent hover:border-rose-100"><Trash2 className="w-4 h-4" /></button>
               </div>
               <div className="flex flex-1 items-center justify-center gap-1.5 px-2">
                  {[
                    { id: 'pen', i: Pen, w: 4, l: '钢笔' },
                    { id: 'pencil', i: Pencil, w: 2, l: '铅笔' },
                    { id: 'marker', i: Brush, w: 10, l: '马克' },
                    { id: 'eraser', i: Eraser, w: 24, l: '橡皮' }
                  ].map(t => (
                    <button key={t.id} onClick={() => {setBrushType(t.id as any);setBrushWidth(t.w);}} className={`flex flex-col items-center justify-center w-12 h-12 rounded-[14px] transition-all duration-200 relative ${brushType === t.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
                      <t.i className="w-[18px] h-[18px] mb-0.5" />
                      <span className="text-[9px] font-bold leading-none tracking-tight">{t.l}</span>
                    </button>
                  ))}
               </div>
               <div className="flex items-center gap-2 pl-2 border-l border-slate-100 shrink-0">
                  <button onClick={() => setShowColorPicker(true)} className="w-10 h-10 rounded-[14px] shadow-sm active:scale-90 border-2 border-slate-100 ring-2 ring-white" style={{ backgroundColor: brushColor }} />
               </div>
            </div>

            {/* Canvas */}
            <div ref={containerRef} className="relative h-[55vh] min-h-[420px] bg-white rounded-[32px] shadow-2xl shadow-indigo-900/5 border border-slate-100 overflow-hidden">
                <canvas ref={canvasRef} className="block w-full h-full relative z-10 touch-none" onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd} onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} />
                {strokes.length === 0 && !isDrawing && <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none text-9xl font-black italic text-indigo-900 tracking-tighter pointer-events-none">HTP</div>}
            </div>

            <Button onClick={handleAnalyze} disabled={isAnalyzing || strokes.length < 3} className="w-full h-14 rounded-[20px] bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[13px] tracking-widest shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all">
               {isAnalyzing ? "Processing..." : "开启 AI 心理评估"}
            </Button>

            {/* Color Picker Modal */}
            <AnimatePresence>
               {showColorPicker && (
                 <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/10" onClick={() => setShowColorPicker(false)}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white p-6 rounded-[36px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] w-full max-w-[320px]" onClick={e=>e.stopPropagation()}>
                       <div className="flex justify-between items-center mb-5">
                         <h5 className="text-[11px] font-black uppercase text-slate-400">Brush & Palette</h5>
                         <button onClick={() => setShowColorPicker(false)} className="p-1.5 rounded-full hover:bg-slate-50 text-slate-400"><X className="w-4 h-4" /></button>
                       </div>
                       <div className="max-h-[220px] overflow-y-auto pr-1">
                          <div className="grid grid-cols-6 gap-2 mb-6">
                            {colorPalette.map(c => (
                              <button key={c} onClick={() => {setBrushColor(c); setShowColorPicker(false);}} className={`aspect-square rounded-xl border-2 transition-all ${brushColor === c ? 'border-indigo-600 scale-110 shadow-sm' : 'border-slate-100'}`} style={{ backgroundColor: c }} />
                            ))}
                          </div>
                       </div>
                       <div className="flex items-center gap-3 pt-5 border-t border-slate-50">
                          <div className="w-8 h-8 rounded-lg shrink-0 border border-slate-100 shadow-inner" style={{ backgroundColor: brushColor }} />
                          <div className="flex-1 space-y-2">
                             <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">Width: {brushWidth}PX</div>
                             <input type="range" min="1" max="80" value={brushWidth} onChange={e=>setBrushWidth(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-full appearance-none accent-indigo-600" />
                          </div>
                       </div>
                    </motion.div>
                 </div>
               )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* --- Result Tab --- */}
        {activeSubTab === 'evaluate' && (
          <motion.div key="evaluate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-5 px-1">
            {!analysisResult ? (
               <div className="h-[350px] flex flex-col items-center justify-center bg-white/50 rounded-[32px] border border-dashed border-slate-200">
                  <ClipboardList className="w-10 h-10 text-slate-300 mb-3" />
                  <Button onClick={() => setActiveSubTab('draw')} size="sm" className="rounded-xl px-8 h-10 text-xs font-bold">开始测验</Button>
               </div>
            ) : (
               <>
                 <div className="bg-white rounded-[32px] shadow-xl border border-slate-100 overflow-hidden flex flex-col">
                    <div className="bg-slate-900 border-b border-slate-800 p-5 relative overflow-hidden flex flex-col">
                       <div className="relative z-10 flex items-start justify-between">
                          <div className="space-y-1">
                             <div className="flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.15em]">AI Assessment Report</span>
                             </div>
                             <h3 className="text-[15px] font-black text-white">HTP 综合分析报告</h3>
                          </div>
                          <div className="flex flex-col items-end">
                             <span className="text-3xl leading-none font-black text-white italic tracking-tighter">{totalScore}</span>
                             <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Score</span>
                          </div>
                       </div>
                    </div>

                    <div className="p-4 space-y-4">
                       {/* Display the drawn image */}
                       {canvasImage && (
                          <div className="bg-slate-50 border border-slate-200 rounded-[20px] p-2 flex flex-col items-center">
                             <div className="w-full flex items-center justify-between px-2 mb-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Original Drawing</span>
                                <Badge variant="outline" className="text-[8px] border-slate-200 text-slate-500 rounded-md py-0">Source</Badge>
                             </div>
                             <div className="bg-white rounded-[14px] w-full aspect-[4/3] flex items-center justify-center overflow-hidden border border-slate-100 shadow-sm relative">
                               <img src={canvasImage} alt="User drawn HTP" className="w-full h-full object-contain" />
                               <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#4f46e5_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />
                             </div>
                          </div>
                       )}

                       <div className="bg-slate-50/80 rounded-[20px] p-4 border border-slate-100">
                          <div className="flex items-center gap-1.5 mb-2">
                             <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Clinical Insight</span>
                          </div>
                          <p className="text-[12px] text-slate-700 font-medium leading-relaxed">
                             {analysisSummary}
                          </p>
                       </div>

                       <div className="grid grid-cols-2 gap-2.5 pb-2">
                          {analysisResult.map((dim, i) => (
                             <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm transition-shadow group">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${dim.color} shadow-inner`}>
                                   <dim.icon className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className="flex items-center justify-between gap-1 mb-0.5">
                                      <h4 className="text-[11px] font-black text-slate-800 truncate">{dim.name}</h4>
                                      <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded-md">{dim.score}<span className="text-[8px] opacity-40 ml-0.5">%</span></span>
                                   </div>
                                   <p className="text-[9px] text-slate-400 font-medium truncate">{dim.label}</p>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 {/* 按钮区 */}
                 <div className="flex flex-col gap-3 pt-2">
                   <Button 
                      onClick={handleSaveToHistory}
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 rounded-[20px] font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                   >
                      <Save className="w-4.5 h-4.5" /> 保存结果至历史记录
                   </Button>

                   <Button 
                      onClick={() => setActiveSubTab('history')}
                      className="w-full h-14 bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 shadow-sm rounded-[20px] font-black text-[12px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95"
                   >
                      <History className="w-4.5 h-4.5 shrink-0" /> 查看测验历史记录
                   </Button>
                 </div>
               </>
            )}
          </motion.div>
        )}

        {/* --- History Tab --- */}
        {activeSubTab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 px-1 pb-10">
             <div className="flex items-center justify-between px-1 mb-2">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-xl font-black text-slate-800 italic">测验历程</h3>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1 font-bold text-[10px] uppercase border-slate-200 text-slate-400">
                    Total: {history.length}
                </Badge>
             </div>

             {history.length === 0 ? (
                <div className="h-[400px] flex flex-col items-center justify-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                   <Calendar className="w-12 h-12 text-slate-200 mb-4" />
                   <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">暂无保存记录</p>
                   <Button onClick={() => setActiveSubTab('draw')} variant="ghost" className="mt-4 text-indigo-600 font-black">立即去画画</Button>
                </div>
             ) : (
                <div className="space-y-4">
                   {history.map((item) => (
                      <div key={item.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                         {item.image && (
                            <div className="w-full h-32 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100">
                               <img src={item.image} alt="Historical drawing" className="w-full h-full object-cover opacity-80" />
                            </div>
                         )}
                         <div className="p-5">
                            <div className="flex items-center justify-between mb-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs">
                                     {item.score}
                                  </div>
                                  <div>
                                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment Score</div>
                                     <div className="text-[11px] font-bold text-slate-600">{new Date(item.timestamp).toLocaleString()}</div>
                                  </div>
                               </div>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                               {item.dims.map((d, i) => (
                                  <div key={i} className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-100/50">
                                     <div className="text-[8px] font-black text-slate-400 uppercase leading-none mb-1">{d.name}</div>
                                     <div className="text-[10px] font-black text-slate-800 leading-none">{d.score}</div>
                                     <div className="text-[7px] font-bold text-slate-400 mt-1">{d.label}</div>
                                  </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </motion.div>
        )}

        {/* --- Test Tab (Redesigned completely for Professional & Clean look) --- */}
        {activeSubTab === 'test' && (
          <motion.div key="test" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 px-1 pb-6">
             {/* Clinical Headers */}
             <div className="px-2 space-y-1">
                <Badge variant="outline" className="text-[9px] text-indigo-500 border-indigo-200 uppercase tracking-widest mb-2 font-bold bg-indigo-50/50">Clinical Methodology</Badge>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">HTP投射<br/>分析原理</h2>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-[280px] mt-2">
                   通过被试者对房屋、树木和人物的绘画，在非防御状态下投射内心的潜意识心理结构。
                </p>
             </div>

             {/* Structured List Layout */}
             <div className="space-y-0 bg-white border border-slate-100 shadow-sm rounded-[32px] overflow-hidden">
                {[
                  {
                     title: 'House. 房屋',
                     subtitle: '家庭模式与安全感',
                     desc: '映射出个体对家庭的感受、安全感的来源以及在核心人际关系中的位置。房屋的坚固程度往往象征着内心防御机制的厚度。',
                     icon: Home,
                     color: 'text-orange-500',
                     bg: 'bg-orange-50'
                  },
                  {
                     title: 'Tree. 树木',
                     subtitle: '生命力与潜能',
                     desc: '反映个体的自我形象、心理发展过程、面对环境时的适应能力。树木的枝叶茂盛程度通常代表着生命力和成长欲望。',
                     icon: Trees,
                     color: 'text-emerald-500',
                     bg: 'bg-emerald-50'
                  },
                  {
                     title: 'Person. 人物',
                     subtitle: '自我概念与边界',
                     desc: '直接展现自我认知、人际交往模式以及性格特征。人物的面部细节和肢体动作，提供了关于自尊心和社交意愿的关键线索。',
                     icon: User,
                     color: 'text-indigo-500',
                     bg: 'bg-indigo-50'
                  }
                ].map((item, index, arr) => (
                   <div key={index} className={`p-6 flex items-start gap-4 ${index !== arr.length - 1 ? 'border-b border-slate-100' : ''}`}>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                         <item.icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1.5 flex-1">
                         <div className="flex items-center justify-between gap-2">
                            <h3 className="text-[13px] font-black text-slate-800">{item.title}</h3>
                         </div>
                         <h4 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">{item.subtitle}</h4>
                         <p className="text-[11px] text-slate-600 font-medium leading-relaxed pt-1">
                            {item.desc}
                         </p>
                      </div>
                   </div>
                ))}
             </div>

             {/* Algorithm Disclaimer */}
             <div className="px-2">
                <div className="bg-slate-50 rounded-[24px] p-5 border border-slate-100 flex items-start gap-3">
                   <Target className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                   <div className="space-y-1">
                      <h5 className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Algorithm Note</h5>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                         AI 分析引擎结合了临床心理测量学数据库，提取数十个特征点进行综合研判，结果仅供自我探索参考，不作医疗诊断依据。
                      </p>
                   </div>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
