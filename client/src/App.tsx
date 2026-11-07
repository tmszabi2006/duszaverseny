import { useLayoutEffect, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { MapEditorPage } from './pages/MapEditorPage';
import { MapsPage } from './pages/MapsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PlayPage } from './pages/PlayPage';
import { ProfilePage } from './pages/ProfilePage';
import { WinterProvider } from './components/Winter';

function FullPageLoader() {
  return (
    <div className="full-page-loader">
      <div className="loader-spinner" aria-hidden="true" />
      <p>Bányalámpa gyújtása…</p>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  }
  return children;
}

export function App() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <WinterProvider>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<MapsPage />} />
        <Route path="/maps/new" element={<MapEditorPage />} />
        <Route path="/maps/:id/edit" element={<MapEditorPage />} />
        <Route path="/maps/:id" element={<PlayPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </WinterProvider>
  );
}
