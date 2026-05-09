import { Activity, Eye, Key, Mic, Search, FileText, Video, MessageSquare, ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getAllProfiles, getAssessments, getEmotionDiaries } from '@/db/api';
import type { Profile } from '@/types';
import VerificationCodeManager from '@/components/doctor/VerificationCodeManager';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell
} from 'recharts';

// ==================== 子组件 ====================

// 量表评估报告面板
function ScaleReportPanel({ assessments }: { assessments: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getRiskColor = (level: number) => {
    if (level >= 80) return 'bg-rose-500 text-white';
    if (level >= 60) return 'bg-orange-500 text-white';
    if (level >= 40) return 'bg-amber-500 text-white';
    return 'bg-emerald-500 text-white';
  };
  const getRiskText = (level: number) => {
    if (level >= 80) return '极高风险';
    if (level >= 60) return '高风险';
    if (level >= 40) return '中风险';
    return '低风险';
  };

  const scaleAssessments = assessments.filter(a =>
    a.report?.scaleData || a.assessment_type?.includes('scale') || a.assessment_type?.includes('fusion')
  );

  if (scaleAssessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <FileText className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">暂无量表评估记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scaleAssessments.map((assessment) => {
        const scaleData = assessment.report?.scaleData;
        const score = scaleData?.score ?? scaleData?.phq9_score ?? assessment.score ?? 0;
        const riskLevel = assessment.risk_level ?? 0;
        const dimensionScores = scaleData?.dimensionScores || [];
        const isExpanded = expandedId === assessment.id;

        const chartData = [
          { name: '无抑郁', min: 0, max: 4, fill: '#10B981', current: score <= 4 ? score : 0 },
          { name: '轻度', min: 5, max: 9, fill: '#3B82F6', current: score > 4 && score <= 9 ? score : 0 },
          { name: '中度', min: 10, max: 14, fill: '#F59E0B', current: score > 9 && score <= 14 ? score : 0 },
          { name: '中重度', min: 15, max: 19, fill: '#F97316', current: score > 14 && score <= 19 ? score : 0 },
          { name: '重度', min: 20, max: 27, fill: '#EF4444', current: score > 19 ? score : 0 },
        ];

        return (
          <div key={assessment.id} className="border border-border rounded-xl overflow-hidden bg-card">
            {/* 头部 */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : assessment.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {assessment.assessment_type === 'fusion_report' ? '多模态融合评估' : (assessment.assessment_type || 'PHQ-9量表评估')}
                    </span>
                    <Badge className={`text-[10px] px-2 py-0.5 ${getRiskColor(riskLevel)}`}>
                      {getRiskText(riskLevel)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(assessment.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-black text-slate-800">{score}</div>
                  <div className="text-[10px] text-muted-foreground">/ 27分</div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {/* 展开详情 */}
            {isExpanded && (
              <div className="border-t border-border p-4 space-y-4 bg-slate-50/50">
                {/* 风险分布图 */}
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                  <h5 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-500" />
                    PHQ-9 风险等级分布
                  </h5>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 2, right: 20, left: 10, bottom: 2 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" domain={[0, 27]} hide />
                        <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 10, fill: '#64748b' }} />
                        <Tooltip content={({ active, payload }) => {
                          if (active && payload?.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-2 border border-slate-200 shadow rounded-lg text-xs">
                                <p className="font-bold">{d.name}: {d.min}–{d.max}分</p>
                                {d.current > 0 && <p className="text-blue-600">当前: {d.current}分</p>}
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Bar dataKey="max" radius={[0, 4, 4, 0]} barSize={16} background={{ fill: '#f8fafc' }}>
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={entry.current > 0 ? entry.fill : '#e2e8f0'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center mt-1">当前所处阶段高亮显示</p>
                </div>

                {/* 各维度得分 */}
                {dimensionScores.length > 0 && (
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <h5 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-blue-500" />
                      各维度得分详情
                    </h5>
                    <div className="grid grid-cols-3 gap-2">
                      {dimensionScores.map((dim: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                          <div className="text-[10px] text-slate-500 mb-1">{dim.label}</div>
                          <div className="flex items-baseline gap-1">
                            <span className={`text-base font-bold ${dim.score >= 2 ? 'text-amber-500' : dim.score >= 1 ? 'text-blue-500' : 'text-emerald-500'}`}>
                              {dim.score}
                            </span>
                            <span className="text-[10px] text-slate-400">/ {dim.max ?? 3}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 报告结论 */}
                {assessment.report?.content && (
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <h5 className="text-xs font-bold text-slate-600 mb-2">评估结论</h5>
                    <p className="text-sm text-slate-600 leading-relaxed">{assessment.report.content}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 语音情绪报告面板
function VoiceReportPanel({ assessments }: { assessments: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const voiceAssessments = assessments.filter(a =>
    a.report?.voiceData || a.assessment_type?.includes('voice')
  );

  if (voiceAssessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Mic className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">暂无语音情绪分析记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {voiceAssessments.map((assessment) => {
        const voiceData = assessment.report?.voiceData;
        const score = voiceData?.score ?? voiceData?.emotion_score ?? voiceData?.risk_score ?? 0;
        const isExpanded = expandedId === assessment.id;

        const emotions = voiceData?.emotions || {};
        const radarData = [
          { subject: '平静', A: Math.round((emotions.calm ?? 0.45) * 100) },
          { subject: '开心', A: Math.round((emotions.happy ?? 0.15) * 100) },
          { subject: '悲伤', A: Math.round((emotions.sad ?? 0.20) * 100) },
          { subject: '愤怒', A: Math.round((emotions.angry ?? 0.08) * 100) },
          { subject: '恐惧', A: Math.round((emotions.fear ?? 0.07) * 100) },
          { subject: '惊讶', A: Math.round((emotions.surprise ?? 0.05) * 100) },
        ];

        const acousticFeatures = [
          { label: '语速', value: voiceData?.speech_rate ?? 142, unit: '词/分', status: '偏慢', color: 'text-amber-500' },
          { label: '音调变化', value: voiceData?.pitch_variation ?? 68, unit: '%', status: '正常', color: 'text-emerald-500' },
          { label: '音量稳定性', value: voiceData?.volume_stability ?? 75, unit: '%', status: '良好', color: 'text-emerald-500' },
          { label: '停顿频率', value: voiceData?.pause_frequency ?? 12, unit: '次/分', status: '偏高', color: 'text-amber-500' },
        ];

        return (
          <div key={assessment.id} className="border border-border rounded-xl overflow-hidden bg-card">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : assessment.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                  <Mic className="w-4 h-4 text-violet-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">语音情绪分析</span>
                    <Badge className={`text-[10px] px-2 py-0.5 ${score > 60 ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}`}>
                      {score > 60 ? '情绪波动' : '情绪平稳'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(assessment.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-black text-slate-800">{score}</div>
                  <div className="text-[10px] text-muted-foreground">/ 100</div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border p-4 space-y-4 bg-slate-50/50">
                {/* 声学特征 */}
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                  <h5 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-violet-500" />
                    声学特征指标
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    {acousticFeatures.map((f, i) => (
                      <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs text-slate-500">{f.label}</span>
                          <span className={`text-xs font-medium ${f.color}`}>{f.status}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-slate-800">{f.value}</span>
                          <span className="text-[10px] text-slate-400">{f.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6维语音情绪雷达图 */}
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                  <h5 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-violet-500" />
                    6维语音情绪雷达图
                  </h5>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#64748b' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="情绪值" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.55} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => `${v}%`} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* 情绪说明 */}
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {radarData.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
                        <span className="text-[10px] text-slate-600">{d.subject}: <b>{d.A}%</b></span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 语音分析结论 */}
                {voiceData?.analysis && (
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <h5 className="text-xs font-bold text-slate-600 mb-2">分析结论</h5>
                    <p className="text-sm text-slate-600 leading-relaxed">{voiceData.analysis}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 表情识别报告面板
function ExpressionReportPanel({ assessments }: { assessments: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const expressionAssessments = assessments.filter(a =>
    a.report?.expressionData || a.assessment_type?.includes('expression') || a.assessment_type?.includes('fusion')
  );

  if (expressionAssessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Video className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">暂无表情识别分析记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {expressionAssessments.map((assessment) => {
        const exprData = assessment.report?.expressionData;
        const score = exprData?.depression_risk_score ?? exprData?.risk_score ?? 0;
        const isExpanded = expandedId === assessment.id;

        const facial = exprData?.facial_expressions || {};
        const microFeatures = exprData?.micro_features || {};

        const emotionBars = [
          { label: '中性', value: Math.round((facial.neutral ?? 0.40) * 100), color: 'bg-slate-400', icon: '😐' },
          { label: '高兴', value: Math.round((facial.happy ?? 0.15) * 100), color: 'bg-amber-400', icon: '😊' },
          { label: '悲伤', value: Math.round((facial.sad ?? 0.25) * 100), color: 'bg-blue-500', icon: '😢' },
          { label: '愤怒', value: Math.round((facial.angry ?? 0.05) * 100), color: 'bg-rose-500', icon: '😠' },
          { label: '惊讶', value: Math.round((facial.surprised ?? 0.05) * 100), color: 'bg-cyan-400', icon: '😲' },
          { label: '恐惧', value: Math.round((facial.fearful ?? 0.05) * 100), color: 'bg-purple-500', icon: '😰' },
          { label: '厌恶', value: Math.round((facial.disgusted ?? 0.02) * 100), color: 'bg-green-500', icon: '🤢' },
          { label: '轻蔑', value: Math.round((facial.contempt ?? 0.02) * 100), color: 'bg-orange-400', icon: '😏' },
          { label: '痛苦', value: Math.round((facial.pain ?? 0.01) * 100), color: 'bg-red-600', icon: '😣' },
        ];

        const amplify = (v: number) => Math.min(100, Math.max(20, Math.round((v || 0.1) * 120)));
        const radarData = [
          { subject: '中性', A: amplify(facial.neutral ?? 0.40) },
          { subject: '高兴', A: amplify(facial.happy ?? 0.15) },
          { subject: '悲伤', A: amplify(facial.sad ?? 0.25) },
          { subject: '愤怒', A: amplify(facial.angry ?? 0.05) },
          { subject: '惊讶', A: amplify(facial.surprised ?? 0.05) },
          { subject: '恐惧', A: amplify(facial.fearful ?? 0.05) },
          { subject: '厌恶', A: amplify(facial.disgusted ?? 0.02) },
          { subject: '轻蔑', A: amplify(facial.contempt ?? 0.02) },
          { subject: '痛苦', A: amplify(facial.pain ?? 0.01) },
        ];

        return (
          <div key={assessment.id} className="border border-border rounded-xl overflow-hidden bg-card">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : assessment.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <Video className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">表情识别分析</span>
                    <Badge className={`text-[10px] px-2 py-0.5 ${score > 60 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                      {score > 60 ? '风险较高' : '风险较低'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(assessment.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xl font-black text-slate-800">{score}</div>
                  <div className="text-[10px] text-muted-foreground">/ 100</div>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border p-4 space-y-4 bg-slate-50/50">
                {/* 微表情特征 */}
                {(microFeatures.brow_furrow || microFeatures.mouth_droop || microFeatures.eye_contact) && (
                  <div className="bg-white rounded-xl p-4 border border-slate-100">
                    <h5 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-500" />
                      微表情特征分析
                    </h5>
                    <div className="space-y-2.5">
                      {[
                        { label: '眉心皱纹', value: microFeatures.brow_furrow, icon: '👁️' },
                        { label: '嘴角形态', value: microFeatures.mouth_droop, icon: '👄' },
                        { label: '眼神接触', value: microFeatures.eye_contact, icon: '👀' },
                      ].filter(f => f.value).map((f, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex items-start gap-3">
                          <span className="text-lg">{f.icon}</span>
                          <div>
                            <div className="text-[10px] text-slate-500 mb-0.5">{f.label}</div>
                            <div className="text-sm font-medium text-slate-700">{f.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 面部表情占比 */}
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                  <h5 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-500" />
                    面部表情分布
                  </h5>
                  <div className="space-y-2.5">
                    {emotionBars.map((e) => (
                      <div key={e.label} className="flex items-center gap-2.5">
                        <span className="text-base">{e.icon}</span>
                        <span className="text-xs text-slate-600 w-10">{e.label}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${e.color} rounded-full transition-all duration-500`} style={{ width: `${e.value}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-8 text-right">{e.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 9维情绪雷达图 */}
                <div className="bg-white rounded-xl p-4 border border-slate-100">
                  <h5 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-500" />
                    9维表情雷达图
                  </h5>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="情绪概率" dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => `${v}%`} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 量表对话记录面板
function ConversationPanel({ assessments }: { assessments: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const assessmentsWithHistory = assessments.filter(a =>
    a.conversation_history && a.conversation_history.length > 0
  );

  if (assessmentsWithHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <MessageSquare className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">暂无量表对话记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assessmentsWithHistory.map((assessment) => {
        const history: any[] = assessment.conversation_history || [];
        const isExpanded = expandedId === assessment.id;
        // 过滤掉 system 消息，只展示 user 和 assistant
        const dialogHistory = history.filter((m: any) => m.role !== 'system');

        return (
          <div key={assessment.id} className="border border-border rounded-xl overflow-hidden bg-card">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : assessment.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">
                      {assessment.assessment_type === 'fusion_report' ? '多模态评估对话' : `量表评估对话`}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                      {dialogHistory.length} 条消息
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(assessment.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border bg-slate-50/50">
                <div className="p-4 space-y-3">
                  {dialogHistory.map((msg: any, idx: number) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-br-none'
                            : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Brain className="w-3 h-3 text-indigo-500" />
                            <span className="text-[10px] font-semibold text-indigo-500">AI评估助手</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{
                          typeof msg.content === 'string'
                            ? msg.content
                            : Array.isArray(msg.content)
                              ? msg.content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('')
                              : JSON.stringify(msg.content)
                        }</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-3 text-[10px] text-muted-foreground text-center">
                  共 {dialogHistory.length} 条对话记录 · AI评估助手与用户的完整交互过程
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==================== 主页面 ====================

export default function PatientsPage() {
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null);
  const [patientDetails, setPatientDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [codeManagerOpen, setCodeManagerOpen] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const profiles = await getAllProfiles();
      setPatients(profiles);
    } catch (error) {
      console.error('加载用户失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDetails = async (patient: Profile) => {
    setSelectedPatient(patient);
    setDetailsDialogOpen(true);
    setPatientDetails(null);
    setLoadingDetails(true);
    try {
      const [diaries, assessments] = await Promise.all([
        getEmotionDiaries(patient.id, 30),
        getAssessments(patient.id, 20),
      ]);
      setPatientDetails({ diaries, assessments });
    } catch (error) {
      console.error('加载患者详情失败:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const assessments = patientDetails?.assessments ?? [];

  // 统计信息
  const scaleCount = useMemo(() => assessments.filter((a: any) => a.report?.scaleData || a.assessment_type?.includes('fusion')).length, [assessments]);
  const voiceCount = useMemo(() => assessments.filter((a: any) => a.report?.voiceData).length, [assessments]);
  const expressionCount = useMemo(() => assessments.filter((a: any) => a.report?.expressionData).length, [assessments]);
  const conversationCount = useMemo(() => assessments.filter((a: any) => a.conversation_history?.length > 0).length, [assessments]);

  return (
    <div className="space-y-6">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">用户管理</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">查看和管理用户信息</p>
      </div>

      {/* 搜索 */}
      <div className="flex gap-2 px-1">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="搜索姓名或用户名..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 md:h-10 rounded-xl"
          />
        </div>
        <Button
          variant="outline"
          className="h-11 md:h-10 rounded-xl"
          onClick={() => setCodeManagerOpen(true)}
        >
          <Key className="w-4 h-4 mr-2" />
          验证码管理
        </Button>
      </div>

      {/* 用户列表 */}
      <Card className="border-0 md:border shadow-sm">
        <CardHeader className="px-4 md:px-6">
          <CardTitle className="text-lg md:text-xl">用户列表 ({filteredPatients.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 bg-muted rounded-xl" />
              ))}
            </div>
          ) : filteredPatients.length > 0 ? (
            <div className="space-y-3">
              {filteredPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-xl hover:border-primary/50 hover:bg-accent/50 transition-all gap-4"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 md:w-10 md:h-10">
                      <AvatarImage src={patient.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {patient.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {patient.full_name || patient.username}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-medium bg-muted">
                          @{patient.username}
                        </Badge>
                        {patient.role === 'doctor' && (
                          <Badge className="text-[10px] font-medium bg-emerald-100 text-emerald-700 border-emerald-200">医生</Badge>
                        )}
                        {patient.role === 'admin' && (
                          <Badge className="text-[10px] font-medium bg-purple-100 text-purple-700 border-purple-200">管理员</Badge>
                        )}
                        {patient.role === 'user' && (
                          <Badge className="text-[10px] font-medium bg-blue-100 text-blue-700 border-blue-200">用户</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        {patient.gender && <span>{patient.gender}</span>}
                        {patient.gender && <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />}
                        <span>注册于 {new Date(patient.created_at).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto h-10 sm:h-9 rounded-lg"
                    onClick={() => loadPatientDetails(patient)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    查看详情
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>未找到用户</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 用户详情对话框 */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] md:w-full max-h-[92vh] overflow-y-auto flex flex-col p-0 rounded-2xl gap-0">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
            <DialogTitle className="text-xl">用户详情</DialogTitle>
          </DialogHeader>

          {selectedPatient && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* 基本信息 */}
              <div className="flex items-center gap-4 px-5 py-4 bg-muted/30 flex-shrink-0">
                <Avatar className="w-14 h-14 border-2 border-white shadow-sm">
                  <AvatarImage src={selectedPatient.avatar_url} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {selectedPatient.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold truncate">
                      {selectedPatient.full_name || selectedPatient.username}
                    </h3>
                    {selectedPatient.role === 'doctor' && <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">医生</Badge>}
                    {selectedPatient.role === 'admin' && <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">管理员</Badge>}
                    {selectedPatient.role === 'user' && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">用户</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">@{selectedPatient.username}</p>
                </div>
              </div>

              {/* 统计概览 */}
              <div className="grid grid-cols-4 gap-2 px-5 py-3 flex-shrink-0 border-b border-border">
                <div className="text-center">
                  <div className="text-lg font-black text-blue-600">{patientDetails?.diaries?.length ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">情绪日记</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-purple-600">{assessments.length}</div>
                  <div className="text-[10px] text-muted-foreground">评估总数</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-cyan-600">{expressionCount + voiceCount}</div>
                  <div className="text-[10px] text-muted-foreground">多模态报告</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-black text-indigo-600">{conversationCount}</div>
                  <div className="text-[10px] text-muted-foreground">对话记录</div>
                </div>
              </div>

              {/* Tabs 内容 */}
              {loadingDetails ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="space-y-3 w-full px-5 py-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
                  </div>
                </div>
              ) : (
                <Tabs defaultValue="scale" className="flex-1 flex flex-col">
                  <TabsList className="mx-5 mt-3 mb-0 flex-shrink-0 grid grid-cols-4 h-10">
                    <TabsTrigger value="scale" className="text-xs gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      量表评估
                      {scaleCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{scaleCount}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="voice" className="text-xs gap-1.5">
                      <Mic className="w-3.5 h-3.5" />
                      语音情绪
                      {voiceCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{voiceCount}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="expression" className="text-xs gap-1.5">
                      <Video className="w-3.5 h-3.5" />
                      表情识别
                      {expressionCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{expressionCount}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="conversation" className="text-xs gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      对话记录
                      {conversationCount > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 ml-0.5">{conversationCount}</Badge>}
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-3">
                    <TabsContent value="scale" className="m-0">
                      <div className="overflow-y-auto max-h-[52vh] px-5 pb-5">
                        <ScaleReportPanel assessments={assessments} />
                      </div>
                    </TabsContent>
                    <TabsContent value="voice" className="m-0">
                      <div className="overflow-y-auto max-h-[52vh] px-5 pb-5">
                        <VoiceReportPanel assessments={assessments} />
                      </div>
                    </TabsContent>
                    <TabsContent value="expression" className="m-0">
                      <div className="overflow-y-auto max-h-[52vh] px-5 pb-5">
                        <ExpressionReportPanel assessments={assessments} />
                      </div>
                    </TabsContent>
                    <TabsContent value="conversation" className="m-0">
                      <div className="overflow-y-auto max-h-[52vh] px-5 pb-5">
                        <ConversationPanel assessments={assessments} />
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 验证码管理对话框 */}
      <VerificationCodeManager open={codeManagerOpen} onOpenChange={setCodeManagerOpen} />
    </div>
  );
}
