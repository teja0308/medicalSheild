import { useRef, useState } from 'react';
import { analyzeBill } from '../api/client.js';

export default function BillUpload({ onResults, policyReady }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');

    try {
      const data = await analyzeBill(file);
      onResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-2xl border border-dashed border-teal-700/60 bg-teal-950/20 p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-sm font-bold text-teal-400">
          2
        </div>
        <div>
          <h3 className="font-semibold text-white">Hospital Bill</h3>
          <p className="text-xs text-slate-400">
            Upload a bill PDF — we flag wrongly billed CPT charges
          </p>
        </div>
      </div>

      <label className="block cursor-pointer">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleUpload}
          disabled={loading}
          className="hidden"
        />
        <span className="inline-flex rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-500">
          {loading ? 'Auditing bill…' : 'Choose Bill PDF'}
        </span>
      </label>

      {!policyReady && (
        <p className="mt-3 text-xs text-slate-500">
          Tip: upload your policy first for better coverage matching (or use Run Demo).
        </p>
      )}

      {loading && (
        <div className="mt-4 space-y-2">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full animate-pulse rounded-full bg-teal-500" style={{ width: '70%' }} />
          </div>
          <p className="text-xs text-slate-400">
            Extracting CPT codes → matching policy rules → listing wrongful charges…
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
