import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { authStateAtom, initSupabaseSessionAtom } from './store/supabaseAuth';
import { refreshDataAtom, syncSettingsAtom, autoFetchUsdPriceAtom, fetchBanksAtom, fetchPlatformsAtom } from './store/data';
import { ToastProvider } from './components/ui/toast';

// Pages
import Dashboard from './pages/dashboard';
import Sales from './pages/sales';
import Purchase from './pages/purchase';
import Transfer from './pages/transfer';
import BankTransfer from './pages/bank-transfer';
import Expenses from './pages/expenses';
import Banks from './pages/banks';
import Platforms from './pages/platforms';
import Stats from './pages/stats';
import Login from './pages/login';
import Register from './pages/register';
import ResetPassword from './pages/reset-password';
import AdminUsers from './pages/admin/users';

// Components
import Navbar from './components/layout/navbar';
import GlobalDateFilter from './components/global-date-filter';

// Authenticated route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [authState] = useAtom(authStateAtom);
  
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Admin route wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [authState] = useAtom(authStateAtom);
  
  if (!authState.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has admin metadata
  const isAdmin = authState.user?.app_metadata?.is_admin === true;
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const [authState] = useAtom(authStateAtom);
  const [, initSession] = useAtom(initSupabaseSessionAtom);
  const [, refreshData] = useAtom(refreshDataAtom);
  const [, syncSettings] = useAtom(syncSettingsAtom);
  const [, autoFetchPrice] = useAtom(autoFetchUsdPriceAtom);
  const [, fetchBanks] = useAtom(fetchBanksAtom);
  const [, fetchPlatforms] = useAtom(fetchPlatformsAtom);
  
  useEffect(() => {
    // Initialize auth state from Supabase on app load
    initSession();
  }, [initSession]);
  
  useEffect(() => {
    // Load data and settings from Supabase when authenticated
    if (authState.isAuthenticated) {
      Promise.all([
        refreshData(),
        syncSettings(),
        autoFetchPrice(),
        fetchBanks(),
        fetchPlatforms()
      ]).catch(err => console.error('Error initializing data:', err));
      
      // Set up auto-fetch interval for USD price
      const interval = setInterval(() => {
        autoFetchPrice().catch(err => console.error('Error auto-fetching price:', err));
      }, 60000); // Fetch every minute
      
      return () => clearInterval(interval);
    }
  }, [authState.isAuthenticated, refreshData, syncSettings, autoFetchPrice, fetchBanks, fetchPlatforms]);
  
  return (
    <Router>
      <ToastProvider>
      <div className="min-h-screen bg-gray-50 flex overflow-hidden">
        <Navbar />
        
          <main className={`flex-1 ${authState.isAuthenticated ? 'ml-16 md:ml-64' : ''} min-h-screen bg-gray-50 transition-all duration-300 ease-in-out overflow-x-hidden`}>
          {authState.isAuthenticated && <GlobalDateFilter />}
          <div className="w-full overflow-x-hidden">
            <Routes>
              <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/sales" element={
                <ProtectedRoute>
                  <Sales />
                </ProtectedRoute>
              } />
              
              <Route path="/purchase" element={
                <ProtectedRoute>
                  <Purchase />
                </ProtectedRoute>
              } />
              
              <Route path="/transfer" element={
                <ProtectedRoute>
                  <Transfer />
                </ProtectedRoute>
              } />
                
                <Route path="/bank-transfer" element={
                  <ProtectedRoute>
                    <BankTransfer />
                  </ProtectedRoute>
                } />
                
                <Route path="/expenses" element={
                  <ProtectedRoute>
                    <Expenses />
                </ProtectedRoute>
              } />
              
              <Route path="/banks" element={
                <ProtectedRoute>
                  <Banks />
                </ProtectedRoute>
              } />
              
              <Route path="/platforms" element={
                <ProtectedRoute>
                  <Platforms />
                </ProtectedRoute>
              } />
              
              <Route path="/stats" element={
                <ProtectedRoute>
                  <Stats />
                </ProtectedRoute>
              } />
                
                {/* Admin Routes */}
                <Route path="/admin/users" element={
                  <AdminRoute>
                    <AdminUsers />
                  </AdminRoute>
              } />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
      </ToastProvider>
    </Router>
  );
}

export default App;