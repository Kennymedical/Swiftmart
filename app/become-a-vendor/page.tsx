'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Building2,
  User,
  CreditCard,
  Clock,
  CheckCircle2,
  FileText,
  MapPin,
  Upload,
  AlertCircle,
  HelpCircle,
  BadgeCheck
} from 'lucide-react';
import Link from 'next/link';

function slugify(text: string) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const NIGERIAN_BANKS = [
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '044', name: 'Access Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '50211', name: 'Kuda Bank' },
  { code: '999992', name: 'OPay Digital Services' },
  { code: '999991', name: 'PalmPay' },
  { code: '50515', name: 'Moniepoint MFB' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '035', name: 'Wema Bank (ALAT)' },
  { code: '070', name: 'Fidelity Bank' },
  { code: 'custom', name: 'Other / Custom Bank Code' },
];

const KYC_DOC_TYPES = [
  { id: 'nin', label: 'National Identity Number (NIN)', digits: 11, hint: '11 numeric digits from NIMC slip or National ID card' },
  { id: 'bvn', label: 'Bank Verification Number (BVN)', digits: 11, hint: '11 numeric digits linked to your Nigerian bank account' },
  { id: 'voters_card', label: "Voter's Card (VIN)", digits: null, hint: '19 alphanumeric characters from INEC Voter card' },
  { id: 'cac', label: 'Corporate Affairs Commission (CAC)', digits: null, hint: 'Business Registration / RC / BN number' },
  { id: 'drivers_license', label: "Driver's License (FRSC)", digits: null, hint: 'Valid Nigerian Federal Road Safety Corps license number' },
  { id: 'passport', label: 'International Passport', digits: null, hint: 'Standard Nigerian immigration passport number' },
];

const ADDRESS_PROOF_TYPES = [
  { id: 'nepa_bill', label: 'Electricity Utility Bill (NEPA / DISCO Bill)', hint: 'EKEDC, IKEDC, AEDC, IBEDC or local power utility within 3 months' },
  { id: 'bank_statement', label: 'Bank Statement (Recent 3 Months)', hint: 'Official bank statement showing your residential or store address' },
  { id: 'water_waste', label: 'Water / Waste Management Utility Bill', hint: 'State water corporation or municipal waste bill' },
  { id: 'tenancy_agreement', label: 'Tenancy / Lease Agreement', hint: 'Valid signed rental or lease contract for store or residence' },
];

