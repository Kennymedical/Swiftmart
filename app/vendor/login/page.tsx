'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, KeyRound, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';

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
  const [isLockedOnServer, setIsLockedOnServer] = useState(false);
  const [resetRequestId, setResetRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userId, setUserId] = useState<string | null>(null);

  const maskEmail = (emailStr: string) => {
    if (!emailStr || !emailStr.includes('@')) return emailStr;
    const [local, domain] = emailStr.split('@');
    if (local.length <= 2) return local[0] + '*'.repeat(local.length - 1) + '@' + domain;
    return local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] + '@' + domain;
  };

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        if (user.email) setEmail(user.email);
        
        const { data: vendor } = await supabase
          .from('vendors')
          .select('dashboard_pin_hash, failed_pin_attempts, pin_locked_until')
          .eq('user_id', user.id)
          .maybeSingle();

        if (vendor) {
          const isLocked = Boolean(
            (vendor.pin_locked_until && new Date(vendor.pin_locked_until) > new Date()) ||
            (vendor.failed_pin_attempts && vendor.failed_pin_attempts >= 3)
          );
          if (isLocked) {
            setIsLockedOnServer(true);
            setFailedAttempts(vendor.failed_pin_attempts || 3);
            setError('PIN locked after 3 failed attempts. Paid recovery via email OTP is required.');
          } else if (vendor.failed_pin_attempts) {
            setFailedAttempts(vendor.failed_pin_attempts);
          }
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

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError || !data.user) throw new Error(signInError?.message || 'Invalid vendor credentials');
      setUserId(data.user.id);

      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('dashboard_pin_hash, failed_pin_attempts, pin_locked_until')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (vendorError || !vendor) throw new Error('Vendor profile not found');

      if (vendor.pin_locked_until && new Date(vendor.pin_locked_until) > new Date()) {
        setIsLockedOnServer(true);
        throw new Error('Account is locked. Paid recovery required.');
      }

      if (!vendor.dashboard_pin_hash) setStep('pin_create');
      else setStep('pin_verify');
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePinCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) return setError('PIN must be exactly 6 numeric digits');
    if (pin !== confirmPin) return setError('PINs do not match');
    setLoading(true);
    try {
      if (!userId) throw new Error('Session invalid');
      const res = await fetch('/api/auth/set-pin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, type: 'vendor' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save security PIN');
      sessionStorage.setItem('swiftmart_vendor_pin_verified', 'true');
      setSuccess('Security PIN established successfully!');
      setTimeout(() => router.push('/vendor'), 800);
    } catch (err: any) {
      setError(err.message || 'Failed to save security PIN');
    } finally { setLoading(false); }
  };

  const handlePinVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) return setError('Enter your 6-digit Security PIN');
    setLoading(true);
    try {
      if (!userId) throw new Error('Session expired');
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, type: 'vendor' })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.attempts) setFailedAttempts(data.attempts);
        if (data.attempts >= 3) {
          setIsLockedOnServer(true);
          throw new Error('PIN locked after 3 failed attempts. Paid recovery required.');
        }
        throw new Error(data.error || 'Incorrect PIN');
      }
      sessionStorage.setItem('swiftmart_vendor_pin_verified', 'true');
      router.push('/vendor');
    } catch (err: any) {
      setError(err.message || 'Incorrect PIN');
    } finally { setLoading(false); }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!email) throw new Error('Please enter your administrator email address');
      
      const response = await fetch('/api/auth/pin-recovery/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'vendor' }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to send OTP');

      setSuccess('If the account is eligible, a recovery code has been sent. Check your inbox.');
      setStep('forgot_otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (otpCode.length < 6) throw new Error('Please enter the verification code');
      
      // REAL SUPABASE OTP VERIFICATION
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'recovery'
      });

      if (verifyError) throw verifyError;
      if (data.user) setUserId(data.user.id);

      setSuccess('Email verified! Please complete the ₦1,000 PIN regeneration fee to proceed.');
      setStep('forgot_pay');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleFeePayment = async () => {
    setError('');
    setLoading(true);
    try {
      if (!userId) throw new Error('Session missing. Please log in again.');

      // REAL FINTECH DEBIT: Deduct ₦1,000 and log to transactions
      const { error: rpcErr } = await supabase.rpc('deduct_pin_reset_fee', { 
        p_user_id: userId 
      });

      if (rpcErr) throw new Error(rpcErr.message);
      
      setSuccess('₦1,000 successfully debited from your wallet. Enter your new Security PIN.');
      setStep('forgot_new_pin');
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) return setError('PIN must be 6 digits');
    if (pin !== confirmPin) return setError('PINs do not match');

    setLoading(true);
    try {
      if (!userId) throw new Error('User session missing. Please restart the recovery.');

      // Use the new RPC that bypasses the old pin_reset_requests table
      const { error: rpcErr } = await supabase.rpc('complete_pin_reset_by_user', { 
        p_user_id: userId, 
        p_new_pin: pin 
      });

      if (rpcErr) throw new Error(rpcErr.message);

      const recoveryResponse = await fetch('/api/auth/pin-recovery/reset-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'vendor', pin }),
      });
      const recoveryResult = await recoveryResponse.json().catch(() => ({}));
      if (!recoveryResponse.ok) throw new Error(recoveryResult.error || 'PIN was updated, but recovery finalization failed. Please contact support.');

      sessionStorage.setItem('swiftmart_pin_verified', 'true');
      setSuccess('PIN regenerated successfully! Redirecting...');
      setTimeout(() => router.push('/vendor'), 800); // Will redirect to root, layout will handle correct dashboard
    } catch (err: any) {
      setError(err.message || 'Failed to update PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D1E] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md bg-gradient-to-b from-[#142850] to-[#0A1931] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.7)] text-[#F5F7FA]">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0A1931] border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)]">
            {step === 'credentials' ? <ShieldCheck size={32} /> : <KeyRound size={32} />}
          </div>
        </div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-[#D4AF37] tracking-wider uppercase">Vendor Console</h1>
          <p className="text-xs text-[#A8B0C5] mt-1">
            {step === 'credentials' ? 'Vendor Secure Gateway' : step === 'pin_verify' ? 'Enter 6-Digit Security PIN' : step === 'pin_create' ? 'Create Console Security PIN' : step === 'forgot_email' ? 'Paid PIN Recovery (Step 1/4)' : step === 'forgot_otp' ? 'Verify Email OTP (Step 2/4)' : step === 'forgot_pay' ? 'Settlement Fee (Step 3/4)' : 'Set New PIN (Step 4/4)'}
          </p>
        </div>
        {error && <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2"><AlertCircle size={16} className="shrink-0" /><span>{error}</span></div>}
        {success && <div className="mb-4 p-3 rounded-xl bg-green-950/60 border border-green-500/40 text-green-300 text-xs flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0" /><span>{success}</span></div>}

        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div><label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Email</label><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@swiftmart.ng" className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#D4AF37]" /></div>
            <div><label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Password</label><input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#D4AF37]" /></div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50">{loading ? 'Verifying...' : 'Continue to Security PIN'}</button>
          </form>
        )}

        {step === 'pin_verify' && (
          <form onSubmit={handlePinVerify} className="space-y-4">
            <div><label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Enter 6-Digit PIN</label><input type="password" maxLength={8} required value={pin} disabled={isLockedOnServer || failedAttempts >= 3} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]" /></div>
            {isLockedOnServer || failedAttempts >= 3 ? (
              <div className="space-y-2"><p className="text-xs text-red-400 font-semibold text-center">Account PIN locked due to 3 failed attempts.</p><button type="button" onClick={() => setStep('forgot_email')} className="w-full py-3 bg-[#D4AF37] text-[#0A1931] font-bold text-xs rounded-xl shadow hover:opacity-95">Forgot PIN? Paid Email Recovery (₦1,000)</button></div>
            ) : (
              <><button type="submit" disabled={loading || pin.length !== 6} className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50">{loading ? 'Validating...' : 'Authorize Access'}</button><div className="text-center pt-2"><button type="button" onClick={() => setStep('forgot_email')} className="text-xs text-[#D4AF37] hover:underline">Forgot Security PIN?</button></div></>
            )}
          </form>
        )}

        {step === 'pin_create' && (
          <form onSubmit={handlePinCreate} className="space-y-4">
            <div><label className="block text-xs font-semibold text-[#A8B0C5] mb-1">New 6-Digit PIN</label><input type="password" maxLength={8} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]" /></div>
            <div><label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Confirm 6-Digit PIN</label><input type="password" maxLength={8} required value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]" /></div>
            <button type="submit" disabled={loading || pin.length !== 6 || pin !== confirmPin} className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:opacity-95 transition disabled:opacity-50">{loading ? 'Securing...' : 'Confirm & Enter Console'}</button>
          </form>
        )}

        {step === 'forgot_email' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-[#A8B0C5]">A verification code will be sent to your vendor email. Regeneration fee: <span className="text-[#D4AF37] font-bold">₦1,000</span>.</p>
            <div>
              <label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Registered Email</label>
              <input type="text" readOnly disabled value={maskEmail(email)} className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-xs text-gray-400 rounded-xl px-3 py-2.5 cursor-not-allowed opacity-80" />
              <p className="text-[10px] text-gray-500 mt-1">Linked to your logged-in account. Cannot be changed.</p>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase rounded-xl hover:opacity-95 transition">{loading ? 'Sending OTP...' : 'Send 10-Minute Code'}</button>
            <button type="button" onClick={() => setStep('pin_verify')} className="w-full text-center text-xs text-[#A8B0C5] hover:text-white">Back to PIN Verification</button>
          </form>
        )}

        {step === 'forgot_otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-xs text-[#A8B0C5]">Enter the verification code sent to <span className="text-white font-semibold">{maskEmail(email)}</span>.</p>
            <div><input type="text" maxLength={8} required value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} placeholder="12345678" className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]" /></div>
            <button type="submit" disabled={loading || otpCode.length < 6} className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase rounded-xl hover:opacity-95 transition">{loading ? 'Verifying...' : 'Verify OTP Code'}</button>
          </form>
        )}

        {step === 'forgot_pay' && (
          <div className="space-y-4">
            <div className="p-4 bg-[#0A152B] rounded-2xl border border-[#D4AF37]/30 text-center"><span className="text-[11px] uppercase tracking-wider text-[#A8B0C5] font-bold">Recovery Settlement</span><div className="text-2xl font-black text-white mt-1">₦1,000.00</div><p className="text-[11px] text-[#A8B0C5] mt-1">Required to generate a new Security PIN</p></div>
            <button type="button" onClick={handleFeePayment} disabled={loading} className="w-full py-3.5 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase rounded-xl hover:opacity-95 transition flex items-center justify-center gap-2"><CreditCard size={16} /><span>{loading ? 'Processing...' : 'Pay ₦1,000 via Wallet'}</span></button>
          </div>
        )}

        {step === 'forgot_new_pin' && (
          <form onSubmit={handleSaveNewPin} className="space-y-4">
            <div><label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Enter New 6-Digit PIN</label><input type="password" maxLength={8} required value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]" /></div>
            <div><label className="block text-xs font-semibold text-[#A8B0C5] mb-1">Confirm New PIN</label><input type="password" maxLength={8} required value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="w-full bg-[#0A152B] border border-[#D4AF37]/30 text-center tracking-[0.5em] text-lg font-bold text-white rounded-xl py-3 focus:outline-none focus:border-[#D4AF37]" /></div>
            <button type="submit" disabled={loading || pin.length !== 6 || pin !== confirmPin} className="w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-bold text-xs uppercase rounded-xl hover:opacity-95 transition">{loading ? 'Saving...' : 'Save & Enter Console'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
