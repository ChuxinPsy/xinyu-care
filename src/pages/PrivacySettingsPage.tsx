import { Bell, Book, Camera, 
  ChevronLeft, ChevronRight, Eye, Fingerprint, Lock, 
  MapPin, Shield 
} from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function PrivacySettingsPage() {
  const navigate = useNavigate();
  
  const [settings, setSettings] = useState({
    twoFactor: false,
    profilePublic: true,
    dataSharing: false,
    cameraAccess: true,
    locationAccess: false,
    contactsAccess: false
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('设置已更新');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-10">
      <div className="bg-white dark:bg-slate-800 px-4 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold">隐私与安全</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* 账号安全 */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 px-1">账号安全</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">修改登录密码</div>
                    <div className="text-xs text-slate-400">定期更换密码保障安全</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">双重身份验证 (2FA)</div>
                    <div className="text-xs text-slate-400">登录时需要额外的验证码</div>
                  </div>
                </div>
                <Switch 
                  checked={settings.twoFactor} 
                  onCheckedChange={() => toggleSetting('twoFactor')} 
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 数据可见性 */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 px-1">数据可见性</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">公开个人资料</div>
                    <div className="text-xs text-slate-400">允许其他用户查看您的基本信息</div>
                  </div>
                </div>
                <Switch 
                  checked={settings.profilePublic} 
                  onCheckedChange={() => toggleSetting('profilePublic')} 
                />
              </div>
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">匿名化健康数据共享</div>
                    <div className="text-xs text-slate-400">用于医学研究，不包含身份信息</div>
                  </div>
                </div>
                <Switch 
                  checked={settings.dataSharing} 
                  onCheckedChange={() => toggleSetting('dataSharing')} 
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 应用权限 */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-500 px-1">应用权限管理</h2>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {[
                { key: 'cameraAccess', icon: Camera, label: '相机权限', desc: '用于拍照上传情绪记录', color: 'text-rose-500', bg: 'bg-rose-50' },
                { key: 'locationAccess', icon: MapPin, label: '位置信息', desc: '记录情绪发生时的地理位置', color: 'text-cyan-500', bg: 'bg-cyan-50' },
                { key: 'contactsAccess', icon: Book, label: '通讯录', desc: '发现使用心域智护的好友', color: 'text-indigo-500', bg: 'bg-indigo-50' },
              ].map((item, idx, arr) => (
                <div key={item.key} className={`flex items-center justify-between p-4 ${idx !== arr.length - 1 ? 'border-b' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 ${item.bg} ${item.color} rounded-lg`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-slate-400">{item.desc}</div>
                    </div>
                  </div>
                  <Switch 
                    checked={(settings as any)[item.key]} 
                    onCheckedChange={() => toggleSetting(item.key as any)} 
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* 隐私政策 */}
        <div className="pt-6 px-1">
          <Button variant="link" className="text-blue-600 h-auto p-0 font-medium text-sm">
            查看详细《隐私政策与服务协议》
          </Button>
          <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">
            心域智护严格遵守 GDPR、CCPA 等全球隐私法规，您的数据始终在您的控制之下。我们使用 AES-256 加密技术保障您的个人隐私安全。
          </p>
        </div>
      </div>
    </div>
  );
}
