export default function SavingsCounter({ totalBilled, potentialSavings }) {
  const savingsPercent =
    totalBilled > 0 ? Math.min(100, Math.round((potentialSavings / totalBilled) * 100)) : 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-emerald-950/40 to-slate-900 p-6">
      <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
        Potential Savings
      </p>
      <p className="mt-1 text-4xl font-bold text-emerald-300">
        ${potentialSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>Recovery rate</span>
          <span>{savingsPercent}% of ${totalBilled.toLocaleString()}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-teal-400 transition-all duration-700"
            style={{ width: `${savingsPercent}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-950/60 p-3">
          <p className="text-slate-500">Total Billed</p>
          <p className="font-semibold text-white">
            ${totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="rounded-lg bg-slate-950/60 p-3">
          <p className="text-slate-500">After Audit</p>
          <p className="font-semibold text-white">
            ${Math.max(0, totalBilled - potentialSavings).toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
