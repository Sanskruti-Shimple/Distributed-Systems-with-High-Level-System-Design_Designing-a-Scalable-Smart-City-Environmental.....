import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AlertsPage } from './pages/AlertsPage';
import { OverviewPage } from './pages/OverviewPage';
import { SensorsPage } from './pages/SensorsPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell><OverviewPage /></AppShell>} />
      <Route path="/sensors" element={<AppShell><SensorsPage /></AppShell>} />
      <Route path="/alerts" element={<AppShell><AlertsPage /></AppShell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}