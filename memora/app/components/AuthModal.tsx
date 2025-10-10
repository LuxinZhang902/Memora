"use client";
import React, { useState } from 'react';
import { setUser } from '@/lib/user';
import type { User } from '@/lib/auth';

type AuthMode = 'login' | 'signup' | 'reset';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSendCode = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: mode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send code');
      }

      setMessage('✅ Code sent! Check your email (and console for demo)');
      setStep('code');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid code');
      }

      // Save user to localStorage
      setUser(data.user);
      onSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setError('');
    setMessage('');
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
  };

  const getModeTitle = () => {
    switch (mode) {
      case 'login': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'reset': return 'Reset Password';
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'login': return 'Enter your email to receive a login code';
      case 'signup': return 'Enter your email to create your account';
      case 'reset': return 'Enter your email to reset your password';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-purple-500/50 shadow-2xl shadow-purple-500/20 max-w-md w-full p-8 space-y-6 relative z-[101]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold gradient-text">{getModeTitle()}</h2>
            <p className="text-gray-400 text-sm mt-1">{getModeDescription()}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 p-1 bg-slate-950/60 rounded-lg">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'login'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            disabled={loading}
          >
            Login
          </button>
          <button
            onClick={() => switchMode('signup')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'signup'
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            disabled={loading}
          >
            Sign Up
          </button>
        </div>

        {/* Email Step */}
        {step === 'email' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 font-semibold mb-2 block">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-slate-950/60 border-2 border-slate-700 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                disabled={loading}
                onKeyPress={(e) => e.key === 'Enter' && handleSendCode()}
              />
            </div>

            <button
              onClick={handleSendCode}
              disabled={loading || !email}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                loading || !email
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white glow-purple'
              }`}
            >
              {loading ? '⏳ Sending...' : '📧 Send Verification Code'}
            </button>

            {mode === 'login' && (
              <button
                onClick={() => switchMode('reset')}
                className="w-full text-sm text-gray-400 hover:text-purple-400 transition-colors"
                disabled={loading}
              >
                Forgot your password?
              </button>
            )}
          </div>
        )}

        {/* Code Step */}
        {step === 'code' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-300 font-semibold mb-2 block">
                Verification Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full bg-slate-950/60 border-2 border-slate-700 rounded-lg px-4 py-3 text-white text-center text-2xl font-mono tracking-widest placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                disabled={loading}
                maxLength={6}
                onKeyPress={(e) => e.key === 'Enter' && code.length === 6 && handleVerifyCode()}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Enter the 6-digit code sent to {email}
              </p>
            </div>

            <button
              onClick={handleVerifyCode}
              disabled={loading || code.length !== 6}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                loading || code.length !== 6
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white glow-purple'
              }`}
            >
              {loading ? '⏳ Verifying...' : '✓ Verify & Continue'}
            </button>

            <button
              onClick={resetForm}
              className="w-full text-sm text-gray-400 hover:text-purple-400 transition-colors"
              disabled={loading}
            >
              ← Back to email
            </button>

            <button
              onClick={handleSendCode}
              className="w-full text-sm text-gray-400 hover:text-purple-400 transition-colors"
              disabled={loading}
            >
              Resend code
            </button>
          </div>
        )}

        {/* Messages */}
        {message && (
          <div className="bg-green-950/40 rounded-lg p-4 border-2 border-green-500/50">
            <p className="text-green-300 text-sm">{message}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 rounded-lg p-4 border-2 border-red-500/50">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-700">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => switchMode('signup')}
                className="text-purple-400 hover:text-purple-300 transition-colors"
                disabled={loading}
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => switchMode('login')}
                className="text-purple-400 hover:text-purple-300 transition-colors"
                disabled={loading}
              >
                Log in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
