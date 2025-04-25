import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { authAtom, loginAtom, initAuthAtom } from '../store/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp } from 'lucide-react';

const Login = () => {
  const [pin, setPin] = useState('');
  const [auth] = useAtom(authAtom);
  const [, login] = useAtom(loginAtom);
  const [, initAuth] = useAtom(initAuthAtom);
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize auth from session storage
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    // Redirect to dashboard if already authenticated
    if (auth.isAuthenticated) {
      navigate('/');
    }
  }, [auth.isAuthenticated, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(pin);
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and limit to 6 digits
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
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
          <p className="mt-2 text-gray-600">Enter your PIN to access the system</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Secure Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={handlePinChange}
                    placeholder="Enter 6-digit PIN"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl tracking-widest"
                    required
                    maxLength={6}
                  />
                </div>
                {auth.error && (
                  <p className="mt-2 text-sm text-red-600">{auth.error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full py-3"
                disabled={pin.length !== 6 || auth.isLoading}
              >
                {auth.isLoading ? 'Verifying...' : 'Login'}
              </Button>
            </form>
            
            <div className="mt-4 text-sm text-gray-500 text-center">
              <p>Default PIN: 123456</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;