import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { getRiskAlerts, handleRiskAlert } from '@/db/api';
import { generateMockAlerts } from '@/utils/mockData';
import type { RiskAlert } from '@/types';

export default function AlertsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [unhandledAlerts, setUnhandledAlerts] = useState<RiskAlert[]>([]);
  const [handledAlerts, setHandledAlerts] = useState<RiskAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const [unhandled, handled] = await Promise.all([
        getRiskAlerts(false),
        getRiskAlerts(true),
      ]);
      
      // 如果没有真实数据，使用模拟数据
      if (unhandled.length === 0 && handled.length === 0) {
        const mockAlerts = generateMockAlerts(25);
        const mockUnhandled = mockAlerts.filter(alert => !alert.is_handled).slice(0, 3);
        const mockHandled = mockAlerts.filter(alert => alert.is_handled);
        
        setUnhandledAlerts(mockUnhandled);
        setHandledAlerts(mockHandled);
      } else {
        setUnhandledAlerts(unhandled.slice(0, 3));
        setHandledAlerts(handled);
      }
    } catch (error) {
      console.error('加载预警失败:', error);
      
      // 出错时使用模拟数据
      const mockAlerts = generateMockAlerts(25);
      const mockUnhandled = mockAlerts.filter(alert => !alert.is_handled).slice(0, 3);
      const mockHandled = mockAlerts.filter(alert => alert.is_handled);
      
      setUnhandledAlerts(mockUnhandled);
      setHandledAlerts(mockHandled);
      
      toast.error('加载预警失败，显示模拟数据');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (alert: RiskAlert) => {
    setSelectedAlert(alert);
    setNotes('');
    setDialogOpen(true);
  };

  const handleMarkAsHandled = async () => {
    if (!user || !selectedAlert) return;

    try {
      await handleRiskAlert(selectedAlert.id, user.id, notes || undefined);
      toast.success('预警已处理');
      setDialogOpen(false);
      await loadAlerts();
    } catch (error) {
      console.error('处理失败:', error);
      toast.error('处理失败');
    }
  };

  const getRiskLevelColor = (level: number) => {
    if (level >= 8) return 'destructive';
    if (level >= 5) return 'default';
    return 'secondary';
  };

  const AlertCard = ({ alert, showActions = true }: { alert: RiskAlert; showActions?: boolean }) => (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden bg-card">
      <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge 
                variant={getRiskLevelColor(alert.risk_level)}
                className="px-2 py-0.5 text-[10px] font-bold"
              >
                风险等级 {alert.risk_level}/10
              </Badge>
              <Badge variant="secondary" className="px-2 py-0.5 text-[10px] bg-muted">
                {alert.alert_type}
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold">
              {(alert as any).profiles?.full_name || (alert as any).profiles?.username || '未知患者'}
            </CardTitle>
          </div>
          {alert.is_handled && (
            <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 text-[10px]">
              <CheckCircle className="w-3 h-3 mr-1" />
              已处理
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">预警描述</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{alert.description}</p>
        </div>

        {alert.data_source && (
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">数据来源</p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{alert.data_source}</p>
          </div>
        )}

        {alert.is_handled && alert.notes && (
          <div className="p-3 bg-muted/50 rounded-xl space-y-1">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">处理备注</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 italic">“{alert.notes}”</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-muted-foreground pt-4 border-t border-muted/50">
          <span className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            {new Date(alert.created_at).toLocaleString('zh-CN')}
          </span>
          {alert.is_handled && alert.handled_at && (
            <span className="flex items-center">
              <CheckCircle className="w-3 h-3 mr-1" />
              处理于 {new Date(alert.handled_at).toLocaleString('zh-CN')}
            </span>
          )}
        </div>

        {showActions && !alert.is_handled && (
          <Button
            className="w-full h-11 rounded-xl font-bold mt-2 shadow-lg shadow-primary/10"
            onClick={() => handleOpenDialog(alert)}
          >
            标记为已处理
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">预警消息</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">监控和处理高风险预警</p>
      </div>

      <Tabs defaultValue="unhandled" className="space-y-6">
        <TabsList className="w-full max-w-md h-12 p-1 bg-muted/50 rounded-2xl">
          <TabsTrigger value="unhandled" className="flex-1 rounded-xl data-[state=active]:shadow-sm">
            待处理
            {unhandledAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full text-[10px]">
                {unhandledAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="handled" className="flex-1 rounded-xl data-[state=active]:shadow-sm">已处理</TabsTrigger>
        </TabsList>

        <TabsContent value="unhandled" className="space-y-4 px-1">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 bg-muted rounded-2xl" />
              ))}
            </>
          ) : unhandledAlerts.length > 0 ? (
            unhandledAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          ) : (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="font-medium">暂无待处理预警</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="handled" className="space-y-4 px-1">
          {loading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 bg-muted rounded-2xl" />
              ))}
            </>
          ) : handledAlerts.length > 0 ? (
            handledAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} showActions={false} />
            ))
          ) : (
            <Card className="border-dashed bg-muted/20">
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="font-medium">暂无已处理预警</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* 处理预警对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] rounded-2xl p-4 md:p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl">处理预警</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {selectedAlert && (
              <>
                <div className="p-4 bg-muted/30 rounded-2xl space-y-2 border border-muted">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getRiskLevelColor(selectedAlert.risk_level)} className="text-[10px]">
                      风险等级 {selectedAlert.risk_level}/10
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{selectedAlert.alert_type}</Badge>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedAlert.description}</p>
                </div>

                <div className="space-y-2 px-1">
                  <label className="text-sm font-bold">处理备注 <span className="text-muted-foreground font-normal">(可选)</span></label>
                  <Textarea
                    placeholder="请输入处理措施、随访建议等记录..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="rounded-xl min-h-[120px] focus:ring-primary/20"
                  />
                </div>

                <Button onClick={handleMarkAsHandled} className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 transition-all active:scale-95">
                  确认已处理
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
