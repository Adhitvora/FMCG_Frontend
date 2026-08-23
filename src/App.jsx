import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import muiTheme from './theme/muiTheme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import CompanyMaster from './pages/CompanyMaster';
import PartyMaster from './pages/PartyMaster';
import TransportMaster from './pages/TransportMaster';
import ReplacementList from './pages/ReplacementList';
import CartonMerge from './pages/CartonMerge';
import InvoiceList from './pages/InvoiceList';
import AuditLogPage from './pages/AuditLogPage';
import SettlementManagement from './pages/SettlementManagement';
import ProductMaster from './pages/ProductMaster';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000, // 30 seconds
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#0D1B2A',
              color: '#fff',
              borderRadius: '10px',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: { primary: '#10B981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#EF4444', secondary: '#fff' },
            },
          }}
        />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Auth routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
              </Route>

              {/* Protected dashboard routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Dashboard />} />

                {/* Masters */}
                <Route
                  path="/masters/users"
                  element={
                    <ProtectedRoute roles={['super_admin']}>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Masters */}
                <Route path="/masters/companies" element={<CompanyMaster />} />
                <Route path="/masters/parties" element={<PartyMaster />} />
                <Route path="/masters/transports" element={<TransportMaster />} />
                <Route path="/masters/products" element={<ProductMaster />} />
                <Route path="/replacements" element={<ReplacementList />} />
                <Route path="/carton-merge" element={<CartonMerge />} />
                <Route path="/approvals" element={<ReplacementList />} />
                <Route path="/settlements" element={<SettlementManagement />} />
                <Route path="/settlements/pending" element={<SettlementManagement />} />
                <Route path="/invoices" element={<InvoiceList />} />
                <Route path="/search" element={<ReplacementList />} />
                <Route path="/reports" element={<ReplacementList />} />
                <Route path="/audit-log" element={
                  <ProtectedRoute roles={['super_admin', 'admin']}>
                    <AuditLogPage />
                  </ProtectedRoute>
                } />
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
};


export default App;
