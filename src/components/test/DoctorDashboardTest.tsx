import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateMockAlerts, generateEmotionTrendData, generateAssessmentDistribution } from '@/utils/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, Activity, RefreshCw } from 'lucide-react';

export default function DoctorDashboardTest() {
  const [alerts, setAlerts] = useState(() => generateMockAlerts(10));
  const [emotionData, setEmotionData] = useState(() => generateEmotionTrendData());
  const [assessmentData, setAssessmentData] = useState(() => generateAssessmentDistribution());

  const refreshData = () => {
    setAlerts(generateMockAlerts(10));
    setEmotionData(generateEmotionTrendData());
    setAssessmentData(generateAssessmentDistribution());
  };

  const getRiskLevelColor = (level: number) => {
    if (level >= 8) return 'destructive';
    if (level >= 5) return 'default';
    return 'secondary';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              医生端数据看板测试
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              模拟数据展示和功能测试
            </p>
          </div>
          <Button onClick={refreshData} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            刷新数据
          </Button>
        </div>

        {/* 图表展示 */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          {/* 情绪趋势图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                情绪趋势 (30天)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={emotionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                    <XAxis 
                      dataKey="label" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={[1, 5]} 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: any) => [`${value}分`, '情绪评分']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* 评估分布图 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                评估分布
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assessmentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {assessmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                      formatter={(value: any) => [`${value}次`, '评估次数']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {assessmentData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 预警消息展示 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              最近预警消息
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-xl hover:border-primary/50 transition-colors bg-gradient-to-r from-background to-muted/30"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge 
                        variant={getRiskLevelColor(alert.risk_level)}
                        className="text-xs"
                      >
                        风险等级 {alert.risk_level}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {alert.alert_type}
                      </Badge>
                      {alert.is_handled && (
                        <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 text-xs">
                          已处理
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-foreground">
                        {(alert as any).profiles?.full_name || '未知患者'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      {alert.description}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 功能说明 */}
        <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-100">
              新增功能说明
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  📊 数据可视化
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• 情绪趋势折线图（30天数据）</li>
                  <li>• 评估分布饼图（各类型评估统计）</li>
                  <li>• 响应式图表设计</li>
                  <li>• 交互式数据提示</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  🚨 预警系统
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• 25条丰富的模拟预警数据</li>
                  <li>• 10种不同类型的预警</li>
                  <li>• 智能风险等级评估</li>
                  <li>• 完整的处理流程</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}