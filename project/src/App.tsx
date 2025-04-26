import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { authAtom, initAuthAtom } from './store/auth';
import { refreshDataAtom } from './store/data';

// Pages
import Dashboard from './pages/dashboard';
import Sales from './pages/sales';
import Purchase from './pages/purchase';
import Transfer from './pages/transfer';
import Stats from './pages/stats';
import Login from './pages/login';

// Components
import Navbar from './components/layout/navbar';

// Authenticated route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [auth] = useAtom(authAtom);
  
  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

function App() {
  const [auth] = useAtom(authAtom);
  const [, initAuth] = useAtom(initAuthAtom);
  const [, refreshData] = useAtom(refreshDataAtom);
  
  useEffect(() => {
    // Initialize auth state from session storage on app load
    initAuth();
  }, [initAuth]);
  
  useEffect(() => {
    // Load data from Supabase when authenticated
    if (auth.isAuthenticated) {
      refreshData().catch(err => console.error('Error refreshing data:', err));
    }
  }, [auth.isAuthenticated, refreshData]);
  
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex">
        <Navbar />
        
        <main className={`flex-1 ${auth.isAuthenticated ? 'ml-16 md:ml-64' : ''} min-h-screen bg-gray-50 transition-all duration-300 ease-in-out`}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
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
            
            <Route path="/stats" element={
              <ProtectedRoute>
                <Stats />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;