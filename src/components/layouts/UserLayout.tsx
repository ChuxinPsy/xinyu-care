import { Activity, Heart, Home, User } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/assessment', label: 'AI评估', icon: Activity },
  { path: '/healing', label: '疗愈', icon: Heart },
  { path: '/profile', label: '我的', icon: User },
];

export default function UserLayout({ children }: UserLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();

  const handleLogoClick = () => {
    // 跳转到官网首页
    window.location.href = '/index.html';
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* 桌面端左侧导航栏 */}
      {!isMobile && (
        <aside className="fixed left-0 top-0 bottom-0 w-64 border-r bg-card/50 backdrop-blur-xl z-50 flex flex-col">
          {/* Logo区域 */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogoClick}
            className="p-6 border-b cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <div className="w-14 h-14 flex-shrink-0 flex items-center justify-center overflow-hidden">
                <img src="https://www.gitcc.com/uploads/-/system/appearance/header_logo/1/gitpp.png" alt="心域智护" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 bg-clip-text text-transparent">
                  心域智护
                </span>
                <p className="text-xs text-muted-foreground">智能心理健康助手</p>
              </div>
            </div>
          </motion.div>
          
          {/* 导航菜单 */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                >
                  <motion.div
                    whileHover={{ x: 4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all relative overflow-hidden',
                      isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/25' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400"
                        initial={false}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                    <Icon className={cn("w-5 h-5 relative z-10", isActive && "drop-shadow-sm")} />
                    <span className={cn("text-sm font-medium relative z-10", isActive && "drop-shadow-sm")}>
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* 底部区域 - 登录按钮和版权 */}
          <div className="mt-auto">
            {/* 用户登录按钮 */}
            <div className="p-4 border-t">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/login', { state: { role: 'user' } })}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-sm font-medium border border-border transition-all"
              >
                <Avatar className="w-8 h-8 border-2 border-border">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {profile?.full_name?.charAt(0) || profile?.username?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{profile?.full_name || profile?.username || '用户登录'}</span>
              </motion.button>
            </div>

            {/* 底部版权 */}
            <div className="p-4 border-t">
              <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                <p className="text-xs text-muted-foreground text-center">
                  © 2026 心域智护
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* 主内容区 */}
      <main className={cn(
        "flex-1 overflow-auto",
        isMobile ? "pb-16" : "ml-64"
      )}>
        {children}
      </main>

      {/* 移动端底部导航栏 */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
          <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
