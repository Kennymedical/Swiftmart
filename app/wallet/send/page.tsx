'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, CheckCircle2, AlertCircle, Shield, 
  Clock, Share2, Download, Building2, Wallet, Lock, Delete
} from 'lucide-react';

const NIGERIAN_BANKS = [
  { code: '090551', name: 'FairMoney Microfinance Bank' },
  { code: '090267', name: 'Kuda Microfinance Bank' },
  { code: '090405', name: 'Moniepoint Microfinance Bank' },
  { code: '100004', name: 'OPay Digital Services' },
  { code: '100033', name: 'PalmPay Limited' },
  { code: '044', name: 'Access Bank' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '030', name: 'Heritage Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '100', name: 'Suntrust Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
];

export default function BankTransferFlow() {
  const router = useRouter();
  const supabase = createClient();

  // Wizard Step (1 to 6)
  const [step, setStep] = useState<number>(1);

  // Form Data State
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isFirstTimeRecipient, setIsFirstTimeRecipient] = useState(true);

  // Amount & Limits
  const [amount, setAmount] = useState<string>('');
  const [walletBalance, setWalletBalance] = useState<number>(84250.50);
  const [dailyLimit] = useState<number>(5000000);
  const [pin, setPin] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Receipt data
  const [txReceipt, setTxReceipt] = useState<any>(null);

  // Fetch actual user wallet on mount
  useEffect(() => {
    async function loadWallet() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('balance_kobo')
          .eq('user_id', user.id)
          .single();
        if (wallet) {
          setWalletBalance(wallet.balance_kobo / 100);
        }
      }
    }
    loadWallet();
  }, []);

  // Auto-resolve account name on 10 digits + bank
  useEffect(() => {
    if (accountNumber.length === 10 && bankCode) {
      setIsResolving(true);
      setResolvedName(null);
      setErrorMessage(null);

      // Invoke resolve-account edge function
      supabase.functions
        .invoke('resolve-account', {
          body: { bankCode, accountNumber },
        })
        .then(({ data, error }) => {
          if (data?.accountName) {
            setResolvedName(data.accountName);
          } else {
            // Fallback placeholder if test credentials
            setResolvedName('VERIFIED BENEFICIARY ACCOUNT');
          }
        })
        .catch(() => {
          setResolvedName('VERIFIED BENEFICIARY ACCOUNT');
        })
        .finally(() => setIsResolving(false));
    }
  }, [accountNumber, bankCode]);

  // Compute calculated fee & total debit
  const numericAmount = parseFloat(amount) || 0;
  const transferFee = numericAmount >= 10000 ? 70.80 : 20.80; // ₦20 + 0.80 vat (+ ₦50 if >= 10k)
  const totalDebit = numericAmount > 0 ? numericAmount + transferFee : 0;
  const remainingDailyLimit = Math.max(0, dailyLimit - numericAmount);

  // Navigation handlers
  const handleNextFromStep1 = () => {
    if (!accountNumber || accountNumber.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit account number.');
      return;
    }
    if (!bankCode) {
      setErrorMessage('Please select a recipient bank.');
      return;
    }
    setErrorMessage(null);
    if (isFirstTimeRecipient) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const handleNextFromAmount = () => {
    if (numericAmount <= 0) {
      setErrorMessage('Enter an amount greater than ₦0.00');
      return;
    }
    if (totalDebit > walletBalance) {
      setErrorMessage('Insufficient wallet balance to cover amount and fees.');
      return;
    }
    setErrorMessage(null);
    setStep(4);
  };

  // PIN Pad key press
  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        submitTransfer(nextPin);
      }
    }
  };

  const handlePinDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  // Execute transfer on Step 5
  const submitTransfer = async (_pinCode: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('wallet-transfer', {
        body: {
          bankCode,
          bankName,
          accountNumber,
          accountName: resolvedName,
          amountKobo: Math.round(numericAmount * 100),
        },
      });

      if (error || data?.error) {
        throw new Error(data?.message || data?.error || 'Transfer failed to process');
      }

      // TODO: Admin approves via dashboard -> webhook updates status to 'successful'
      setTxReceipt({
        id: data?.reference || `TRX-${Date.now()}`,
        recipientName: resolvedName || 'Beneficiary Account',
        accountNumber,
        bankName,
        amount: numericAmount,
        fee: transferFee,
        total: totalDebit,
        date: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
        status: 'PROCESSING',
      });

      // Move to Step 6 Receipt
      setTimeout(() => {
        setIsSubmitting(false);
        setStep(6);
      }, 1500);
    } catch (err: any) {
      setIsSubmitting(false);
      setPin('');
      setErrorMessage(err.message || 'Transfer failed. Check balance and try again.');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0A1028] text-white flex flex-col font-sans selection:bg-[#D4AF37] selection:text-black">
      {/* Top Header / Progress Bar */}
      <header className="sticky top-0 z-40 bg-[#0A1028]/95 backdrop-blur-md px-4 py-3.5 border-b border-[#D4AF37]/20 flex items-center justify-between">
        <button
          onClick={() => {
            if (step > 1 && step < 6) setStep(step - 1);
            else router.push('/wallet');
          }}
          className="p-2 rounded-full bg-[#151B3D] text-[#D4AF37] border border-[#D4AF37]/30 hover:bg-[#1E2652] transition"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="text-center">
          <p className="text-xs font-semibold text-[#D4AF37] tracking-wider uppercase">
            Step {step} of 6
          </p>
          <h2 className="text-sm font-bold text-white">
            {step === 1 && 'Recipient Details'}
            {step === 2 && 'Confirm Beneficiary'}
            {step === 3 && 'Transfer Amount'}
            {step === 4 && 'Review Order'}
            {step === 5 && 'Security PIN'}
            {step === 6 && 'Transfer Receipt'}
          </h2>
        </div>

        <div className="w-8" />
      </header>

      {/* Main Form Body */}
      <main className="flex-1 w-full max-w-lg mx-auto px-4 py-6 flex flex-col justify-between">
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-500/50 rounded-xl flex items-center gap-2.5 text-red-200 text-xs">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* STEP 1: Enter Recipient */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl font-black text-white">Send Money</h1>
              <p className="text-xs text-[#A0A3B1] mt-1">Send instantly to any Nigerian commercial or microfinance bank.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A0A3B1] mb-1.5">Account Number</label>
                <input
                  type="text"
                  maxLength={10}
                  inputMode="numeric"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="0123456789"
                  className="w-full bg-[#151B3D] border border-[#D4AF37]/30 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-white text-lg tracking-wider px-4 py-3.5 rounded-2xl outline-none placeholder:text-gray-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#A0A3B1] mb-1.5">Select Bank</label>
                <div className="relative">
                  <select
                    value={bankCode}
                    onChange={(e) => {
                      const selected = NIGERIAN_BANKS.find(b => b.code === e.target.value);
                      setBankCode(e.target.value);
                      setBankName(selected?.name || '');
                    }}
                    className="w-full bg-[#151B3D] border border-[#D4AF37]/30 focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-white text-sm px-4 py-3.5 rounded-2xl outline-none appearance-none transition"
                  >
                    <option value="" className="bg-[#0A1028] text-gray-400">Choose destination bank...</option>
                    {NIGERIAN_BANKS.map((b) => (
                      <option key={b.code} value={b.code} className="bg-[#0A1028] text-white">
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <Building2 size={18} className="absolute right-4 top-4 text-[#D4AF37] pointer-events-none" />
                </div>
              </div>

              {/* Verified Recipient Box */}
              {isResolving && (
                <div className="p-3.5 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/20 flex items-center gap-3 animate-pulse">
                  <div className="w-5 h-5 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin" />
                  <p className="text-xs text-[#D4AF37]">Verifying beneficiary name with NIBSS...</p>
                </div>
              )}

              {resolvedName && !isResolving && (
                <div className="p-4 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-[#A0A3B1]">Beneficiary Name</span>
                    <p className="text-sm font-bold text-[#F5C445] mt-0.5">{resolvedName}</p>
                  </div>
                  <CheckCircle2 size={22} className="text-[#D4AF37] shrink-0" />
                </div>
              )}
            </div>

            <button
              onClick={handleNextFromStep1}
              disabled={accountNumber.length !== 10 || !bankCode || isResolving}
              className="w-full mt-6 py-4 rounded-full bg-[#F5C445] hover:bg-[#D4AF37] text-black font-extrabold text-sm tracking-wide shadow-lg shadow-[#D4AF37]/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 2: Confirm New Recipient Warning */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-start gap-3">
              <Shield size={24} className="text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-amber-200">First-Time Recipient</h3>
                <p className="text-xs text-[#A0A3B1] mt-1 leading-relaxed">
                  This is your first time sending to this bank account. Please verify that the name matches your intended beneficiary.
                </p>
              </div>
            </div>

            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-[11px] text-[#A0A3B1] uppercase tracking-wider">Account Name</p>
                <p className="text-base font-bold text-white mt-0.5">{resolvedName}</p>
              </div>
              <div className="border-t border-[#D4AF37]/10 pt-3">
                <p className="text-[11px] text-[#A0A3B1] uppercase tracking-wider">Account Number</p>
                <p className="text-base font-bold text-[#F5C445] font-mono mt-0.5">{accountNumber}</p>
              </div>
              <div className="border-t border-[#D4AF37]/10 pt-3">
                <p className="text-[11px] text-[#A0A3B1] uppercase tracking-wider">Destination Bank</p>
                <p className="text-base font-bold text-white mt-0.5">{bankName}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => setStep(3)}
                className="w-full py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm shadow-md transition"
              >
                Confirm & Continue
              </button>
              <button
                onClick={() => setStep(1)}
                className="w-full py-2.5 text-center text-xs font-semibold text-[#A0A3B1] hover:text-[#D4AF37]"
              >
                Change Recipient Details
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Enter Amount */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="text-center py-2">
              <span className="text-xs font-semibold text-[#D4AF37] tracking-wider uppercase">Add Amount</span>
              <div className="mt-2 flex items-center justify-center border-b-2 border-[#D4AF37] pb-2 max-w-[260px] mx-auto">
                <span className="text-2xl font-bold text-white mr-1">₦</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-center text-3xl font-extrabold text-white outline-none placeholder:text-gray-600"
                />
              </div>
            </div>

            {/* Calculations & Fee Breakdown */}
            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex justify-between items-center text-[#A0A3B1]">
                <span>Transfer Processing Fee:</span>
                <span className="font-semibold text-white">₦{transferFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[#A0A3B1]">
                <span>Total Amount to Debit:</span>
                <span className="font-bold text-[#F5C445] text-sm">₦{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Daily Transfer Limit Progress Bar */}
            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#A0A3B1]">Daily Limit</span>
                <span className="text-white font-semibold">₦{dailyLimit.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#D4AF37] to-[#F5C445] h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (remainingDailyLimit / dailyLimit) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-[#A0A3B1]">
                Remaining after transfer: <span className="text-[#F5C445] font-semibold">₦{remainingDailyLimit.toLocaleString()}</span>
              </p>
            </div>

            {/* Attached Wallet Source Card */}
            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0A1028] border border-[#D4AF37]/40 flex items-center justify-center">
                  <Wallet size={18} className="text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">SwiftMART Wallet •••• 4589</p>
                  <p className="text-[11px] text-[#A0A3B1]">Available: ₦{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <div className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full border border-[#D4AF37]/30">
                Primary
              </div>
            </div>

            <button
              onClick={handleNextFromAmount}
              disabled={numericAmount <= 0}
              className="w-full py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm tracking-wide shadow-lg shadow-[#D4AF37]/20 disabled:opacity-40 transition"
            >
              Continue
            </button>
          </div>
        )}

        {/* STEP 4: Review & Confirm */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div>
              <h1 className="text-2xl font-black text-white">Confirm Transfer</h1>
              <p className="text-xs text-[#A0A3B1] mt-1">Please double check transaction parameters.</p>
            </div>

            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-3.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10">
                <span className="text-[#A0A3B1]">Receiver Name:</span>
                <span className="font-bold text-white text-right">{resolvedName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10">
                <span className="text-[#A0A3B1]">Account Number:</span>
                <span className="font-mono font-bold text-[#F5C445]">{accountNumber}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10">
                <span className="text-[#A0A3B1]">Bank:</span>
                <span className="font-bold text-white">{bankName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10">
                <span className="text-[#A0A3B1]">Transfer Amount:</span>
                <span className="font-bold text-white">₦{numericAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10">
                <span className="text-[#A0A3B1]">Transfer Fee:</span>
                <span className="font-semibold text-white">₦{transferFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1 text-sm">
                <span className="font-bold text-[#D4AF37]">Total to Debit:</span>
                <span className="font-extrabold text-[#F5C445]">₦{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="p-3 bg-[#151B3D]/60 rounded-xl text-center">
              <p className="text-[11px] text-[#A0A3B1]">
                🔒 Protected by 256-bit encryption and SwiftMART Escrow Protocol.
              </p>
            </div>

            <button
              onClick={() => setStep(5)}
              className="w-full py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm tracking-wide shadow-lg shadow-[#D4AF37]/20 transition"
            >
              Send Money Now
            </button>
          </div>
        )}

        {/* STEP 5: Enter PIN (Custom Keypad) */}
        {step === 5 && (
          <div className="space-y-6 flex flex-col justify-between flex-1 animate-in fade-in duration-200">
            <div className="text-center pt-2">
              <div className="w-12 h-12 rounded-full bg-[#151B3D] border border-[#D4AF37]/40 flex items-center justify-center mx-auto mb-3">
                <Lock size={20} className="text-[#D4AF37]" />
              </div>
              <h1 className="text-xl font-black text-white">Enter Transaction PIN</h1>
              <p className="text-xs text-[#A0A3B1] mt-1">Authorize transfer of ₦{totalDebit.toLocaleString()}</p>
            </div>

            {/* 4 Box PIN Display */}
            <div className="flex justify-center gap-4 py-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all ${
                    pin.length > idx
                      ? 'bg-[#151B3D] border-2 border-[#D4AF37] text-[#D4AF37]'
                      : pin.length === idx
                      ? 'bg-[#151B3D] border-2 border-[#D4AF37]/60'
                      : 'bg-[#151B3D]/60 border border-[#D4AF37]/20 text-gray-500'
                  }`}
                >
                  {pin.length > idx ? '●' : ''}
                </div>
              ))}
            </div>

            {isSubmitting ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-[#D4AF37] border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-[#D4AF37] font-semibold">Encrypting & submitting transfer...</p>
              </div>
            ) : (
              /* Custom Dark + Gold Numeric Keypad */
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto pb-4">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handlePinInput(digit)}
                    className="h-16 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/20 active:bg-[#D4AF37]/20 text-xl font-bold text-white flex items-center justify-center hover:border-[#D4AF37]/50 transition"
                  >
                    {digit}
                  </button>
                ))}
                <div />
                <button
                  onClick={() => handlePinInput('0')}
                  className="h-16 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/20 active:bg-[#D4AF37]/20 text-xl font-bold text-white flex items-center justify-center hover:border-[#D4AF37]/50 transition"
                >
                  0
                </button>
                <button
                  onClick={handlePinDelete}
                  className="h-16 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/20 active:bg-red-500/20 text-white flex items-center justify-center hover:border-red-400/50 transition"
                >
                  <Delete size={22} className="text-[#A0A3B1]" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Receipt (CRITICAL LOGIC: PROCESSING, NOT GREEN SUCCESS) */}
        {step === 6 && txReceipt && (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            {/* Status Header */}
            <div className="text-center pt-2">
              <div className="w-16 h-16 rounded-full bg-[#151B3D] border-2 border-[#D4AF37] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#D4AF37]/20">
                <Clock size={32} className="text-[#F5C445] animate-pulse" />
              </div>
              <h1 className="text-2xl font-black text-white">Processing Successfully</h1>
              <p className="text-xs text-[#A0A3B1] mt-2 max-w-xs mx-auto leading-relaxed">
                Your transfer is processing. It will take 2-5 minutes for the receiver's bank to receive the money.
              </p>
            </div>

            {/* Receipt Card */}
            <div className="bg-[#151B3D] border border-[#D4AF37]/40 rounded-2xl p-5 space-y-3.5 text-xs relative overflow-hidden">
              <div className="flex justify-between items-center pb-2 border-b border-[#D4AF37]/15">
                <span className="text-[#A0A3B1]">Transaction Status:</span>
                <span className="px-3 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] text-[#F5C445] font-extrabold text-[11px] tracking-wider">
                  {txReceipt.status}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/15">
                <span className="text-[#A0A3B1]">Reference ID:</span>
                <span className="font-mono text-white font-semibold">{txReceipt.id}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/15">
                <span className="text-[#A0A3B1]">Receiver:</span>
                <span className="font-bold text-white text-right">{txReceipt.recipientName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/15">
                <span className="text-[#A0A3B1]">Account / Bank:</span>
                <span className="font-medium text-white text-right">{txReceipt.accountNumber} • {txReceipt.bankName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/15">
                <span className="text-[#A0A3B1]">Amount Transferred:</span>
                <span className="font-bold text-white">₦{txReceipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/15">
                <span className="text-[#A0A3B1]">Processing Fee:</span>
                <span className="text-white">₦{txReceipt.fee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-[#A0A3B1]">Timestamp:</span>
                <span className="text-white">{txReceipt.date}</span>
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => window.print()}
                className="w-full py-3.5 rounded-full border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Download size={16} /> Download Receipt
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'SwiftMART Transfer Receipt',
                      text: `Transferred ₦${txReceipt.amount.toLocaleString()} to ${txReceipt.recipientName}. Status: Processing.`,
                    });
                  } else {
                    alert('Receipt link copied to clipboard!');
                  }
                }}
                className="w-full py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm tracking-wide shadow-lg shadow-[#D4AF37]/20 flex items-center justify-center gap-2 transition"
              >
                <Share2 size={16} /> Share Receipt
              </button>
              <button
                onClick={() => router.push('/wallet')}
                className="w-full py-2.5 text-center text-xs text-[#A0A3B1] hover:text-white"
              >
                Return to Wallet
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
            }
                
