import { useEffect, useState } from 'react';
import { saveDisputeLetter } from '../api/client.js';

export default function DisputeLetterEditor({ sessionId, initialLetter = '', isLoggedIn }) {
  const [letter, setLetter] = useState(initialLetter);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLetter(initialLetter);
  }, [initialLetter]);

  async function handleSave() {
    if (!sessionId || !isLoggedIn) {
      setMessage('Log in to save your edited dispute letter.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await saveDisputeLetter(sessionId, letter);
      setMessage('Dispute letter saved successfully.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(letter);
    setMessage('Copied to clipboard.');
  }

  if (!letter) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
        Run a bill audit to generate a formal dispute letter.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-white">Dispute Letter Editor</h3>
          <p className="text-xs text-slate-400">Edit and save your AI-drafted appeal letter</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Letter'}
          </button>
        </div>
      </div>

      <textarea
        value={letter}
        onChange={(e) => setLetter(e.target.value)}
        rows={14}
        className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-relaxed text-slate-200 outline-none focus:border-teal-500"
      />

      {message && <p className="mt-2 text-xs text-slate-400">{message}</p>}
    </div>
  );
}
