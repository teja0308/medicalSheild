import { useEffect, useState } from 'react';
import AuthPanel from './components/AuthPanel.jsx';
import PolicyUpload from './components/PolicyUpload.jsx';
import BillUpload from './components/BillUpload.jsx';
import SavingsCounter from './components/SavingsCounter.jsx';
import CptBreakdown from './components/CptBreakdown.jsx';
import FlaggedItems from './components/FlaggedItems.jsx';
import DisputeLetterEditor from './components/DisputeLetterEditor.jsx';
import SessionHistory from './components/SessionHistory.jsx';
import { checkHealth, runDemoAudit } from './api/client.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [backendOk, setBackendOk] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [policyUploaded, setPolicyUploaded] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('medishield_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem('medishield_user');
      }
    }

    checkHealth()
      .then((data) => {
        setBackendOk(true);
        setDemoMode(Boolean(data.demoMode));
      })
      .catch(() => setBackendOk(false));
  }, []);

  /** Wipe on-screen audit/policy UI so a new account never inherits another user's view. */
  function clearWorkspace() {
    setAuditData(null);
    setPolicyUploaded(false);
    setDemoError('');
    setHistoryKey((k) => k + 1);
  }

  function handleAuth(nextUser) {
    clearWorkspace();
    setUser(nextUser);
  }

  function handleLogout() {
    localStorage.removeItem('medishield_token');
    localStorage.removeItem('medishield_user');
    setUser(null);
    clearWorkspace();
  }

  function handleAuditResults(data) {
    setAuditData(data);
    setHistoryKey((k) => k + 1);
  }

  async function handleDemo() {
    setDemoLoading(true);
    setDemoError('');
    try {
      const data = await runDemoAudit();
      setPolicyUploaded(true);
      handleAuditResults(data);
    } catch (err) {
      setDemoError(err.message);
    } finally {
      setDemoLoading(false);
    }
  }

  const userKey = user?.id || 'guest';
  const totalBilled = auditData?.extractedBillData?.totalBilledAmount ?? 0;
  const potentialSavings = auditData?.auditResults?.potentialSavings ?? 0;
  const cptCodes = auditData?.extractedBillData?.detectedCptCodes ?? [];
  const flaggedItems = auditData?.auditResults?.flaggedItems ?? [];
  const appealLetter = auditData?.auditResults?.generatedAppealLetter ?? '';

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Medi<span className="text-teal-400">Shield</span>
            </h1>
            <p className="text-xs text-slate-400">
              Upload policy + bill → spot wrongly billed charges
            </p>
          </div>
          <div className="flex items-center gap-3">
            {demoMode && (
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                Demo mode
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                backendOk === true
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : backendOk === false
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-slate-700 text-slate-400'
              }`}
            >
              {backendOk === true ? 'API Online' : backendOk === false ? 'API Offline' : 'Checking…'}
            </span>
            {user && (
              <>
                <span className="hidden text-sm text-slate-400 sm:inline">{user.name}</span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            {!user ? (
              <AuthPanel onAuth={handleAuth} />
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm">
                <p className="text-slate-400">Signed in as</p>
                <p className="font-semibold text-white">{user.email}</p>
                <p className="mt-1 text-xs text-teal-500/80">Audits saved to your account only</p>
              </div>
            )}

            <PolicyUpload
              key={`policy-${userKey}-${historyKey}`}
              uploaded={policyUploaded}
              onSuccess={() => setPolicyUploaded(true)}
            />
            <BillUpload
              key={`bill-${userKey}`}
              onResults={handleAuditResults}
              policyReady={policyUploaded}
            />

            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <p className="text-xs text-slate-400">
                No PDFs handy? Run a sample audit that shows duplicate codes, inflated imaging, and
                unbundled supplies.
              </p>
              <button
                type="button"
                onClick={handleDemo}
                disabled={demoLoading}
                className="mt-3 w-full rounded-lg border border-teal-700/60 bg-teal-950/40 px-3 py-2 text-sm font-medium text-teal-300 transition hover:bg-teal-900/50 disabled:opacity-50"
              >
                {demoLoading ? 'Loading sample audit…' : 'Run Demo Audit'}
              </button>
              {demoError && <p className="mt-2 text-xs text-red-400">{demoError}</p>}
            </div>

            <SessionHistory
              key={`history-${userKey}-${historyKey}`}
              enabled={Boolean(user)}
              userId={user?.id}
              onSelect={handleAuditResults}
            />
          </div>

          <div className="space-y-6 lg:col-span-2">
            {auditData ? (
              <>
                <div className="rounded-xl border border-teal-800/40 bg-teal-950/20 px-4 py-3 text-sm">
                  <span className="text-teal-400">Audit complete:</span>{' '}
                  <span className="text-white">{auditData.billName}</span>
                  {auditData.warning && (
                    <p className="mt-1 text-xs text-amber-400">{auditData.warning}</p>
                  )}
                </div>
                <SavingsCounter totalBilled={totalBilled} potentialSavings={potentialSavings} />
                <FlaggedItems flaggedItems={flaggedItems} />
                <CptBreakdown cptCodes={cptCodes} flaggedItems={flaggedItems} />
                <DisputeLetterEditor
                  key={`letter-${auditData.sessionId || 'none'}`}
                  sessionId={auditData.sessionId}
                  initialLetter={appealLetter}
                  isLoggedIn={Boolean(user)}
                />
              </>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
                <p className="text-lg font-medium text-slate-300">Ready to audit</p>
                <p className="mt-2 max-w-md text-sm text-slate-500">
                  1. Upload your insurance policy PDF.
                  <br />
                  2. Upload a hospital bill PDF.
                  <br />
                  3. See which CPT charges are wrongly billed — and get a dispute letter.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
