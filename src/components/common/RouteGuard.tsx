import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
}

// 可以不登录访问的页面
const PUBLIC_ROUTES = ['/', '/login', '/403', '/404'];

function matchPublicRoute(path: string, patterns: string[]) {
  return patterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      return regex.test(path);
    }
    return path === pattern;
  });
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);

    if (!user && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
      return;
    }

    if (user && location.pathname.startsWith('/doctor')) {
      if (!profile) return;
      if (profile.role !== 'doctor' && profile.role !== 'admin') {
        navigate('/profile', { replace: true });
      }
    }
  }, [user, profile, loading, location.pathname, navigate]);

  if (loading) {
    return (
      <div style={{ padding: 24, fontSize: 14 }}>
        正在加载...
      </div>
    );
  }

  if (user && location.pathname.startsWith('/doctor') && !profile) {
    return (
      <div style={{ padding: 24, fontSize: 14 }}>
        正在加载医生权限...
      </div>
    );
  }

  if (
    user &&
    location.pathname.startsWith('/doctor') &&
    profile &&
    profile.role !== 'doctor' &&
    profile.role !== 'admin'
  ) {
    return (
      <div style={{ padding: 24, fontSize: 14 }}>
        当前账号没有医生后台权限，正在返回个人中心...
      </div>
    );
  }

  return <>{children}</>;
}
