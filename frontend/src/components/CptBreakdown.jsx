export default function CptBreakdown({ cptCodes = [], flaggedItems = [] }) {
  const flaggedMap = new Map(flaggedItems.map((item) => [item.cptCode, item]));

  if (cptCodes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-400">
        Upload a hospital bill to see CPT line-item breakdown.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
      <div className="border-b border-slate-800 px-6 py-4">
        <h3 className="font-semibold text-white">All CPT Line Items</h3>
        <p className="text-xs text-slate-400">
          {cptCodes.length} procedures · {flaggedItems.length} wrongly billed
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-6 py-3">Code</th>
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3">Charge</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {cptCodes.map((item, index) => {
              const flagged = flaggedMap.get(item.code);
              return (
                <tr
                  key={`${item.code}-${index}`}
                  className={flagged ? 'bg-amber-950/20 hover:bg-amber-950/30' : 'hover:bg-slate-800/30'}
                >
                  <td className="px-6 py-3 font-mono text-teal-400">{item.code}</td>
                  <td className="px-6 py-3 text-slate-300">{item.description}</td>
                  <td className="px-6 py-3 font-medium text-white">
                    ${Number(item.charge).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3">
                    {flagged ? (
                      <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                        Wrongly billed
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
