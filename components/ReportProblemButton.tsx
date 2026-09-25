// components/ReportProblemButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const DISPUTE_CATEGORIES = [
  { value: 'wrong_item', label: 'Wrong item delivered' },
  { value: 'damaged', label: 'Item is damaged or broken' },
  { value: 'missing_parts', label: 'Incomplete order / missing parts' },
  { value: 'not_as_described', label: 'Significantly not as described' },
  { value: 'other', label: 'Other issue' },
];

export function ReportProblemButton({ orderId }: { orderId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(DISPUTE_CATEGORIES[0].value);
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files).slice(0, 3);
    setFiles(selected);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (reason.trim().length < 20) {
      setError('Please provide a detailed explanation (at least 20 characters).');
      return;
    }

    if (files.length === 0) {
      setError('Please attach at least one photo as proof.');
      return;
    }

    setLoading(true);

    try {
      // 1. Upload photos to Supabase Storage
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${orderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('dispute-evidence')
          .upload(fileName, file);

        if (uploadError) {
          throw new Error(`Failed to upload photo: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from('dispute-evidence')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      // 2. Call customer-actions with category, reason, and photo URLs
      const fullReason = `[${category.toUpperCase().replace('_', ' ')}] ${reason.trim()}`;
      const { data, error: fnError } = await supabase.functions.invoke('customer-actions', {
        body: {
          type: 'raise_dispute',
          orderId,
          reason: fullReason,
          category,
          evidenceUrls: uploadedUrls,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to submit dispute.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full text-center text-xs font-semibold text-red-600 border border-red-200 bg-red-50/50 hover:bg-red-50 py-2 rounded-xl transition"
      >
        Report a Problem / Open Dispute
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-red-50/70 border border-red-200 rounded-2xl p-4 mt-2">
      <h3 className="text-sm font-bold text-red-900 mb-2">Report an Issue with Order</h3>

      {/* Category Selection */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-700 mb-1">Issue Type</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full text-xs bg-white border border-red-200 rounded-lg p-2 text-gray-800 focus:outline-none"
        >
          {DISPUTE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Detailed Description */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Detailed Explanation <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe what was delivered, condition of package, what is wrong..."
          rows={3}
          className="w-full rounded-lg border border-red-200 p-2 text-xs bg-white resize-none text-gray-800 focus:outline-none"
        />
      </div>

      {/* Photo Proof Upload */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Photo Evidence (1–3 photos) <span className="text-red-500">*</span>
        </label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="w-full text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-red-100 file:text-red-700 hover:file:bg-red-200"
        />
        {files.length > 0 && (
          <p className="text-[10px] text-gray-500 mt-1">{files.length} file(s) selected</p>
        )}
      </div>

      {error && <p className="text-xs text-red-600 font-medium mb-3">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-red-600 text-white text-xs font-semibold py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Submitting Dispute...' : 'Submit Evidence & Dispute'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError('');
          }}
          disabled={loading}
          className="px-3 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
