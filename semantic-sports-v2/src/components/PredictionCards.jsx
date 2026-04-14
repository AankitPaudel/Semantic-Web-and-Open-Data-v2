function fmtDate(str) {
  if (!str) return ''
  try {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    }).format(new Date(str))
  } catch { return str.slice(0, 10) }
}

function ProbBar({ label, pct, color }) {
  return (
    <div className="flex-1 flex flex-col items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">{label}</span>
      <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bar-animate"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-[13px] font-bold text-white">{pct}%</span>
    </div>
  )
}

export default function PredictionCards({ predictions, tab, isNBA }) {
  if (!predictions?.length) {
    return <p className="text-gray-600 text-[13px]">No upcoming fixtures available.</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {predictions.slice(0, 9).map((f, i) => {
        const p = f.prediction || {}
        const home = p.home ?? (isNBA ? 55 : 40)
        const draw = p.draw ?? 25
        const away = p.away ?? (isNBA ? 45 : 35)

        return (
          <div
            key={f.id ?? i}
            className="card-sm p-4 space-y-3.5 hover:border-white/10 transition-colors duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              {f.matchday && (
                <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
                  Matchday {f.matchday}
                </span>
              )}
              <span className="text-[11px] text-gray-600 ml-auto">{fmtDate(f.date)}</span>
            </div>

            {/* Teams */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white truncate">{f.homeTeam}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">Home</p>
              </div>
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0"
                style={{ background: `${tab.accent}15`, color: tab.accent }}
              >
                vs
              </div>
              <div className="flex-1 min-w-0 text-right">
                <p className="text-[13px] font-bold text-gray-300 truncate">{f.awayTeam}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">Away</p>
              </div>
            </div>

            {/* Probability bars */}
            <div className="flex gap-3 pt-1">
              <ProbBar label="Home" pct={home} color={tab.accent} />
              {!isNBA && <ProbBar label="Draw" pct={draw} color="#64748b" />}
              <ProbBar label="Away" pct={away} color="#f87171" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
