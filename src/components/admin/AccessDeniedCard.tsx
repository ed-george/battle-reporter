'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogOut, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface AccessDeniedCardProps {
  userEmail: string;
}

export function AccessDeniedCard({ userEmail }: AccessDeniedCardProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      router.refresh();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-sm space-y-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2">
        <ShieldAlert className="w-7 h-7" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Access Denied</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          You are currently signed in as <strong className="text-slate-800 dark:text-slate-200">{userEmail}</strong>, but this account is not authorized as an administrator.
        </p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl p-4 text-left text-xs space-y-2">
        <span className="font-bold text-slate-700 dark:text-slate-300 block">How to Grant Admin Access:</span>
        <ul className="list-disc list-inside text-slate-500 dark:text-slate-400 space-y-1 text-[11px]">
          <li>
            Add <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">{userEmail}</code> to <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">ADMIN_EMAILS</code> in your <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">.env.local</code>.
          </li>
          <li>
            Or assign <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">&#123;&quot;role&quot;: &quot;admin&quot;&#125;</code> in Supabase Auth user metadata.
          </li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 justify-center pt-2">
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          {isSigningOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          <span>Sign Out</span>
        </button>

        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-xs bg-red-600 hover:bg-red-700 text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
