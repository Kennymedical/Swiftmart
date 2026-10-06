'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Store, KeyRound, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function VendorLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<'credentials' | 'pin_verify' | 'pin_create'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vendorId, setVendorId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id, status, dashboard_pin_hash')
          .eq('user_id', user.id)
          .maybeSingle();

        if (vendor && vendor.status === 'approved') {
          setVendorId(vendor.id);
          if (!vendor.dashboard_pin_hash) {
            setStep('pin_create');
          } else {
            setStep('pin_verify');
          }
        }
      }
    }
    checkAuth();
  }, [supabase]);

  // Step 1: Sign in with credentials & check approval status
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError || !data.user) {
        throw new Error(signInError?.message || 'Invalid credentials');
      }

      // Check vendor registration & approval
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id, business_name, status, dashboard_pin_hash')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (vendorError || !vendor) {
        await supabase.auth.signOut();
        throw new Error('No vendor profile found. Please register as a vendor first.');
      }

      if (vendor.status !== 'approved') {
        await supabase.auth.signOut();
        throw new Error(
          vendor.status === 'pending'
            ? 'Your vendor application is still under review. You can log in once approved by SwiftMart.'
            : 'Your vendor account is suspended or inactive.'
        );
      }

      setVendorId(vendor.id);

      if (!vendor.dashboard_pin_hash) {
        setStep('pin_create');
      } else {
        setStep('pin_verify');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Create initial 6-digit vendor PIN
  const handlePinCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 numeric digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      if (!vendorId) throw new Error('Session invalid, please sign in again');

      const { error: updateError } = await supabase
        .from('vendors')
        .update({ dashboard_pin_hash: pin })
        .eq('id', vendorId);

      if (updateError) throw updateError;

      sessionStorage.setItem('swiftmart_vendor_pin_verified', 'true');
      setSuccess('Merchant PIN created successfully! Opening your dashboard...');
      setTimeout(() => {
        router.push('/vendor');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to save merchant PIN');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify PIN
  const handlePinVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('Enter your 6-digit Merchant PIN');
      return;
    }

    setLoading(true);
    try {
      if (!vendorId) throw new Error('Session expired');

      const { data: vendor, error: fetchError } = await supabase
        .from('vendors')
        .select('dashboard_pin_hash')
        .eq('id', vendorId)
        .single();

      if (fetchError || !vendor) throw new Error('Failed to verify PIN');

      if (vendor.dashboard_pin_hash !== pin) {
        throw new Error('Incorrect Merchant PIN. Access denied.');
      }

      sessionStorage.setItem('swiftmart_vendor_pin_verified', 'true');
      router.push('/vendor');
    } catch (err: any) {
      setError(err.message || 'Incorrect PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D1E] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-gradient-to-b from-[#142850] to-[#0A1931] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-[#F5F7FA]">
        
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0A1931] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)]">
            {step === 'credentials' ? <Store size={32} /> : <KeyRound size={32} />}
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-[#D4AF37] tracking-wider uppercase">
            Merchant Portal
          </h1>
          <p className="text-xs text-[#A8B0C5] mt-1">
            {step === 'credentials'
              ? 'Dedicated Approved Vendor Sign-In'
              : step === 'pin_create'
              ? 'Create Your 6-Digit Merchant PIN'
              : 'Enter Your 6-Digit Merchant PIN'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-950/60 border border-green-500/50 text-green-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-green-400" />
            <span>{success}</span>
          </div>
        )}

        {/* STEP 1: CREDENTIALS */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">
                Merchant Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendor@example.com"
                className="w-full bg-[#0A152B] border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#0A152B] border border-[#D4AF37]/30 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50"
            >
              {loading ? 'Verifying Account...' : 'Continue to Merchant PIN'}
            </button>
          </form>
        )}

        {/* STEP 2: CREATE PIN */}
        {step === 'pin_create' && (
          <form onSubmit={handlePinCreate} className="space-y-4">
            <div className="p-3 rounded-xl bg-[#0F2140] border border-[#D4AF37]/20 text-xs text-[#A8B0C5] leading-relaxed">
              Congratulations on your approval! Please create a private 6-digit PIN to securely access your store dashboard and wallet.
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">
                New 6-Digit Merchant PIN
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full text-center tracking-widest text-lg font-bold bg-[#0A152B] border border-[#D4AF37]/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">
                Confirm 6-Digit PIN
              </label>
              <input
                type="password"
                maxLength={6}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full text-center tracking-widest text-lg font-bold bg-[#0A152B] border border-[#D4AF37]/40 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-2 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50"
            >
              {loading ? 'Activating PIN...' : 'Save PIN & Enter Portal'}
            </button>
          </form>
        )}

        {/* STEP 3: VERIFY PIN */}
        {step === 'pin_verify' && (
          <form onSubmit={handlePinVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1 text-center">
                Enter 6-Digit Merchant PIN
              </label>
              <input
                type="password"
                maxLength={6}
                autoFocus
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full text-center tracking-[0.5em] text-2xl font-black bg-[#0A152B] border border-[#D4AF37]/40 rounded-xl px-4 py-3 text-[#D4AF37] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || pin.length !== 6}
              className="w-full py-3 mt-2 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50"
            >
              {loading ? 'Verifying PIN...' : 'Authorize & Open Dashboard'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#A8B0C5] hover:text-[#D4AF37] transition"
          >
            <ArrowLeft size={14} /> Return to Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
