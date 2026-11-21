export default function FlaggedItems({ flaggedItems = [] }) {
  if (flaggedItems.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-6">
        <h3 className="font-semibold text-emerald-300">No wrongful charges found</h3>
        <p className="mt-1 text-sm text-slate-400">
          Compared to your policy, these line items look compliant.
        </p>
      </div>
    );
  }

  const totalFlagged = flaggedItems.reduce(
    (sum, item) => sum + (Number(item.estimatedSaving) || 0),
    0
  );

  return (
    <div className="rounded-2xl border border-amber-700/40 bg-amber-950/10 overflow-hidden">
      <div className="border-b border-amber-900/40 px-6 py-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-amber-300">Wrongly Billed Items</h3>
            <p className="text-xs text-slate-400">
              Charges that conflict with your insurance policy coverage rules
            </p>
          </div>
          <p className="text-sm font-medium text-amber-200">
            {flaggedItems.length} issues · ${totalFlagged.toLocaleString(undefined, { minimumFractionDigits: 2 })} recoverable
          </p>
        </div>
      </div>

      <div className="divide-y divide-amber-900/30">
        {flaggedItems.map((item, index) => (
          <article key={`${item.cptCode}-${index}`} className="px-6 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm text-teal-400">{item.cptCode}</p>
                <h4 className="mt-0.5 font-medium text-white">{item.description}</h4>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Hospital charged</p>
                <p className="font-semibold text-white">
                  ${Number(item.hospitalCharge || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
                {item.estimatedSaving > 0 && (
                  <p className="mt-1 text-sm font-semibold text-emerald-400">
                    Save ${Number(item.estimatedSaving).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.savingExplanation}</p>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-950/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Policy rule</p>
                <p className="mt-1 text-xs text-slate-400">{item.insuranceCoverageRules}</p>
              </div>
              <div className="rounded-lg bg-slate-950/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">What to do</p>
                <p className="mt-1 text-xs text-teal-400/90">{item.actionRequired}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
