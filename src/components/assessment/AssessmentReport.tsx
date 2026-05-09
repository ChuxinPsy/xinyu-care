import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Activity, AlertTriangle, Download, TrendingUp } from 'lucide-react';
import { useRef } from 'react';
import { CartesianGrid, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AssessmentReportProps {
  assessment: {
    id: string;
    created_at: string;
    risk_level: number;
    score: number;
    report?: {
      content: string;
      recommendations: string[];
      generated_at: string;
    };
    ai_analysis?: {
      multimodal_scores?: {
        text: number;
        image: number;
        voice: number;
        video: number;
      };
      fused_score?: number;
      symptoms?: Record<string, number>;
      modalities_used?: number;
    };
  };
  historicalData?: Array<{
    date: string;
    score: number;
    risk_level: number;
  }>;
  onClose?: () => void;
}

export default function AssessmentReport({ assessment, historicalData = [], onClose }: AssessmentReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  // 症状雷达图数据
  const symptomsData = assessment.ai_analysis?.symptoms
    ? Object.entries(assessment.ai_analysis.symptoms).map(([name, value]) => ({
        symptom: name,
        score: value,
        fullMark: 10,
      }))
    : [];

  // 多模态分数数据
  const modalityData = assessment.ai_analysis?.multimodal_scores
    ? [
        { name: '文本分析', score: assessment.ai_analysis.multimodal_scores.text },
        { name: '图片分析', score: assessment.ai_analysis.multimodal_scores.image },
        { name: '语音分析', score: assessment.ai_analysis.multimodal_scores.voice },
        { name: '视频分析', score: assessment.ai_analysis.multimodal_scores.video },
      ].filter(item => item.score > 0)
    : [];

  // 历史趋势数据
  const trendData = historicalData.map(item => ({
    date: new Date(item.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
    评分: item.score,
    风险等级: item.risk_level,
  }));

  // 风险等级颜色
  const getRiskColor = (level: number) => {
    if (level >= 8) return 'destructive';
    if (level >= 5) return 'default';
    return 'secondary';
  };

  // 导出PDF
  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`心理评估报告_${new Date().toLocaleDateString('zh-CN')}.pdf`);
    } catch (error) {
      console.error('导出PDF失败:', error);
    }
  };

  // 导出PNG
  const handleExportPNG = async () => {
    if (!reportRef.current) return;

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `心理评估报告_${new Date().toLocaleDateString('zh-CN')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('导出PNG失败:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">心理评估报告</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPNG}>
            <Download className="w-4 h-4 mr-1" />
            导出PNG
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-1" />
            导出PDF
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              关闭
            </Button>
          )}
        </div>
      </div>

      {/* 报告内容 */}
      <div ref={reportRef} className="space-y-6 bg-background p-6 rounded-lg">
        {/* 标题和基本信息 */}
        <div className="text-center space-y-2 pb-4 border-b border-border">
          <h1 className="text-3xl font-bold">心域智护心理评估报告</h1>
          <p className="text-muted-foreground">
            评估时间: {new Date(assessment.created_at).toLocaleString('zh-CN')}
          </p>
        </div>

        {/* 综合评分卡片 */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">综合评分</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{assessment.score}/100</div>
              <p className="text-xs text-muted-foreground mt-1">分数越高状态越好</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">风险等级</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Badge variant={getRiskColor(assessment.risk_level)} className="text-lg px-3 py-1">
                  {assessment.risk_level}/10
                </Badge>
                {assessment.risk_level >= 7 && (
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {assessment.risk_level >= 8 ? '高风险' : assessment.risk_level >= 5 ? '中风险' : '低风险'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">分析模态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {assessment.ai_analysis?.modalities_used || 1}
              </div>
              <p className="text-xs text-muted-foreground mt-1">种数据来源</p>
            </CardContent>
          </Card>
        </div>

        {/* 多模态分数对比 */}
        {modalityData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>多模态情绪分析</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={modalityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>融合分数: {assessment.ai_analysis?.fused_score?.toFixed(2)}/10</p>
                <p className="mt-1">通过多模态数据融合,提升评估准确性</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 多维症状雷达图 */}
        {symptomsData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>多维症状分析</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={symptomsData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="symptom" />
                  <PolarRadiusAxis domain={[0, 10]} />
                  <Radar
                    name="症状评分"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 历史趋势对比 */}
        {trendData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>历史趋势对比</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="评分"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="风险等级"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 详细评估报告 */}
        {assessment.report && (
          <Card>
            <CardHeader>
              <CardTitle>详细评估分析</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {assessment.report.content}
                </p>
              </div>

              {assessment.report.recommendations && assessment.report.recommendations.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold mb-3 flex items-center">
                    <Activity className="w-4 h-4 mr-2 text-primary" />
                    改善建议
                  </h4>
                  <ul className="space-y-2">
                    {assessment.report.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                          {index + 1}
                        </span>
                        <span className="text-sm text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 高风险提示 */}
        {assessment.risk_level >= 7 && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="w-5 h-5 mr-2" />
                重要提示
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                您的评估结果显示存在较高风险,建议尽快寻求专业心理医生的帮助。
                心域智护可以为您对接专业医生,提供及时的心理支持和治疗方案。
              </p>
              <Button className="mt-4" variant="destructive">
                立即联系医生
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 报告说明 */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t border-border">
          <p>本报告由心域智护（XinyuCare）系统生成,仅供参考,不能替代专业医疗诊断</p>
          <p className="mt-1">如有疑问,请咨询专业心理医生</p>
          <p className="mt-2">© 2026 心域智护（XinyuCare）</p>
        </div>
      </div>
    </div>
  );
}
