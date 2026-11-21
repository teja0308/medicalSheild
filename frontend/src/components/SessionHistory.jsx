import { useEffect, useState } from 'react';
import { fetchSession, fetchSessions } from '../api/client.js';

export default function SessionHistory({ onSelect, enabled, userId }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || !userId) {
      setSessions([]);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    setSessions([]);
    setLoading(true);
    setError('');

    fetchSessions()
      .then((data) => {
        if (!cancelled) setSessions(data.sessions || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  async function handleOpen(id) {
    try {
      const data = await fetchSession(id);
      const session = data.session;
      onSelect({
        success: true,
        sessionId: session._id,
        billName: session.billName,
        extractedBillData: session.extractedBillData,
        auditResults: session.auditResults,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  if (!enabled) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500">
        Log in to save and reopen past audits.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="text-sm font-semibold text-white">Past audits</h3>
      {loading && <p className="mt-2 text-xs text-slate-500">Loading…</p>}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {!loading && sessions.length === 0 && (
        <p className="mt-2 text-xs text-slate-500">No saved audits yet for this account.</p>
      )}
      <ul className="mt-3 space-y-2">
        {sessions.map((s) => (
          <li key={s._id}>
            <button
              type="button"
              onClick={() => handleOpen(s._id)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-left transition hover:border-teal-700/50"
            >
              <p className="truncate text-xs font-medium text-slate-200">{s.billName}</p>
              <p className="mt-0.5 text-[11px] text-emerald-400/90">
                Save ${(s.auditResults?.potentialSavings || 0).toLocaleString()}
                <span className="text-slate-600"> · </span>
                <span className="text-slate-500">
                  {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : ''}
                </span>
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
