"use client";
import React, { useState, useEffect } from 'react';
import { isAuthenticated, getUser, clearUser } from '@/lib/user';
import AuthModal from './AuthModal';
import type { User } from '@/lib/auth';

interface Props {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    // Skip auth if SKIP_AUTH is enabled (for demo/hackathon)
    if (process.env.NEXT_PUBLIC_SKIP_AUTH === 'true') {
      const demoUser: User = {
        user_id: 'demo-user',
        email: 'demo@memora.app',
        created_at: new Date().toISOString(),
        is_verified: true,
      };
      setUser(demoUser);
      setShowAuth(false);
      setLoading(false);
      return;
    }

    const currentUser = getUser();
    if (currentUser) {
      setUser(currentUser);
      setShowAuth(false);
    } else {
      setShowAuth(true);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    clearUser();
    setUser(null);
    setShowAuth(true);
  };

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setShowAuth(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
          <div className="text-center max-w-2xl">
            <h1 className="text-6xl font-bold gradient-text mb-4">Memora</h1>
            <p className="text-gray-400 text-xl mb-8">
              Make personal memories and life admin instantly answerable—with
              verifiable evidence—while staying private by default.
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="px-8 py-4 rounded-xl font-medium bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white text-lg transition-all duration-300 glow-purple"
            >
              Get Started →
            </button>
          </div>
        </div>
        <AuthModal
          isOpen={showAuth}
          onClose={() => {}} // Can't close without auth
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  return (
    <>
      {/* User Menu - Redesigned */}
      <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50">
        <div className="bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
          <div className="px-3 py-2 md:px-5 md:py-3 flex items-center gap-2 md:gap-4">
            {/* User Avatar */}
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user.email.charAt(0).toUpperCase()}
            </div>
            
            {/* User Info - Hidden on small screens */}
            <div className="hidden sm:flex flex-1 min-w-0 flex-col">
              <div className="text-sm text-white font-medium truncate max-w-[180px]">
                {user.email}
              </div>
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span>Online</span>
              </div>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-white text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap"
              title="Logout"
            >
              <span className="hidden sm:inline">Logout</span>
              <span className="sm:hidden">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </span>
              <svg className="hidden sm:block w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {children}
    </>
  );
}
