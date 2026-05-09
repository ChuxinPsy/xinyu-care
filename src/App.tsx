import { Navigate, Route, HashRouter as Router, Routes, useLocation } from 'react-router-dom';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { RouteGuard } from '@/components/common/RouteGuard';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import UserLayout from '@/components/layouts/UserLayout';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import routes from './routes';

// 布局包装器组件
const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  
  
  // 不需要布局的页面
  const noLayoutPaths = ['/login'];
  if (noLayoutPaths.includes(location.pathname)) {
    return <>{children}</>;
  }
  
  // 医生后台使用侧边栏布局
  if (location.pathname.startsWith('/doctor')) {
    return <DoctorLayout>{children}</DoctorLayout>;
  }
  
  // 用户端使用底部导航布局
  return <UserLayout>{children}</UserLayout>;
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ErrorBoundary>
          <RouteGuard>
            <LayoutWrapper>
              <Routes>
                {routes.map((route, index) => (
                  <Route
                    key={index}
                    path={route.path}
                    element={route.element}
                  />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </LayoutWrapper>
            <Toaster position="top-center" offset={72} visibleToasts={1} />
          </RouteGuard>
        </ErrorBoundary>
      </AuthProvider>
    </Router>
  );
};

export default App;
