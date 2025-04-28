import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAtom } from 'jotai';
import { 
  authStateAtom, 
  signInWithEmailAtom, 
  initSupabaseSessionAtom,
  resetPasswordAtom
} from '../store/supabaseAuth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { TrendingUp, AlertCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [authState] = useAtom(authStateAtom);
  const [, signInWithEmail] = useAtom(signInWithEmailAtom);
  const [, initSession] = useAtom(initSupabaseSessionAtom);
  const [, resetPassword] = useAtom(resetPasswordAtom);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize session from Supabase
    initSession();
  }, [initSession]);

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (authState.isAuthenticated) {
      navigate('/');
    }
  }, [authState.isAuthenticated, navigate]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmail({ email, password });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await resetPassword({ email });
    if (result.success) {
      setResetSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full text-white">
              <TrendingUp size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Trading Terminal</h1>
          <p className="mt-2 text-gray-600">Sign in to access the trading system</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {forgotPasswordMode ? "Reset Password" : "Sign In"}
            </CardTitle>
            <CardDescription className="text-center">
              {forgotPasswordMode 
                ? "Enter your email to receive a password reset link" 
                : "Enter your email and password to access your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resetSent ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 text-center">
                <p>Password reset email sent! Check your inbox for further instructions.</p>
                <Button 
                  variant="link" 
                  className="mt-2 text-green-700"
                  onClick={() => {
                    setForgotPasswordMode(false);
                    setResetSent(false);
                  }}
                >
                  Return to login
                </Button>
              </div>
            ) : forgotPasswordMode ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                {authState.error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                    <AlertCircle size={16} />
                    <p className="text-sm">{authState.error}</p>
                  </div>
                )}

                <div className="flex flex-col space-y-2">
                  <Button
                    type="submit"
                    className="w-full py-3"
                    disabled={!email || authState.isLoading}
                  >
                    {authState.isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full py-3"
                    onClick={() => setForgotPasswordMode(false)}
                  >
                    Back to Login
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
              <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <button 
                      type="button" 
                      className="text-sm text-blue-600 hover:text-blue-800"
                      onClick={() => setForgotPasswordMode(true)}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="admin"
                    type="checkbox"
                    checked={isAdmin}
                    onChange={(e) => setIsAdmin(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="admin" className="ml-2 block text-sm text-gray-700">
                    Sign in as administrator
                  </label>
                </div>
                
                {authState.error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                    <AlertCircle size={16} />
                    <p className="text-sm">{authState.error}</p>
                  </div>
                )}

              <Button
                type="submit"
                className="w-full py-3"
                  disabled={!email || !password || authState.isLoading}
              >
                  {authState.isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            )}
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-800">
                Register
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;