/**
 * DataQualityBar
 * Shows match count, seasons covered, and statistical power at the top of each sport tab.
 * Makes data volume transparent to users / recruiters.
 */
export default function DataQualityBar({ data, sport, tab }) {
  if (!data) return null

  const ls = data.leagueStats
  const isSoccer = sport === 'PL' || sport === 'PD'
  const isNBA    = sport === 'NBA'

  const config = {
    PL:      { label: 'Premier League 2018–2024', target: 2280, seasons: 6, unit: 'matches' },
    PD:      { label: 'La Liga 2018–2024',        target: 2280, seasons: 6, unit: 'matches' },
    NBA:     { label: 'NBA 2018–2023',            target: 7380, seasons: 6, unit: 'games'   },
    cricket: { label: 'Cricket (multi-season)',   target: 400,  seasons: 8, unit: 'matches' },
  }[sport] || { label: sport, target: 1000, seasons: 4, unit: 'matches' }

  const actual = ls?.total ?? data.matchCount ?? data.gameCount ?? data.stats?.totalMatches ?? 0
  const pct    = Math.min(Math.round((actual / config.target) * 100), 100)

  // Statistical power: >500 = strong, >200 = moderate, >50 = limited
  const power = actual >= 500 ? { label: 'Strong', color: '#4ade80' }
              : actual >= 200 ? { label: 'Moderate', color: '#facc15' }
              : actual >= 50  ? { label: 'Limited', color: '#fb923c' }
              :                 { label: 'Insufficient', color: '#f87171' }

  const isMock = data.isMock

  return (
    <div
      className="rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 border"
      style={{
        background: `${tab.accent}08`,
        borderColor: `${tab.accent}20`,
      }}
    >
      {/* Left: dataset label */}
      <div className="flex-shrink-0">
        <p className="text-[12px] font-semibold text-white">{config.label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{config.seasons} seasons · {config.unit}</p>
      </div>

      <div className="hidden sm:block w-px h-8 bg-white/10 mx-2" />

      {/* Center: progress bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-gray-500">
            Dataset coverage
          </span>
          <span className="text-[11px] font-semibold text-white">
            {actual.toLocaleString()} / {config.target.toLocaleString()} {config.unit}
          </span>
        </div>
        <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: isMock
                ? 'linear-gradient(90deg, #facc1560, #facc15)'
                : `linear-gradient(90deg, ${tab.accent}60, ${tab.accent})`,
            }}
          />
        </div>
      </div>

      <div className="hidden sm:block w-px h-8 bg-white/10 mx-2" />

      {/* Right: stats */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Statistical Power</p>
          <span
            className="text-[12px] font-bold"
            style={{ color: power.color }}
          >
            {power.label}
          </span>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Source</p>
          <span className={`text-[12px] font-bold ${isMock ? 'text-yellow-400' : 'text-green-400'}`}>
            {isMock ? 'Demo' : 'Live'}
          </span>
        </div>

        {data.chiSquare?.significant !== undefined && (
          <div className="text-center">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-0.5">Significance</p>
            <span
              className="text-[12px] font-bold"
              style={{ color: data.chiSquare.significant ? '#4ade80' : '#f87171' }}
            >
              {data.chiSquare.significant ? 'p<0.05 ✓' : 'Not sig.'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
