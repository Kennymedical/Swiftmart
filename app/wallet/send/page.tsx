'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Shield, 
  Clock, 
  Building2, 
  Wallet, 
  Lock, 
  Delete, 
  Store, 
  X,
  Search,
  KeyRound
} from 'lucide-react';

export const dynamic = 'force-dynamic';

const DEFAULT_BANKS = [
  { code: '090405', name: 'Moniepoint MFB' },
  { code: '100004', name: 'OPay' },
  { code: '100033', name: 'PalmPay' },
  { code: '090267', name: 'Kuda Bank' },
  { code: '044', name: 'Access Bank' },
  { code: '058', name: 'GTBank' },
  { code: '011', name: 'First Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '033', name: 'UBA' },
  { code: '035', name: 'Wema Bank' },
];

async function hashPin(code: string): Promise<string> {
  const enc = new TextEncoder().encode(code + '_swiftmart_secret_salt_2026');
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function extractEdgeError(error: any, fallback: string): Promise<string> {
  if (!error) return fallback;
  try {
    if (error.context && typeof error.context.json === 'function') {
      const body = await error.context.json();
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    }
  } catch (_) {}
  return error.message || fallback;
}

interface ToastNotice {
  message: string;
  type: 'error' | 'success';
}

interface ResolvedBeneficiary {
  name: string;
  username?: string;
  isVendor?: boolean;
  shopName?: string | null;
}

function SendTransferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<'user' | 'bank'>(
    searchParams.get('mode') === 'bank' ? 'bank' : 'user'
  );
  const [step, setStep] = useState(1);
  const [banks, setBanks] = useState(DEFAULT_BANKS);
  
  // User/Bank form
  const [username, setUsername] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  
  // Resolution state
  const [beneficiary, setBeneficiary] = useState<ResolvedBeneficiary | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  
  // Amount & Wallet
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Floating Toast (Never pushes down content)
  const [toast, setToast] = useState<ToastNotice | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // PIN security states
  const [savedPinHash, setSavedPinHash] = useState<string | null>(null);
  const [pinStep, setPinStep] = useState<'enter' | 'create_enter' | 'create_confirm'>('enter');
  const [tempCreatedPin, setTempCreatedPin] = useState('');
  const [pin, setPin] = useState('');
  
  // Submitting / Receipt
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txReceipt, setTxReceipt] = useState<any>(null);

  // Load Banks, Wallet Balance & User PIN metadata
  useEffect(() => {
    supabase.functions
      .invoke('resolve-account?action=banks', { method: 'GET' })
      .then(({ data }) => data?.banks?.length && setBanks(data.banks))
      .catch(() => {});

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Check transaction PIN in metadata
      const pinHash = user.user_metadata?.transaction_pin_hash || null;
      setSavedPinHash(pinHash);
      if (!pinHash) {
        setPinStep('create_enter');
      } else {
        setPinStep('enter');
      }

      // Check wallet balance
      const { data } = await supabase
        .from('wallets')
        .select('balance_kobo')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) setWalletBalance((data.balance_kobo || 0) / 100);
    })();
  }, []);

  // Bank Account Resolver (triggers when 10 digits & bank selected)
  useEffect(() => {
    if (mode === 'bank' && accountNumber.length === 10 && bankCode) {
      setIsResolving(true);
      setBeneficiary(null);
      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke('resolve-account', {
            body: { bankCode, accountNumber },
          });

          if (error) {
            const realError = await extractEdgeError(error, 'Bank resolution service error');
            showToast(realError, 'error');
          } else if (data?.error) {
            showToast(data.error, 'error');
          } else if (data?.accountName) {
            setBeneficiary({
              name: data.accountName,
            });
            showToast('Account resolved: ' + data.accountName, 'success');
          } else {
            showToast('Could not resolve account name. Verify bank and account number.', 'error');
          }
        } catch (err: any) {
          const msg = await extractEdgeError(err, 'Verification service error');
          showToast(msg, 'error');
        } finally {
          setIsResolving(false);
        }
      })();
    }
  }, [accountNumber, bankCode, mode]);

  // Debounced P2P username verification helper
  const verifyP2PUsername = async (silent = false) => {
    const clean = username.replace(/^@/, '').trim();
    if (clean.length < 3) {
      if (!silent) showToast('Enter at least 3 characters for username', 'error');
      return;
    }

    setIsResolving(true);
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, full_name, username')
        .ilike('username', clean)
        .maybeSingle();

      if (error || !profile) {
        setBeneficiary(null);
        if (!silent) showToast(`SwiftMART user "@${clean}" not found`, 'error');
      } else {
        // Check if user is also a vendor store
        const { data: vendorData } = await supabase
          .from('vendors')
          .select('business_name')
          .eq('user_id', profile.id)
          .maybeSingle();

        setBeneficiary({
          name: profile.full_name || `@${profile.username}`,
          username: profile.username,
          isVendor: !!vendorData?.business_name,
          shopName: vendorData?.business_name || null,
        });
        showToast(
          `Found: ${profile.full_name || profile.username}${vendorData?.business_name ? ` (Store: ${vendorData.business_name})` : ''}`,
          'success'
        );
      }
    } catch (err: any) {
      if (!silent) showToast(err.message || 'Error looking up username', 'error');
    } finally {
      setIsResolving(false);
    }
  };

  // Debounce P2P lookup while typing WITHOUT popping errors
  useEffect(() => {
    if (mode !== 'user') return;
    setBeneficiary(null);
    const clean = username.replace(/^@/, '').trim();
    if (clean.length < 3) return;

    const timer = setTimeout(() => {
      verifyP2PUsername(true); // silent check on debounce
    }, 800);

    return () => clearTimeout(timer);
  }, [username, mode]);

  const numAmt = parseFloat(amount) || 0;
  const fee = mode === 'user' ? 0 : numAmt >= 10000 ? 70.8 : 20.8;
  const totalDebit = numAmt > 0 ? numAmt + fee : 0;
  const isInsufficient = numAmt > 0 && totalDebit > walletBalance;

  // PIN Keypad handler
  const handlePinDigit = async (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);

      if (nextPin.length === 4) {
        if (!savedPinHash) {
          // Setting up new PIN
          if (pinStep === 'create_enter') {
            setTempCreatedPin(nextPin);
            setPin('');
            setPinStep('create_confirm');
            showToast('Re-enter the same 4 digits to confirm', 'success');
          } else if (pinStep === 'create_confirm') {
            if (nextPin !== tempCreatedPin) {
              setPin('');
              setPinStep('create_enter');
              setTempCreatedPin('');
              showToast('PINs did not match! Please choose your 4-digit PIN again.', 'error');
            } else {
              // Hash and save PIN
              setIsSubmitting(true);
              try {
                const hashed = await hashPin(nextPin);
                const { error } = await supabase.auth.updateUser({
                  data: { transaction_pin_hash: hashed },
                });
                if (error) throw error;
                setSavedPinHash(hashed);
                showToast('Transaction PIN created successfully! Authorizing transfer...', 'success');
                // Proceed to execute transfer
                await executeTransfer();
              } catch (err: any) {
                showToast(err.message || 'Failed to save transaction PIN', 'error');
                setIsSubmitting(false);
                setPin('');
              }
            }
          }
        } else {
          // Verifying existing PIN
          const enteredHash = await hashPin(nextPin);
          if (enteredHash !== savedPinHash) {
            setPin('');
            showToast('Incorrect Transaction PIN. Please try again.', 'error');
          } else {
            // Authorized!
            await executeTransfer();
          }
        }
      }
    }
  };

  const executeTransfer = async () => {
    setIsSubmitting(true);
    try {
      const targetUsername = (beneficiary?.username || username).replace(/^@/, '').trim().toLowerCase();
      const body =
        mode === 'user'
          ? {
              recipientUsername: targetUsername,
              amountKobo: Math.round(numAmt * 100),
            }
          : {
              bankCode,
              bankName,
              accountNumber,
              accountName: beneficiary?.name,
              amountKobo: Math.round(numAmt * 100),
            };

      const { data, error } = await supabase.functions.invoke('wallet-transfer', { body });
      if (error) {
        const errorMsg = await extractEdgeError(error, 'Transfer failed');
        throw new Error(errorMsg);
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      setTxReceipt({
        id: data?.reference || `TRX-${Date.now()}`,
        recipientName: beneficiary?.name,
        accountNumber: mode === 'user' ? `@${targetUsername}` : `${accountNumber} • ${bankName}`,
        amount: numAmt,
        fee,
        total: totalDebit,
        date: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
        status: mode === 'user' ? 'SUCCESSFUL' : 'PROCESSING',
      });
      showToast('Transfer submitted successfully!', 'success');
      setTimeout(() => {
        setIsSubmitting(false);
        setStep(6);
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      setPin('');
      showToast(err.message || 'Transfer failed. Check your wallet balance.', 'error');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0A1028] text-white flex flex-col font-sans relative">
      {/* FLOATING TOAST NOTIFICATION ON TOP OF SCREEN (DOES NOT PUSH DOWN CONTENT) */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto pointer-events-auto animate-in slide-in-from-top-3 duration-200">
          <div
            className={`p-4 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 border ${
              toast.type === 'error'
                ? 'bg-red-950/95 border-red-500/80 text-white shadow-red-950/60'
                : 'bg-emerald-950/95 border-emerald-500/80 text-white shadow-emerald-950/60'
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'error' ? (
                <AlertCircle size={22} className="text-red-400 shrink-0" />
              ) : (
                <CheckCircle2 size={22} className="text-emerald-400 shrink-0" />
              )}
              <p className="text-xs font-semibold leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-white/60 hover:text-white p-1 rounded-lg shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0A1028]/95 px-4 py-3.5 border-b border-[#D4AF37]/20 flex items-center justify-between backdrop-blur-md">
        <button
          onClick={() => (step > 1 && step < 6 ? setStep(step - 1) : router.push('/wallet'))}
          className="p-2 rounded-full bg-[#151B3D] text-[#D4AF37] border border-[#D4AF37]/30 hover:brightness-110 active:scale-95"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-bold text-white uppercase tracking-wider">
          {mode === 'user' ? 'P2P Transfer' : 'Bank Transfer'}
        </h1>
        <div className="w-8" />
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col justify-between">
        {step === 1 && (
          <div className="space-y-4">
            {/* Mode Switcher */}
            <div className="flex bg-[#151B3D] border border-[#D4AF37]/30 rounded-xl p-1 text-xs">
              <button
                onClick={() => {
                  setMode('user');
                  setBeneficiary(null);
                }}
                className={`flex-1 py-2.5 rounded-lg font-bold transition-all ${
                  mode === 'user' ? 'bg-[#F5C445] text-black shadow-md' : 'text-[#A0A3B1]'
                }`}
              >
                P2P (Username)
              </button>
              <button
                onClick={() => {
                  setMode('bank');
                  setBeneficiary(null);
                }}
                className={`flex-1 py-2.5 rounded-lg font-bold transition-all ${
                  mode === 'bank' ? 'bg-[#F5C445] text-black shadow-md' : 'text-[#A0A3B1]'
                }`}
              >
                Bank Account
              </button>
            </div>

            {mode === 'user' ? (
              <div className="space-y-2">
                <label className="text-xs text-[#A0A3B1] font-medium">Recipient SwiftMART Username</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && verifyP2PUsername(false)}
                    placeholder="@username (e.g. @john)"
                    className="w-full bg-[#151B3D] border border-[#D4AF37]/30 focus:border-[#F5C445] text-white text-base px-4 py-3.5 pr-24 rounded-2xl outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => verifyP2PUsername(false)}
                    disabled={isResolving || username.trim().length < 3}
                    className="absolute right-2 px-3.5 py-2 bg-[#F5C445] text-black rounded-xl text-xs font-bold disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Search size={14} />
                    {isResolving ? 'Checking...' : 'Verify'}
                  </button>
                </div>
                <p className="text-[11px] text-[#A0A3B1]">Type the username and tap Verify, or pause to auto-check.</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs text-[#A0A3B1] font-medium">Account Number (10 digits)</label>
                  <input
                    type="text"
                    maxLength={10}
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="0123456789"
                    className="w-full bg-[#151B3D] border border-[#D4AF37]/30 focus:border-[#F5C445] text-white text-lg px-4 py-3.5 rounded-2xl outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-[#A0A3B1] font-medium">Select Bank</label>
                  <div className="relative">
                    <select
                      value={bankCode}
                      onChange={(e) => {
                        const b = banks.find((x) => x.code === e.target.value);
                        setBankCode(e.target.value);
                        setBankName(b?.name || '');
                      }}
                      className="w-full bg-[#151B3D] border border-[#D4AF37]/30 text-white text-sm px-4 py-3.5 rounded-2xl outline-none appearance-none"
                    >
                      <option value="">Choose bank...</option>
                      {banks.map((b) => (
                        <option key={b.code} value={b.code} className="bg-[#0A1028]">
                          {b.name}
                        </option>
                      ))}
                    </select>
                    <Building2 size={18} className="absolute right-4 top-4 text-[#D4AF37] pointer-events-none" />
                  </div>
                </div>
              </>
            )}

            {isResolving && (
              <p className="text-xs text-[#F5C445] animate-pulse flex items-center gap-1.5 py-1">
                <span className="w-2 h-2 rounded-full bg-[#F5C445] animate-ping" />
                Verifying {mode === 'user' ? 'SwiftMART username' : 'bank account'}...
              </p>
            )}

            {/* Resolved Beneficiary Card with Vendor Shop Name Display */}
            {beneficiary && !isResolving && (
              <div className="p-4 bg-[#151B3D] border border-[#D4AF37]/60 rounded-2xl flex items-start justify-between shadow-lg">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#A0A3B1] tracking-wider">
                    Verified Beneficiary
                  </span>
                  <p className="text-base font-extrabold text-[#F5C445]">{beneficiary.name}</p>
                  {beneficiary.isVendor && beneficiary.shopName && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                      <Store size={14} className="shrink-0 text-emerald-300" />
                      <span>Store: {beneficiary.shopName} (Vendor)</span>
                    </div>
                  )}
                </div>
                <CheckCircle2 size={22} className="text-[#F5C445] shrink-0 mt-0.5" />
              </div>
            )}

            <button
              onClick={() => {
                if (!beneficiary) {
                  showToast(
                    mode === 'user'
                      ? 'Please verify the recipient username first'
                      : 'Please enter a valid 10-digit account and bank',
                    'error'
                  );
                  return;
                }
                setStep(mode === 'user' ? 3 : 2);
              }}
              disabled={!beneficiary}
              className="w-full mt-4 py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm disabled:opacity-40 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F5C445]/20"
            >
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-2xl flex gap-3 text-xs text-[#A0A3B1]">
              <Shield size={22} className="text-[#D4AF37] shrink-0" />
              <p>Confirm the external recipient account details before proceeding to amount.</p>
            </div>
            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-3 text-sm">
              <div>
                <p className="text-[10px] text-[#A0A3B1]">BENEFICIARY NAME</p>
                <p className="font-bold text-white text-base">{beneficiary?.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-[#A0A3B1]">DESTINATION</p>
                <p className="font-mono font-bold text-[#F5C445]">
                  {accountNumber} • {bankName}
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep(3)}
              className="w-full py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all"
            >
              Confirm & Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="text-center py-2">
              <span className="text-xs text-[#D4AF37] uppercase font-bold tracking-wider">Specify Amount</span>
              <div className="mt-3 flex items-center justify-center border-b-2 border-[#D4AF37] pb-2 max-w-[260px] mx-auto">
                <span className="text-2xl text-white mr-1 font-bold">₦</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-center text-3xl font-extrabold text-white outline-none"
                  autoFocus
                />
              </div>

              {/* Dedicated subtle balance display below amount to avoid DOM jumping */}
              <div className="mt-2 h-5 flex items-center justify-center">
                {isInsufficient ? (
                  <span className="text-xs font-semibold text-red-400">
                    ⚠️ Insufficient balance (Available: ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })})
                  </span>
                ) : (
                  <span className="text-xs text-[#A0A3B1]">
                    Available: ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-[#A0A3B1]">
                <span>Processing Fee:</span>
                <span className="text-white font-semibold">
                  {fee === 0 ? 'FREE (P2P)' : `₦${fee.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between font-bold text-[#F5C445] text-sm pt-2 border-t border-[#D4AF37]/15">
                <span>Total Debit:</span>
                <span>₦{totalDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <Wallet size={20} className="text-[#D4AF37]" />
                <div>
                  <p className="font-bold text-white">SwiftMART Wallet</p>
                  <p className="text-[#A0A3B1]">
                    Balance: ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full border border-[#D4AF37]/30 font-bold">
                Source
              </span>
            </div>

            <button
              onClick={() => {
                if (numAmt <= 0) {
                  showToast('Please enter an amount to transfer', 'error');
                  return;
                }
                if (totalDebit > walletBalance) {
                  showToast(
                    `Insufficient balance. You need ₦${totalDebit.toLocaleString()}, but have ₦${walletBalance.toLocaleString()}.`,
                    'error'
                  );
                  return;
                }
                setStep(4);
              }}
              className="w-full py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F5C445]/20"
            >
              Continue
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-white">Review Transfer Details</h2>
            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-3.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10">
                <span className="text-[#A0A3B1]">Beneficiary:</span>
                <span className="font-bold text-white text-right">{beneficiary?.name}</span>
              </div>
              {beneficiary?.isVendor && beneficiary.shopName && (
                <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10">
                  <span className="text-[#A0A3B1]">Store:</span>
                  <span className="font-bold text-emerald-400 text-right">{beneficiary.shopName}</span>
                </div>
              )}
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10">
                <span className="text-[#A0A3B1]">Destination:</span>
                <span className="font-mono text-white text-right">
                  {mode === 'user' ? `@${username.replace(/^@/, '')}` : `${accountNumber} • ${bankName}`}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10">
                <span className="text-[#A0A3B1]">Amount:</span>
                <span className="font-bold text-white">
                  ₦{numAmt.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10">
                <span className="text-[#A0A3B1]">Fee:</span>
                <span>{fee === 0 ? 'FREE' : `₦${fee.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[#F5C445] pt-1">
                <span>Total Debit:</span>
                <span>₦{totalDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setPin('');
                setStep(5);
              }}
              className="w-full py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F5C445]/20"
            >
              Proceed to PIN Authorization
            </button>
          </div>
        )}

        {/* EXPANDED PIN KEYPAD & SETUP / VERIFICATION FLOW */}
        {step === 5 && (
          <div className="space-y-6 flex flex-col justify-between flex-1 py-2">
            <div className="text-center pt-2">
              <div className="w-12 h-12 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/40 flex items-center justify-center mx-auto mb-3">
                {savedPinHash ? (
                  <Lock size={22} className="text-[#F5C445]" />
                ) : (
                  <KeyRound size={22} className="text-[#F5C445]" />
                )}
              </div>

              {!savedPinHash ? (
                <div>
                  <h2 className="text-xl font-black text-white">
                    {pinStep === 'create_enter' ? 'Create Transaction PIN' : 'Confirm Transaction PIN'}
                  </h2>
                  <p className="text-xs text-[#A0A3B1] mt-1 max-w-xs mx-auto">
                    {pinStep === 'create_enter'
                      ? 'You have not set a transaction PIN. Choose a 4-digit secret code for all wallet operations.'
                      : 'Re-enter your 4-digit code to confirm and save it.'}
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-black text-white">Enter Transaction PIN</h2>
                  <p className="text-xs text-[#A0A3B1] mt-1">
                    Authorize transfer of ₦{totalDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>

            {/* EXPANDED PIN DISPLAY BOXES */}
            <div className="flex justify-center gap-4 py-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-3xl font-extrabold transition-all duration-200 ${
                    pin.length > i
                      ? 'border-2 border-[#F5C445] bg-[#D4AF37]/15 text-[#F5C445] shadow-lg shadow-[#F5C445]/10'
                      : 'bg-[#151B3D] border border-[#D4AF37]/30 text-white'
                  }`}
                >
                  {pin.length > i ? '●' : ''}
                </div>
              ))}
            </div>

            {isSubmitting ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-8 h-8 border-3 border-[#F5C445] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-[#F5C445] font-bold tracking-wider">
                  {!savedPinHash ? 'Securing PIN & submitting...' : 'Processing transfer securely...'}
                </p>
              </div>
            ) : (
              /* EXPANDED FULL-WIDTH KEYPAD FOR COMFORTABLE MOBILE TYPING */
              <div className="w-full max-w-sm mx-auto grid grid-cols-3 gap-3 md:gap-4 pb-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handlePinDigit(digit)}
                    className="h-16 md:h-18 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/25 text-2xl font-black text-white hover:bg-[#1C2450] hover:border-[#F5C445] active:scale-95 transition-all shadow-md shadow-black/30 flex items-center justify-center"
                  >
                    {digit}
                  </button>
                ))}
                <div />
                <button
                  type="button"
                  onClick={() => handlePinDigit('0')}
                  className="h-16 md:h-18 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/25 text-2xl font-black text-white hover:bg-[#1C2450] hover:border-[#F5C445] active:scale-95 transition-all shadow-md shadow-black/30 flex items-center justify-center"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => setPin((p) => p.slice(0, -1))}
                  className="h-16 md:h-18 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/25 flex items-center justify-center text-[#A0A3B1] hover:text-white hover:border-[#F5C445] active:scale-95 transition-all shadow-md shadow-black/30"
                >
                  <Delete size={24} />
                </button>
              </div>
            )}
          </div>
        )}

        {step === 6 && txReceipt && (
          <div className="space-y-5 animate-in zoom-in-95">
            <div className="text-center pt-2">
              <Clock size={40} className="text-[#F5C445] animate-pulse mx-auto mb-2" />
              <h2 className="text-2xl font-black text-white">
                {mode === 'user' ? 'Transfer Successful!' : 'Processing Payout'}
              </h2>
              <p className="text-xs text-[#A0A3B1] mt-1">
                {mode === 'user'
                  ? 'Funds credited instantly to user wallet.'
                  : 'Recipient bank will receive funds in 2-5 minutes.'}
              </p>
            </div>
            <div className="bg-[#151B3D] border border-[#D4AF37]/40 rounded-2xl p-5 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#D4AF37]/15">
                <span>Status:</span>
                <span className="px-3 py-1 rounded-full bg-[#D4AF37]/20 text-[#F5C445] font-extrabold text-[11px]">
                  {txReceipt.status}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/15">
                <span className="text-[#A0A3B1]">Reference:</span>
                <span className="font-mono text-white">{txReceipt.id}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/15">
                <span className="text-[#A0A3B1]">Beneficiary:</span>
                <span className="font-bold text-white">{txReceipt.recipientName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/15">
                <span className="text-[#A0A3B1]">Destination:</span>
                <span>{txReceipt.accountNumber}</span>
              </div>
              <div className="flex justify-between font-bold text-white text-sm">
                <span>Amount:</span>
                <span>₦{txReceipt.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
            <button
              onClick={() => router.push('/wallet')}
              className="w-full py-4 rounded-full bg-[#F5C445] text-black text-sm font-extrabold hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F5C445]/20"
            >
              Return to Wallet
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function BankTransferFlow() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0A1028] text-white flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <SendTransferContent />
    </Suspense>
  );
}
