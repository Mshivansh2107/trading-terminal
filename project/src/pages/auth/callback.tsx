import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { authStateAtom, initSupabaseSessionAtom } from '../../store/supabaseAuth';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [authState] = useAtom(authStateAtom);
  const [, initSession] = useAtom(initSupabaseSessionAtom);

  useEffect(() => {
    // Handle the OAuth callback by checking the session
    const handleCallback = async () => {
      await initSession();
    };

    handleCallback();
  }, [initSession]);

  // Redirect based on authentication state
  useEffect(() => {
    if (!authState.isLoading) {
      if (authState.isAuthenticated) {
        navigate('/');
      } else {
        navigate('/login');
      }
    }
  }, [authState, navigate]);

  // Show loading state while processing
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900">Processing authentication...</h3>
        <p className="text-gray-500">Please wait while we complete your sign-in.</p>
      </div>
    </div>
  );
} 