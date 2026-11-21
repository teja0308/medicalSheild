import { useRef, useState } from 'react';
import { uploadPolicy } from '../api/client.js';

export default function PolicyUpload({ onSuccess, uploaded }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const data = await uploadPolicy(file);
      setMessage(data.message);
      onSuccess?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div
      className={`rounded-2xl border border-dashed p-6 ${
        uploaded
          ? 'border-emerald-700/50 bg-emerald-950/20'
          : 'border-slate-700 bg-slate-900/50'
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-sm font-bold text-blue-400">
          1
        </div>
        <div>
          <h3 className="font-semibold text-white">Insurance Policy</h3>
          <p className="text-xs text-slate-400">Upload your policy PDF to index coverage rules</p>
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
        <span className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50">
          {loading ? 'Indexing policy…' : uploaded ? 'Replace Policy PDF' : 'Choose Policy PDF'}
        </span>
      </label>

      {uploaded && !message && (
        <p className="mt-3 text-sm text-emerald-400">Policy indexed — ready for bill audit.</p>
      )}
      {message && <p className="mt-3 text-sm text-emerald-400">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