export default function BecomeVendorPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [existingVendor, setExistingVendor] = useState<any>(null);

  // Step 1: Personal Details
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: KYC & ID Document Verification
  const [kycIdType, setKycIdType] = useState('nin');
  const [kycIdNumber, setKycIdNumber] = useState('');
  const [kycDocumentUrl, setKycDocumentUrl] = useState('');

  // Step 3: Settlement Bank Details
  const [selectedBank, setSelectedBank] = useState('058');
  const [customBankCode, setCustomBankCode] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');

  // Step 4: Residential / Business Address & Proof
  const [residentialAddress, setResidentialAddress] = useState('');
  const [addressProofType, setAddressProofType] = useState('nepa_bill');
  const [addressProofUrl, setAddressProofUrl] = useState('');
  const [agreeAttestation, setAgreeAttestation] = useState(false);

  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkExisting() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: vendor } = await supabase
          .from('vendors')
          .select('id, business_name, status')
          .eq('user_id', user.id)
          .maybeSingle();

        if (vendor) {
          setExistingVendor(vendor);
          if (vendor.status === 'approved') {
            router.push('/vendor/login');
          }
        }
      }
      setCheckingAuth(false);
    }
    checkExisting();
  }, [supabase, router]);

  const effectiveBankCode = selectedBank === 'custom' ? customBankCode.trim() : selectedBank;

  // Step validation before advancing
  const validateStep = (step: number): boolean => {
    setError('');

    if (step === 1) {
      if (!fullName.trim()) {
        setError('Please enter your full legal name matching your government ID.');
        return false;
      }
      if (!phoneNumber.trim()) {
        setError('Please enter a valid phone number.');
        return false;
      }
      if (!dateOfBirth) {
        setError('Please specify your date of birth.');
        return false;
      }
      if (!businessName.trim()) {
        setError('Please enter your store or business name.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      const cleanId = kycIdNumber.trim();
      if (!cleanId) {
        setError('Please enter your ID document number for Paystack verification.');
        return false;
      }
      if (kycIdType === 'nin') {
        const digitsOnly = cleanId.replace(/\D/g, '');
        if (digitsOnly.length !== 11) {
          setError('National Identity Number (NIN) must be exactly 11 numeric digits.');
          return false;
        }
      } else if (kycIdType === 'bvn') {
        const digitsOnly = cleanId.replace(/\D/g, '');
        if (digitsOnly.length !== 11) {
          setError('Bank Verification Number (BVN) must be exactly 11 numeric digits.');
          return false;
        }
      }
      return true;
    }

    if (step === 3) {
      if (!effectiveBankCode) {
        setError('Please select or enter your settlement bank code.');
        return false;
      }
      const cleanAccount = bankAccountNumber.replace(/\D/g, '');
      if (cleanAccount.length !== 10) {
        setError('Settlement bank account number must be exactly 10 digits.');
        return false;
      }
      if (!bankAccountName.trim()) {
        setError('Please enter the account name as registered with your bank.');
        return false;
      }
      return true;
    }

    if (step === 4) {
      if (!residentialAddress.trim()) {
        setError('Please enter your residential or store physical address.');
        return false;
      }
      if (!agreeAttestation) {
        setError('You must certify that all provided details and proofs are genuine.');
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep((prev) => (prev + 1) as any);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleBack = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setLoading(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in to apply as a vendor. Please sign in first.');
      setLoading(false);
      return;
    }

    let isPaystackVerified = false;
    try {
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      const { data: kycRes } = await supabase.functions.invoke('verify-kyc-paystack', {
        body: {
          idType: kycIdType,
          idNumber: kycIdNumber.trim(),
          firstName,
          lastName,
          bankCode: effectiveBankCode,
          accountNumber: bankAccountNumber.trim(),
        },
      });
      if (kycRes?.verified) {
        isPaystackVerified = true;
      }
    } catch (e) {
      console.warn('Paystack KYC verification deferred to manual review:', e);
    }

    const { error: insertError } = await supabase.from('vendors').insert({
      user_id: user.id,
      full_legal_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      date_of_birth: dateOfBirth,
      gender: gender,
      residential_address: residentialAddress.trim(),
      nin: kycIdType === 'nin' ? kycIdNumber.trim() : (kycIdNumber.trim() || 'N/A'),
      kyc_id_type: kycIdType,
      kyc_id_number: kycIdNumber.trim(),
      kyc_document_url: kycDocumentUrl.trim() || null,
      address_proof_type: addressProofType,
      address_proof_url: addressProofUrl.trim() || null,
      nin_verified_by_paystack: isPaystackVerified,
      business_name: businessName.trim(),
      slug: slugify(businessName) + '-' + Math.floor(Math.random() * 10000),
      description: description.trim() || null,
      kyc_bank_code: effectiveBankCode,
      kyc_bank_account_number: bankAccountNumber.trim(),
      kyc_bank_account_name: bankAccountName.trim(),
      status: 'pending',
    });

    setLoading(false);
    if (insertError) {
      setError(insertError.message || 'Failed to submit application. Please check your inputs.');
      return;
    }

    setSubmitted(true);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#0A1A3A] text-[#F5EAC2] flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#D4AF37]"></div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0A1A3A] text-[#F5EAC2] p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-gradient-to-b from-[#1E3A7A] to-[#142A5E] border border-[#E9C86A]/60 rounded-3xl p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#0A1931] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <User size={28} />
          </div>
          <h1 className="text-2xl font-bold text-[#E9C86A] mb-2">Sign In Required</h1>
          <p className="text-sm text-[#A8B0C5] mb-6">
            Please log in or register a SwiftMart shopper account first before applying as a merchant.
          </p>
          <div className="space-y-3">
            <Link
              href="/login?redirect=/become-a-vendor"
              className="block w-full py-3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-black rounded-xl hover:opacity-90 transition"
            >
              Sign In to Continue
            </Link>
            <Link href="/" className="inline-flex items-center gap-2 text-xs text-[#A8B0C5] hover:text-[#D4AF37] transition">
              <ArrowLeft size={14} /> Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (existingVendor && existingVendor.status !== 'approved') {
    return (
      <div className="min-h-screen bg-[#0A1A3A] text-[#F5EAC2] p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-gradient-to-b from-[#1E3A7A] to-[#142A5E] border border-[#E9C86A]/60 rounded-3xl p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#0A1931] border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
            <Clock size={28} className="animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-[#E9C86A] mb-2">Application Under Review</h1>
          <p className="text-sm text-[#A8B0C5] mb-4">
            Your vendor application for <strong className="text-white">"{existingVendor.business_name}"</strong> has already been submitted and is currently being verified with Paystack and SwiftMart compliance.
          </p>
          <p className="text-xs text-[#D4AF37] mb-6">
            Once approved, you will receive a notification and can sign in to your vendor dashboard to set your 6-digit PIN.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#D4AF37]/40 text-xs font-bold text-[#D4AF37] hover:bg-[#142850] transition"
          >
            <ArrowLeft size={14} /> Back to Storefront
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A1A3A] text-[#F5EAC2] p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-gradient-to-b from-[#1E3A7A] to-[#142A5E] border border-[#2ED573]/60 rounded-3xl p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#0A1931] border border-[#2ED573]/40 flex items-center justify-center text-[#2ED573]">
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-2xl font-bold text-[#2ED573] mb-2">Application Submitted!</h1>
          <p className="text-sm text-[#A8B0C5] mb-4">
            Thank you for applying. Your 4-step merchant KYC profile and Paystack verification records have been logged.
          </p>
          <p className="text-xs text-[#E9C86A] mb-6">
            SwiftMart compliance will cross-reference your personal details with the provided ID. Once approved, you can immediately access the Vendor Portal.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] text-xs font-bold hover:opacity-90 transition"
          >
            <ArrowLeft size={14} /> Return to Storefront
          </Link>
        </div>
      </div>
    );
  }

  const selectedDocInfo = KYC_DOC_TYPES.find((d) => d.id === kycIdType) || KYC_DOC_TYPES[0];

  return (
    <div className="min-h-screen bg-[#0A1A3A] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(233,200,106,0.12),rgba(255,255,255,0))] text-[#F5EAC2] p-4 pb-28">
      <div className="max-w-xl mx-auto bg-gradient-to-b from-[#1E3A7A] to-[#142A5E] rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.45)] border border-[#E9C86A]/60 p-6 sm:p-8 text-[#F5EAC2] mt-4">
        
        {/* Navigation & Trust Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#A8B0C5] hover:text-[#D4AF37] transition">
            <ArrowLeft size={14} /> Back to Storefront
          </Link>
          <div className="flex items-center gap-1 text-[11px] font-bold text-[#2ED573] bg-[#2ED573]/10 px-2.5 py-1 rounded-full border border-[#2ED573]/30">
            <ShieldCheck size={14} /> Paystack Verified KYC
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#E9C86A] mb-1 tracking-wide">
          Become a SwiftMart Merchant
        </h1>
        <p className="text-xs sm:text-sm text-[#A8B0C5] mb-6">
          Complete the step-by-step merchant registration. Identity details will be matched against Paystack KYC records.
        </p>

        {/* STEPPER PROGRESS INDICATOR */}
        <div className="mb-8">
          <div className="grid grid-cols-4 gap-2 mb-2">
            {[
              { num: 1, title: 'Personal' },
              { num: 2, title: 'KYC & ID' },
              { num: 3, title: 'Bank' },
              { num: 4, title: 'Address' },
            ].map((step) => {
              const isCurrent = currentStep === step.num;
              const isCompleted = currentStep > step.num;
              return (
                <div
                  key={step.num}
                  onClick={() => {
                    if (step.num < currentStep) setCurrentStep(step.num as any);
                  }}
                  className={`flex flex-col items-center cursor-pointer transition ${
                    step.num < currentStep ? 'opacity-90' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition border ${
                      isCompleted
                        ? 'bg-[#2ED573] border-[#2ED573] text-[#0A1931]'
                        : isCurrent
                        ? 'bg-[#D4AF37] border-[#F5C445] text-[#0A1931] shadow-[0_0_12px_rgba(212,175,55,0.4)]'
                        : 'bg-[#0A152B] border-white/20 text-[#A8B0C5]'
                    }`}
                  >
                    {isCompleted ? '✓' : step.num}
                  </div>
                  <span
                    className={`text-[10px] mt-1 font-semibold ${
                      isCurrent ? 'text-[#F5C445]' : isCompleted ? 'text-[#2ED573]' : 'text-[#8A94B0]'
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Progress bar line */}
          <div className="w-full bg-[#0A152B] h-1.5 rounded-full overflow-hidden border border-white/10">
            <div
              className="bg-gradient-to-r from-[#F2D57E] to-[#D4A937] h-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: PERSONAL INFORMATION */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-[#0F2550] border border-[#E9C86A]/30 space-y-3">
              <div className="flex items-center gap-2 text-[#E9C86A] font-bold text-sm">
                <User size={16} /> 1. Personal & Store Information
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                  placeholder="e.g. Kenny Mkpuruogwu"
                />
                <span className="text-[10px] text-[#A8B0C5]">Must match the exact name on your government identity card.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Date of Birth</label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                  placeholder="e.g. 08012345678"
                />
                <span className="text-[10px] text-[#A8B0C5]">Should match the mobile number registered with your identity card.</span>
              </div>

              <div className="pt-2 border-t border-white/10">
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Store / Business Brand Name</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                  placeholder="e.g. Kenny Luxury Stores"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Store Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none resize-none"
                  placeholder="Briefly describe what your store sells (fashion, gadgets, groceries)..."
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="w-full bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-black py-3 px-6 rounded-2xl shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2 text-sm tracking-wide"
            >
              <span>Continue to Step 2: KYC & Identity</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* STEP 2: KYC IDENTIFICATION & PAYSTACK VERIFICATION */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-[#0F2550] border border-[#E9C86A]/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#E9C86A] font-bold text-sm">
                  <BadgeCheck size={16} /> 2. KYC Document Selection
                </div>
                <span className="text-[10px] text-[#2ED573] bg-[#2ED573]/10 px-2 py-0.5 rounded-full border border-[#2ED573]/30">
                  Paystack Integrated
                </span>
              </div>

              <div className="p-3 bg-[#0A152B] rounded-xl border border-[#D4AF37]/20 text-xs text-[#A8B0C5] space-y-1">
                <p className="font-semibold text-[#F5C445] flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Paystack Identity Match
                </p>
                <p className="text-[11px] leading-relaxed">
                  Paystack automatically validates whether your <strong>Full Legal Name</strong>, <strong>Date of Birth</strong>, <strong>Phone Number</strong>, and <strong>Gender</strong> match official government records for the selected document.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Choose KYC Document Type</label>
                <select
                  value={kycIdType}
                  onChange={(e) => {
                    setKycIdType(e.target.value);
                    setKycIdNumber('');
                  }}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                >
                  {KYC_DOC_TYPES.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#A8B0C5] mt-1">{selectedDocInfo.hint}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#E9C86A] mb-1 block">
                  {selectedDocInfo.label} Number
                </label>
                <input
                  type="text"
                  required
                  value={kycIdNumber}
                  maxLength={selectedDocInfo.digits || 30}
                  onChange={(e) => {
                    if (selectedDocInfo.digits) {
                      setKycIdNumber(e.target.value.replace(/\D/g, ''));
                    } else {
                      setKycIdNumber(e.target.value);
                    }
                  }}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none font-mono tracking-wider"
                  placeholder={
                    kycIdType === 'nin'
                      ? '11-digit NIN'
                      : kycIdType === 'bvn'
                      ? '11-digit BVN'
                      : kycIdType === 'voters_card'
                      ? '19-character VIN'
                      : 'Enter document identification number'
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">
                  Upload / Document URL Proof (Optional)
                </label>
                <input
                  type="text"
                  value={kycDocumentUrl}
                  onChange={(e) => setKycDocumentUrl(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2 text-xs focus:border-[#E9C86A] outline-none"
                  placeholder="Document scan link or image URL (Google Drive / Cloudinary)"
                />
                <span className="text-[10px] text-[#A8B0C5]">Optional: You can provide an image proof or leave blank for automated Paystack lookup.</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="w-1/3 py-3 rounded-2xl border border-white/20 text-[#A8B0C5] hover:text-white font-bold text-xs transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-2/3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-black py-3 px-6 rounded-2xl shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2 text-sm"
              >
                <span>Continue to Step 3: Bank</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: SETTLEMENT BANK DETAILS */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-[#0F2550] border border-[#E9C86A]/30 space-y-3">
              <div className="flex items-center gap-2 text-[#E9C86A] font-bold text-sm">
                <CreditCard size={16} /> 3. Settlement Bank Account
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Select Nigerian Bank</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                >
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBank === 'custom' && (
                <div>
                  <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Custom Bank Code</label>
                  <input
                    type="text"
                    required
                    value={customBankCode}
                    onChange={(e) => setCustomBankCode(e.target.value)}
                    className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                    placeholder="e.g. 058 or 3-6 digit code"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">NUBAN Account Number</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none tracking-widest font-mono"
                  placeholder="10-digit NUBAN"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Account Name</label>
                <input
                  type="text"
                  required
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                  placeholder="Must match your KYC full name"
                />
                <span className="text-[10px] text-[#A8B0C5]">
                  Daily order sales and customer escrow releases will disburse directly to this account.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="w-1/3 py-3 rounded-2xl border border-white/20 text-[#A8B0C5] hover:text-white font-bold text-xs transition"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-2/3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-black py-3 px-6 rounded-2xl shadow-lg hover:opacity-95 transition flex items-center justify-center gap-2 text-sm"
              >
                <span>Continue to Step 4: Address</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: ADDRESS & PROOF OF ADDRESS */}
        {currentStep === 4 && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-[#0F2550] border border-[#E9C86A]/30 space-y-3">
              <div className="flex items-center gap-2 text-[#E9C86A] font-bold text-sm">
                <MapPin size={16} /> 4. Physical Address & Proof
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">
                  Residential or Store Physical Address
                </label>
                <input
                  type="text"
                  required
                  value={residentialAddress}
                  onChange={(e) => setResidentialAddress(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                  placeholder="Street address, Suite / Shop number, City, State"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">Proof of Address Document Type</label>
                <select
                  value={addressProofType}
                  onChange={(e) => setAddressProofType(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2.5 text-sm focus:border-[#E9C86A] outline-none"
                >
                  {ADDRESS_PROOF_TYPES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#A8B0C5] mt-1">
                  {ADDRESS_PROOF_TYPES.find((p) => p.id === addressProofType)?.hint}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#A8B0C5] mb-1 block">
                  Proof Document Link / Attachment
                </label>
                <input
                  type="text"
                  value={addressProofUrl}
                  onChange={(e) => setAddressProofUrl(e.target.value)}
                  className="w-full rounded-xl border border-[#E9C86A]/40 bg-[#0A1A3A] text-[#F5EAC2] p-2 text-xs focus:border-[#E9C86A] outline-none"
                  placeholder="Bill reference number or document link"
                />
                <span className="text-[10px] text-[#A8B0C5]">
                  E.g. Electricity meter account number or document scan link.
                </span>
              </div>

              <div className="pt-2 border-t border-white/10">
                <label className="flex items-start gap-2 cursor-pointer text-xs text-[#A8B0C5]">
                  <input
                    type="checkbox"
                    checked={agreeAttestation}
                    onChange={(e) => setAgreeAttestation(e.target.checked)}
                    className="mt-0.5 rounded border-[#E9C86A] text-[#D4AF37] focus:ring-0"
                  />
                  <span>
                    I confirm that all personal information, KYC identity document, settlement bank account, and physical address submitted belong to me and are authentic.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={loading}
                className="w-1/3 py-3.5 rounded-2xl border border-white/20 text-[#A8B0C5] hover:text-white font-bold text-xs transition disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !agreeAttestation}
                className="w-2/3 bg-gradient-to-r from-[#F2D57E] to-[#D4A937] text-[#0A1931] font-black py-3.5 px-6 rounded-2xl shadow-[0_0_20px_rgba(233,200,106,0.4)] hover:shadow-[0_0_25px_rgba(233,200,106,0.6)] active:scale-[0.99] transition disabled:opacity-50 text-sm tracking-wide"
              >
                {loading ? 'Submitting & Verifying KYC...' : 'Submit Vendor KYC Application'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
