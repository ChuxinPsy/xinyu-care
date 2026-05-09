import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface DoctorLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/doctor/dashboard', label: '数据看板', icon: LayoutDashboard },
  { path: '/doctor/patients', label: '用户管理', icon: Users },
  { path: '/doctor/knowledge', label: '知识库', icon: BookOpen },
  { path: '/doctor/alerts', label: '预警消息', icon: AlertTriangle },
];

export default function DoctorLayout({ children }: DoctorLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* PC 端侧边栏 */}
      <aside
        className={cn(
          'hidden md:flex sticky top-0 left-0 z-50 h-screen w-64 bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-sidebar-border">
            <h1 className="text-lg font-semibold text-sidebar-foreground">医生管理后台</h1>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* 用户信息和退出 */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="mb-3 px-4 py-2 bg-sidebar-accent rounded-lg">
              <p className="text-sm font-medium text-sidebar-foreground">
                {profile?.full_name || profile?.username}
              </p>
              <p className="text-xs text-sidebar-foreground/60">
                {profile?.role === 'doctor' ? '医生' : '管理员'}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* 顶部栏 (PC端标题 / 移动端状态) */}
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-full px-4 md:px-8">
            <h1 className="text-xl font-bold md:hidden">心域智护 医生后台</h1>
            <div className="hidden md:block" /> {/* PC端占位 */}
            <div className="flex items-center gap-4">
              <div className="md:hidden flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                <span className="text-xs font-medium">{profile?.full_name || profile?.username}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleLogout}>
                  <LogOut className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* 移动端底部菜单栏 */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-card border-t border-border flex md:hidden items-center justify-around px-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full transition-colors relative',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn("w-6 h-6 mb-1", isActive && "animate-in zoom-in-75 duration-300")} />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute -top-[2px] w-12 h-[2px] bg-primary rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
