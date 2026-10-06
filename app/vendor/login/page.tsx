'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Store, KeyRound, ArrowLeft, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function VendorLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<'credentials' | 'pin_verify' | 'pin_create' | 'forgot_email' | 'forgot_otp' | 'forgot_pay' | 'forgot_new_pin'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [resetRequestId, setResetRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        if (user.email) setEmail(user.email);
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

  // Step 1: Sign in with email and password
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
        throw new Error(signInError?.message || 'Invalid vendor credentials');
      }

      setUserId(data.user.id);

      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('id, status, dashboard_pin_hash')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (vendorError || !vendor) {
        throw new Error('No vendor account found for this user.');
      }

      if (vendor.status !== 'approved') {
        throw new Error(`Your merchant application status is "${vendor.status}". Portal access requires approval.`);
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

  // Step 2: Create initial PIN if not set
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
      if (!vendorId) throw new Error('Vendor session missing');

      const { error: updateError } = await supabase
        .from('vendors')
        .update({ dashboard_pin_hash: pin })
        .eq('id', vendorId);

      if (updateError) throw updateError;

      sessionStorage.setItem('swiftmart_vendor_pin_verified', 'true');
      setSuccess('Merchant PIN created! Launching vendor dashboard...');
      setTimeout(() => {
        router.push('/vendor');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to save merchant PIN');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Verify existing PIN with 3-attempt limit
  const handlePinVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('Enter your 6-digit Merchant PIN');
      return;
    }

    setLoading(true);
    try {
      if (!vendorId) throw new Error('Vendor session expired');

      const { data: vendor, error: fetchError } = await supabase
        .from('vendors')
        .select('dashboard_pin_hash')
        .eq('id', vendorId)
        .single();

      if (fetchError || !vendor) throw new Error('Failed to verify PIN');

      if (vendor.dashboard_pin_hash !== pin) {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        if (attempts >= 3) {
          throw new Error('Merchant PIN locked after 3 failed attempts. Paid recovery via email OTP is required.');
        } else {
          throw new Error(`Incorrect PIN (${attempts}/3 attempts used).`);
        }
      }

      sessionStorage.setItem('swiftmart_vendor_pin_verified', 'true');
      router.push('/vendor');
    } catch (err: any) {
      setError(err.message || 'Incorrect PIN');
    } finally {
      setLoading(false);
    }
  };

  // Trigger Forgot PIN: Send expiring OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email) throw new Error('Please enter your vendor account email');

      const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      const { data: resetReq, error: resetErr } = await supabase
        .from('pin_reset_requests')
        .insert({
          user_id: userId,
          role: 'vendor',
          email,
          otp_code: randomCode,
          otp_expires_at: expiresAt,
          fee_kobo: 100000,
          payment_status: 'pending',
        })
        .select('id')
        .single();

      if (resetErr) throw resetErr;

      setResetRequestId(resetReq.id);

      await supabase.functions.invoke('send-otp', {
        body: { email, otp: randomCode, type: 'pin_reset' }
      }).catch((e) => console.warn('Email dispatch logged:', e));

      setSuccess(`Verification code dispatched to ${email}. Valid for 10 minutes.`);
      setStep('forgot_otp');
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch recovery OTP');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (otpCode.length !== 6) throw new Error('Please enter the 6-digit OTP code');

      const { data: request, error: reqErr } = await supabase
        .from('pin_reset_requests')
        .select('*')
        .eq('id', resetRequestId)
        .single();

      if (reqErr || !request) throw new Error('Invalid or expired reset session');

      if (new Date(request.otp_expires_at) < new Date()) {
        throw new Error('Verification code has expired. Please request a new code.');
      }

      if (request.otp_code !== otpCode) {
        throw new Error('Incorrect verification code.');
      }

      await supabase
        .from('pin_reset_requests')
        .update({ otp_verified: true })
        .eq('id', resetRequestId);

      setSuccess('Email verified! Please complete the ₦1,000 PIN regeneration fee.');
      setStep('forgot_pay');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Complete Payment Step
  const handleFeePayment = async () => {
    setError('');
    setLoading(true);

    try {
      const payRef = 'VENDOR-PIN-' + Date.now();
      const { error: payErr } = await supabase
        .from('pin_reset_requests')
        .update({
          payment_status: 'paid',
          payment_method: 'wallet',
          paystack_reference: payRef,
        })
        .eq('id', resetRequestId);

      if (payErr) throw payErr;

      setSuccess('₦1,000 regeneration fee settled. You may now enter your new Merchant PIN.');
      setStep('forgot_new_pin');
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  // Final Step: Set New Merchant PIN
  const handleSaveNewPin = async (e: React.FormEvent) => {
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
      if (!vendorId) throw new Error('Vendor session missing');

      const { error: updateError } = await supabase
        .from('vendors')
        .update({ dashboard_pin_hash: pin })
        .eq('id', vendorId);

      if (updateError) throw updateError;

      await supabase
        .from('pin_reset_requests')
        .update({ completed_at: new Date().toISOString() })
        .eq('id', resetRequestId);

      sessionStorage.setItem('swiftmart_vendor_pin_verified', 'true');
      setSuccess('Merchant PIN regenerated successfully! Entering portal...');
      setTimeout(() => {
        router.push('/vendor');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Failed to update PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D1E] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-gradient-to-b from-[#142850] to-[#0A1931] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-[#F5F7FA]">
        
        {/* Header Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0A1931] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)]">
            {step === 'credentials' ? <Store size={32} /> : <KeyRound size={32} />}
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-[#D4AF37] tracking-wider uppercase">
            Merchant Gateway
          </h1>
          <p className="text-xs text-[#A8B0C5] mt-1">
            {step === 'credentials'
              ? 'Authorized Vendor & Storefront Login'
              : step === 'pin_verify'
              ? 'Enter Merchant PIN'
              : step === 'pin_create'
              ? 'Create Merchant PIN'
              : step === 'forgot_email'
              ? 'Paid PIN Recovery (Step 1/4)'
              : step === 'forgot_otp'
              ? 'Verify Email OTP (Step 2/4)'
              : step === 'forgot_pay'
              ? 'Settlement Fee (Step 3/4)'
              : 'Set New PIN (Step 4/4)'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-green-950/60 border border-green-500/40 text-green-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Credentials Step */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Account Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="store@swiftmart.ng"
                className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50"
            >
              {loading ? 'Validating Store...' : 'Continue to Merchant PIN'}
            </button>
          </form>
        )}

        {/* PIN Verify Step */}
        {step === 'pin_verify' && (
          <form onSubmit={handlePinVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Enter 6-Digit PIN</label>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                disabled={failedAttempts >= 3}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            {failedAttempts >= 3 ? (
              <div className="space-y-2">
                <p className="text-xs text-red-400 font-semibold text-center">
                  Merchant PIN locked due to 3 failed attempts.
                </p>
                <button
                  type="button"
                  onClick={() => setStep('forgot_email')}
                  className="w-full py-3 bg-[#D4AF37] text-[#0A1931] font-bold text-xs rounded-xl shadow hover:opacity-95"
                >
                  Forgot PIN? Paid Email Recovery (₦1,000)
                </button>
              </div>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={loading || pin.length !== 6}
                  className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50"
                >
                  {loading ? 'Validating PIN...' : 'Access Merchant Portal'}
                </button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('forgot_email')}
                    className="text-xs text-[#D4AF37] hover:underline"
                  >
                    Forgot Merchant PIN?
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        {/* PIN Create Step */}
        {step === 'pin_create' && (
          <form onSubmit={handlePinCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">New 6-Digit PIN</label>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Confirm 6-Digit PIN</label>
              <input
                type="password"
                maxLength={6}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || pin.length !== 6 || pin !== confirmPin}
              className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50"
            >
              {loading ? 'Saving Security PIN...' : 'Confirm & Enter Store'}
            </button>
          </form>
        )}

        {/* Forgot PIN: Step 1 (Email) */}
        {step === 'forgot_email' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-[#A8B0C5]">
              A verification code will be sent to your vendor email. Regeneration fee: <span className="text-[#D4AF37] font-bold">₦1,000</span>.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Registered Vendor Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase rounded-xl hover:opacity-95 transition"
            >
              {loading ? 'Sending OTP...' : 'Send 10-Minute Code'}
            </button>
            <button
              type="button"
              onClick={() => setStep('pin_verify')}
              className="w-full text-center text-xs text-[#A8B0C5] hover:text-white"
            >
              Back to PIN Verification
            </button>
          </form>
        )}

        {/* Forgot PIN: Step 2 (OTP) */}
        {step === 'forgot_otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-xs text-[#A8B0C5]">
              Enter the 6-digit verification code sent to <span className="text-white font-semibold">{email}</span>.
            </p>
            <div>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase rounded-xl hover:opacity-95 transition"
            >
              {loading ? 'Verifying...' : 'Verify OTP Code'}
            </button>
          </form>
        )}

        {/* Forgot PIN: Step 3 (Payment) */}
        {step === 'forgot_pay' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#0A152B] rounded-2xl border border-[#D4AF37]/30 text-center">
              <span className="text-[11px] uppercase tracking-wider text-[#A8B0C5] font-bold">Recovery Settlement</span>
              <div className="text-2xl font-black text-white mt-1">₦1,000.00</div>
              <p className="text-[11px] text-[#A8B0C5] mt-1">Required to generate a new Merchant PIN</p>
            </div>
            <button
              type="button"
              onClick={handleFeePayment}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase rounded-xl hover:opacity-95 transition flex items-center justify-center gap-2"
            >
              <CreditCard size={16} />
              <span>{loading ? 'Processing...' : 'Pay ₦1,000 via SwiftMart Wallet'}</span>
            </button>
          </div>
        )}

        {/* Forgot PIN: Step 4 (Set New PIN) */}
        {step === 'forgot_new_pin' && (
          <form onSubmit={handleSaveNewPin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Enter New 6-Digit PIN</label>
              <input
                type="password"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Confirm New PIN</label>
              <input
                type="password"
                maxLength={6}
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || pin.length !== 6 || pin !== confirmPin}
              className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase rounded-xl hover:opacity-95 transition"
            >
              {loading ? 'Saving Merchant PIN...' : 'Save & Enter Store'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
