import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InvoicesPage from './pages/InvoicesPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import EditInvoicePage from './pages/EditInvoicePage';
import ClientsPage from './pages/ClientsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import PurchasesPage from './pages/PurchasesPage';
import CreatePurchasePage from './pages/CreatePurchasePage';
import EditPurchasePage from './pages/EditPurchasePage';
import PurchaseDetailPage from './pages/PurchaseDetailPage';
import GSTAnalysisPage from './pages/GSTAnalysisPage';
import CombinedAnalysisPage from './pages/CombinedAnalysisPage';
import EstimatesPage from './pages/EstimatesPage';
import CreateEstimatePage from './pages/CreateEstimatePage';
import EstimateDetailPage from './pages/EstimateDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f1f35, #1e3a5f)' }}>
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-200">Loading...</p>
        </div>
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

/** Only GST-panel users can access this route; others get sent to /dashboard */
function GSTRoute({ children }: { children: React.ReactNode }) {
  const { isGSTPanel } = useAuth();
  return isGSTPanel ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

/** Only Non-GST-panel users can access this route; others get sent to /dashboard */
function NonGSTRoute({ children }: { children: React.ReactNode }) {
  const { isGSTPanel } = useAuth();
  return !isGSTPanel ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout darkMode={darkMode} onToggleDark={() => setDarkMode(d => !d)} />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/new" element={<CreateInvoicePage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="invoices/:id/edit" element={<EditInvoicePage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="purchases" element={<PurchasesPage />} />
        <Route path="purchases/new" element={<CreatePurchasePage />} />
        <Route path="purchases/:id" element={<PurchaseDetailPage />} />
        <Route path="purchases/:id/edit" element={<EditPurchasePage />} />
        <Route path="estimates" element={<EstimatesPage />} />
        <Route path="estimates/new" element={<CreateEstimatePage />} />
        <Route path="estimates/:id" element={<EstimateDetailPage />} />

        {/* GST-panel only */}
        <Route path="gst-analysis" element={
          <GSTRoute><GSTAnalysisPage /></GSTRoute>
        } />

        {/* Non-GST-panel only */}
        <Route path="combined-analysis" element={
          <NonGSTRoute><CombinedAnalysisPage /></NonGSTRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
