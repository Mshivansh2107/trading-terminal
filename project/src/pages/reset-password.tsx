import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { authStateAtom, verifyOtpAtom } from '../store/supabaseAuth';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { TrendingUp, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import OtpInput from '../components/ui/otp-input';

const ResetPassword = () => {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authState] = useAtom(authStateAtom);
  const [, verifyOtp] = useAtom(verifyOtpAtom);
  const navigate = useNavigate();

  const validatePassword = () => {
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return false;
    }
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return false;
    }
    
    setPasswordError('');
    return true;
  };

  // Email submission - Request password reset email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) throw error;
      
      setStep('otp');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token || token.length < 6) {
      setError('Please enter the complete verification code');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { success, error } = await verifyOtp({ 
        email, 
        token 
      });
      
      if (!success) throw new Error(error?.toString() || 'Invalid verification code');
      
      setStep('password');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Password reset
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { success, error } = await verifyOtp({
        email,
        token,
        password
      });
      
      if (!success) throw new Error(error?.toString() || 'Failed to reset password');
      
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Render different forms based on the current step
  const renderStepContent = () => {
    if (success) {
      return (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center justify-center gap-2">
          <CheckCircle size={18} />
          <p>Password has been reset successfully. Redirecting to login...</p>
        </div>
      );
    }

    switch (step) {
      case 'email':
        return (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
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
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                <AlertCircle size={16} />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-3"
              disabled={!email || isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </Button>
          </form>
        );
      
      case 'otp':
        return (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <p className="text-sm text-center mb-2">
                We've sent a verification code to <span className="font-medium">{email}</span>
              </p>
              <div className="my-6">
                <OtpInput
                  length={6}
                  value={token}
                  onChange={setToken}
                />
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                Enter the 6-character code sent to your email
              </p>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                <AlertCircle size={16} />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep('email')}
                disabled={isLoading}
              >
                <ArrowLeft size={16} className="mr-2" /> Back
              </Button>
              
              <Button
                type="submit"
                className="flex-1"
                disabled={token.length < 6 || isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </div>
          </form>
        );
      
      case 'password':
        return (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter new password"
                required
                minLength={8}
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm new password"
                required
              />
              {passwordError && (
                <p className="mt-1 text-sm text-red-600">{passwordError}</p>
              )}
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-center gap-2">
                <AlertCircle size={16} />
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep('otp')}
                disabled={isLoading}
              >
                <ArrowLeft size={16} className="mr-2" /> Back
              </Button>
              
              <Button
                type="submit"
                className="flex-1"
                disabled={!password || !confirmPassword || isLoading}
              >
                {isLoading ? 'Updating...' : 'Reset Password'}
              </Button>
            </div>
          </form>
        );
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
          <p className="mt-2 text-gray-600">Reset Your Password</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {step === 'email' ? 'Reset Password' : 
               step === 'otp' ? 'Verify Code' : 
               'Set New Password'}
            </CardTitle>
            <CardDescription className="text-center">
              {step === 'email' ? 'Enter your email to receive a reset code' : 
               step === 'otp' ? 'Enter the code sent to your email' : 
               'Create a new secure password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
          <CardFooter className="justify-center">
            <Button 
              variant="link" 
              className="text-sm text-gray-600"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword; 