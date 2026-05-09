import { Check, Copy, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createVerificationCode, deleteVerificationCode, getVerificationCodes, type DoctorVerificationCode } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';

interface VerificationCodeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function VerificationCodeManager({ open, onOpenChange }: VerificationCodeManagerProps) {
  const [codes, setCodes] = useState<DoctorVerificationCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [notes, setNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { user } = useAuth();

  const loadCodes = async () => {
    setLoading(true);
    try {
      const data = await getVerificationCodes();
      setCodes(data);
    } catch (error) {
      console.error('加载验证码失败:', error);
      toast.error('加载验证码失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadCodes();
    }
  }, [open]);

  const handleCreate = async () => {
    if (!newCode.trim()) {
      toast.error('请输入验证码');
      return;
    }

    // 简单验证：只允许字母和数字
    if (!/^[a-zA-Z0-9]+$/.test(newCode)) {
      toast.error('验证码只能包含字母和数字');
      return;
    }

    setCreating(true);
    try {
      await createVerificationCode(newCode, notes || undefined, user?.id);
      toast.success('验证码创建成功');
      setNewCode('');
      setNotes('');
      loadCodes();
    } catch (error: any) {
      console.error('创建验证码失败:', error);
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        toast.error('验证码已存在');
      } else {
        toast.error('创建验证码失败: ' + (error.message || '未知错误'));
      }
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!confirm(`确定要删除验证码 "${code}" 吗？`)) {
      return;
    }

    try {
      await deleteVerificationCode(id);
      toast.success('验证码已删除');
      loadCodes();
    } catch (error: any) {
      console.error('删除验证码失败:', error);
      toast.error('删除验证码失败: ' + (error.message || '未知错误'));
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success('验证码已复制到剪贴板');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] md:w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">验证码管理</DialogTitle>
          <DialogDescription>
            管理医生端注册验证码。默认验证码"2026"永久有效，其他验证码仅可使用一次。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 新增验证码表单 */}
          <div className="space-y-4 p-4 border border-border rounded-xl bg-muted/30">
            <h3 className="font-semibold">新增验证码</h3>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-code">验证码 *</Label>
                <Input
                  id="new-code"
                  placeholder="输入新验证码（字母和数字）"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">备注</Label>
                <Input
                  id="notes"
                  placeholder="可选：添加备注信息"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={creating}
                />
              </div>
              <Button onClick={handleCreate} disabled={creating || !newCode} className="w-full">
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    创建验证码
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* 验证码列表 */}
          <div className="space-y-3">
            <h3 className="font-semibold">验证码列表</h3>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                加载中...
              </div>
            ) : codes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                暂无验证码
              </div>
            ) : (
              <div className="space-y-2">
                {codes.map((code) => (
                  <div
                    key={code.id}
                    className="flex items-center justify-between p-4 border border-border rounded-xl hover:border-primary/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <code className="text-lg font-mono font-bold text-primary bg-primary/10 px-3 py-1 rounded">
                          {code.code}
                        </code>
                        {code.is_permanent && (
                          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                            永久有效
                          </span>
                        )}
                        {!code.is_permanent && code.is_used && (
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                            已使用
                          </span>
                        )}
                        {!code.is_permanent && !code.is_used && (
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                            未使用
                          </span>
                        )}
                      </div>
                      {code.notes && (
                        <p className="text-sm text-muted-foreground mb-1">{code.notes}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>创建于 {new Date(code.created_at).toLocaleString('zh-CN')}</span>
                        {code.used_at && (
                          <span>• 使用于 {new Date(code.used_at).toLocaleString('zh-CN')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => handleCopy(code.code, code.id)}
                      >
                        {copiedId === code.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                      {!code.is_permanent && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                          onClick={() => handleDelete(code.id, code.code)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
