'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get('redirect') || '/';

  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // Direct redirect to intended destination (e.g. /admin or /vendor)
    const targetUrl = redirectTo.startsWith('/') ? redirectTo : '/';
    router.push(targetUrl);
    router.refresh();
  }

  return (
    <div className="w-full max-w-md bg-gradient-to-b from-[#142850] to-[#1B2F5E] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.37)] border border-[#D4AF37]/25 p-8 text-[#F5F7FA]">
      <h1 className="text-center text-4xl font-bold text-[#E9C86A] mb-1">
        SwiftMart
      </h1>
      <p className="text-center text-[#A8B0C5] mb-8">
        {redirectTo.startsWith('/admin')
          ? 'Admin Console Access'
          : redirectTo.startsWith('/vendor')
          ? 'Merchant Portal Access'
          : 'Welcome back'}
      </p>

      <form onSubmit={handleLogin}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border-2 border-[#D4AF37]/20 bg-[#0F2140] text-[#F5F7FA] p-3 mb-4 focus:border-[#D4AF37] outline-none"
          placeholder="you@example.com"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border-2 border-[#D4AF37]/20 bg-[#0F2140] text-[#F5F7FA] p-3 mb-2 focus:border-[#D4AF37] outline-none"
          placeholder="Password"
        />

        {error && (
          <p className="text-sm text-red-400 mb-4">{error}</p>
        )}
        {!error && <div className="mb-4" />}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0F172A] text-[#D4AF37] font-bold py-3 rounded-xl border-2 border-[#D4AF37] hover:bg-[#1E293B] transition disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      <p className="text-center text-sm text-[#A8B0C5] mt-6">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-[#D4AF37] font-semibold">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-4">
      <Suspense fallback={<div className="text-[#A8B0C5]">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
