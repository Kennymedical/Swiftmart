'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, CheckCircle2, AlertCircle, Shield, Clock, Download, Building2, Wallet, Lock, Delete, UserCheck } from 'lucide-react';

const DEFAULT_BANKS = [
  { code: '090405', name: 'Moniepoint MFB' }, { code: '100004', name: 'OPay' },
  { code: '100033', name: 'PalmPay' }, { code: '090267', name: 'Kuda Bank' },
  { code: '044', name: 'Access Bank' }, { code: '058', name: 'GTBank' },
  { code: '011', name: 'First Bank' }, { code: '057', name: 'Zenith Bank' },
  { code: '033', name: 'UBA' }, { code: '035', name: 'Wema Bank' },
];

export default function BankTransferFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<'bank' | 'user'>(searchParams.get('mode') === 'user' ? 'user' : 'bank');
  const [step, setStep] = useState(1);
  const [banks, setBanks] = useState(DEFAULT_BANKS);
  const [username, setUsername] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [amount, setAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txReceipt, setTxReceipt] = useState<any>(null);

  useEffect(() => {
    supabase.functions.invoke('resolve-account?action=banks', { method: 'GET' })
      .then(({ data }) => data?.banks?.length && setBanks(data.banks)).catch(() => {});
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      const { data } = await supabase.from('wallets').select('balance_kobo').eq('user_id', user.id).single();
      if (data) setWalletBalance((data.balance_kobo || 0) / 100);
    })();
  }, []);

  // Bank Account Resolver
  useEffect(() => {
    if (mode === 'bank' && accountNumber.length === 10 && bankCode) {
      setIsResolving(true); setResolvedName(null); setErrorMsg(null);
      supabase.functions.invoke('resolve-account', { body: { bankCode, accountNumber } })
        .then(({ data, error }) => {
          if (error || data?.error) setErrorMsg(error?.message || data?.error || 'Account resolution failed');
          else if (data?.accountName) setResolvedName(data.accountName);
        })
        .catch((err) => setErrorMsg(err.message || 'Verification service error'))
        .finally(() => setIsResolving(false));
    }
  }, [accountNumber, bankCode, mode]);

  // P2P Username Resolver
  useEffect(() => {
    if (mode === 'user' && username.trim().length >= 3) {
      const clean = username.replace(/^@/, '').trim();
      setIsResolving(true); setResolvedName(null); setErrorMsg(null);
      supabase.from('profiles').select('full_name, username').ilike('username', clean).maybeSingle()
        .then(({ data, error }) => {
          if (data) setResolvedName(data.full_name || `@${data.username}`);
          else setErrorMsg('SwiftMART user not found');
        })
        .finally(() => setIsResolving(false));
    }
  }, [username, mode]);

  const numAmt = parseFloat(amount) || 0;
  const fee = mode === 'user' ? 0 : (numAmt >= 10000 ? 70.80 : 20.80);
  const totalDebit = numAmt > 0 ? numAmt + fee : 0;

  const handlePin = (digit: string) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      if (next.length === 4) executeTransfer();
    }
  };

  const executeTransfer = async () => {
    setIsSubmitting(true); setErrorMsg(null);
    try {
      const body = mode === 'user'
        ? { recipientUsername: username.replace(/^@/, '').trim(), amountKobo: Math.round(numAmt * 100) }
        : { bankCode, bankName, accountNumber, accountName: resolvedName, amountKobo: Math.round(numAmt * 100) };

      const { data, error } = await supabase.functions.invoke('wallet-transfer', { body });
      if (error || data?.error) throw new Error(data?.message || data?.error || 'Transfer failed');

      setTxReceipt({
        id: data?.reference || `TRX-${Date.now()}`,
        recipientName: resolvedName,
        accountNumber: mode === 'user' ? `@${username.replace(/^@/, '')}` : `${accountNumber} • ${bankName}`,
        amount: numAmt, fee, total: totalDebit,
        date: new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }),
        status: mode === 'user' ? 'SUCCESSFUL' : 'PROCESSING',
      });
      setTimeout(() => { setIsSubmitting(false); setStep(6); }, 1000);
    } catch (err: any) {
      setIsSubmitting(false); setPin(''); setErrorMsg(err.message || 'Transfer failed. Check balance.');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0A1028] text-white flex flex-col font-sans">
      <header className="sticky top-0 z-40 bg-[#0A1028]/95 px-4 py-3.5 border-b border-[#D4AF37]/20 flex items-center justify-between">
        <button onClick={() => step > 1 && step < 6 ? setStep(step - 1) : router.push('/wallet')} className="p-2 rounded-full bg-[#151B3D] text-[#D4AF37] border border-[#D4AF37]/30">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-sm font-bold text-white uppercase">{mode === 'user' ? 'P2P Transfer' : 'Bank Transfer'}</h1>
        <div className="w-8" />
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 flex flex-col justify-between">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/70 border border-red-500/60 rounded-xl flex items-center gap-2 text-red-200 text-xs">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <p>{errorMsg}</p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            {/* Mode Switch: P2P vs Bank */}
            <div className="flex bg-[#151B3D] border border-[#D4AF37]/30 rounded-xl p-1 text-xs">
              <button onClick={() => { setMode('user'); setResolvedName(null); }} className={`flex-1 py-2 rounded-lg font-bold ${mode === 'user' ? 'bg-[#F5C445] text-black' : 'text-[#A0A3B1]'}`}>P2P (Username)</button>
              <button onClick={() => { setMode('bank'); setResolvedName(null); }} className={`flex-1 py-2 rounded-lg font-bold ${mode === 'bank' ? 'bg-[#F5C445] text-black' : 'text-[#A0A3B1]'}`}>Bank Account</button>
            </div>

            {mode === 'user' ? (
              <div>
                <label className="text-xs text-[#A0A3B1]">Recipient Username</label>
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" className="w-full mt-1 bg-[#151B3D] border border-[#D4AF37]/30 focus:border-[#D4AF37] text-white text-base px-4 py-3 rounded-2xl outline-none" />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-[#A0A3B1]">Account Number (10 digits)</label>
                  <input type="text" maxLength={10} inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="0123456789" className="w-full mt-1 bg-[#151B3D] border border-[#D4AF37]/30 focus:border-[#D4AF37] text-white text-lg px-4 py-3 rounded-2xl outline-none" />
                </div>
                <div>
                  <label className="text-xs text-[#A0A3B1]">Select Bank</label>
                  <div className="relative mt-1">
                    <select value={bankCode} onChange={(e) => { const b = banks.find(x => x.code === e.target.value); setBankCode(e.target.value); setBankName(b?.name || ''); }} className="w-full bg-[#151B3D] border border-[#D4AF37]/30 text-white text-sm px-4 py-3.5 rounded-2xl outline-none appearance-none">
                      <option value="">Choose bank...</option>
                      {banks.map(b => <option key={b.code} value={b.code} className="bg-[#0A1028]">{b.name}</option>)}
                    </select>
                    <Building2 size={18} className="absolute right-4 top-4 text-[#D4AF37] pointer-events-none" />
                  </div>
                </div>
              </>
            )}

            {isResolving && <p className="text-xs text-[#D4AF37] animate-pulse">Verifying beneficiary...</p>}
            {resolvedName && !isResolving && (
              <div className="p-4 bg-[#151B3D] border border-[#D4AF37]/50 rounded-2xl flex items-center justify-between">
                <div><span className="text-[10px] uppercase text-[#A0A3B1]">Beneficiary</span><p className="text-sm font-bold text-[#F5C445]">{resolvedName}</p></div>
                <CheckCircle2 size={20} className="text-[#D4AF37]" />
              </div>
            )}
            <button onClick={() => setStep(mode === 'user' ? 3 : 2)} disabled={!resolvedName} className="w-full mt-4 py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm disabled:opacity-40">Continue</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-2xl flex gap-3 text-xs text-[#A0A3B1]">
              <Shield size={22} className="text-[#D4AF37] shrink-0" />
              <p>Confirm recipient bank account before proceeding.</p>
            </div>
            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-3 text-sm">
              <div><p className="text-[10px] text-[#A0A3B1]">NAME</p><p className="font-bold text-white">{resolvedName}</p></div>
              <div><p className="text-[10px] text-[#A0A3B1]">ACCOUNT</p><p className="font-mono font-bold text-[#F5C445]">{accountNumber} • {bankName}</p></div>
            </div>
            <button onClick={() => setStep(3)} className="w-full py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm">Confirm & Continue</button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center py-2">
              <span className="text-xs text-[#D4AF37] uppercase font-bold">Add Amount</span>
              <div className="mt-2 flex items-center justify-center border-b-2 border-[#D4AF37] pb-2 max-w-[240px] mx-auto">
                <span className="text-2xl text-white mr-1">₦</span>
                <input type="number" min="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full bg-transparent text-center text-3xl font-extrabold text-white outline-none" />
              </div>
            </div>
            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-4 text-xs space-y-2">
              <div className="flex justify-between text-[#A0A3B1]"><span>Processing Fee:</span><span className="text-white">{fee === 0 ? 'FREE (P2P)' : `₦${fee.toFixed(2)}`}</span></div>
              <div className="flex justify-between font-bold text-[#F5C445] text-sm pt-1 border-t border-[#D4AF37]/10"><span>Total Debit:</span><span>₦{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            </div>
            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3"><Wallet size={18} className="text-[#D4AF37]" /><div><p className="font-bold text-white">SwiftMART Wallet</p><p className="text-[#A0A3B1]">Available: ₦{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div></div>
              <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/30">Primary</span>
            </div>
            <button onClick={() => { if (numAmt <= 0) return setErrorMsg('Enter amount'); if (totalDebit > walletBalance) return setErrorMsg('Insufficient balance'); setErrorMsg(null); setStep(4); }} className="w-full py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm">Continue</button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-white">Confirm Transfer</h2>
            <div className="bg-[#151B3D] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-3 text-xs">
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10"><span className="text-[#A0A3B1]">Receiver:</span><span className="font-bold text-white">{resolvedName}</span></div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10"><span className="text-[#A0A3B1]">Destination:</span><span className="font-mono text-white">{mode === 'user' ? `@${username.replace(/^@/, '')}` : `${accountNumber} • ${bankName}`}</span></div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10"><span className="text-[#A0A3B1]">Amount:</span><span className="font-bold text-white">₦{numAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/10"><span className="text-[#A0A3B1]">Fee:</span><span>{fee === 0 ? 'FREE' : `₦${fee.toFixed(2)}`}</span></div>
              <div className="flex justify-between text-sm font-bold text-[#F5C445]"><span>Total Debit:</span><span>₦{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            </div>
            <button onClick={() => setStep(5)} className="w-full py-4 rounded-full bg-[#F5C445] text-black font-extrabold text-sm">Send Now</button>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 flex flex-col justify-between flex-1">
            <div className="text-center pt-2">
              <Lock size={24} className="text-[#D4AF37] mx-auto mb-2" />
              <h2 className="text-xl font-black text-white">Enter Transaction PIN</h2>
              <p className="text-xs text-[#A0A3B1]">Authorize ₦{totalDebit.toLocaleString()}</p>
            </div>
            <div className="flex justify-center gap-4 py-2">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${pin.length > i ? 'border-2 border-[#D4AF37] text-[#D4AF37]' : 'bg-[#151B3D] border border-[#D4AF37]/30'}`}>
                  {pin.length > i ? '●' : ''}
                </div>
              ))}
            </div>
            {isSubmitting ? (
              <p className="text-center text-xs text-[#D4AF37] animate-pulse">Processing transfer...</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto pb-4">
                {['1','2','3','4','5','6','7','8','9'].map(d => (
                  <button key={d} onClick={() => handlePin(d)} className="h-14 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/20 text-xl font-bold text-white hover:border-[#D4AF37]">{d}</button>
                ))}
                <div />
                <button onClick={() => handlePin('0')} className="h-14 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/20 text-xl font-bold text-white hover:border-[#D4AF37]">0</button>
                <button onClick={() => setPin(p => p.slice(0, -1))} className="h-14 rounded-2xl bg-[#151B3D] border border-[#D4AF37]/20 flex items-center justify-center text-[#A0A3B1]"><Delete size={20} /></button>
              </div>
            )}
          </div>
        )}

        {step === 6 && txReceipt && (
          <div className="space-y-5 animate-in zoom-in-95">
            <div className="text-center pt-2">
              <Clock size={36} className="text-[#F5C445] animate-pulse mx-auto mb-2" />
              <h2 className="text-2xl font-black text-white">{mode === 'user' ? 'Transfer Successful!' : 'Processing Successfully'}</h2>
              <p className="text-xs text-[#A0A3B1] mt-1">{mode === 'user' ? 'Funds credited instantly.' : 'Receiver bank will receive funds in 2-5 minutes.'}</p>
            </div>
            <div className="bg-[#151B3D] border border-[#D4AF37]/40 rounded-2xl p-5 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-[#D4AF37]/15"><span>Status:</span><span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#F5C445] font-bold">{txReceipt.status}</span></div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/15"><span>Ref ID:</span><span className="font-mono text-white">{txReceipt.id}</span></div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/15"><span>Receiver:</span><span className="font-bold text-white">{txReceipt.recipientName}</span></div>
              <div className="flex justify-between pb-2 border-b border-[#D4AF37]/15"><span>Destination:</span><span>{txReceipt.accountNumber}</span></div>
              <div className="flex justify-between font-bold text-white"><span>Amount:</span><span>₦{txReceipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            </div>
            <button onClick={() => router.push('/wallet')} className="w-full py-3.5 rounded-full bg-[#F5C445] text-black text-sm font-extrabold">Return to Wallet</button>
          </div>
        )}
      </main>
    </div>
  );
}
