/**
 * Outcome donut — league-level home / draw / away split (pure CSS conic-gradient).
 * No chart library; reads well at a glance like broadcast graphics.
 */
export default function OutcomeDonut({ leagueStats, tab, isNBA }) {
  if (!leagueStats?.total) return null

  const { homeWins = 0, awayWins = 0, draws = 0, total } = leagueStats
  const homeDeg = (homeWins / total) * 360
  const drawDeg = isNBA ? 0 : (draws / total) * 360
  const awayDeg = (awayWins / total) * 360

  const homeC = tab.accent
  const drawC = '#64748b'
  const awayC = '#f87171'

  let gradient
  if (isNBA) {
    gradient = `conic-gradient(${homeC} 0deg ${homeDeg}deg, ${awayC} ${homeDeg}deg 360deg)`
  } else {
    const a = homeDeg
    const b = a + drawDeg
    gradient = `conic-gradient(${homeC} 0deg ${a}deg, ${drawC} ${a}deg ${b}deg, ${awayC} ${b}deg 360deg)`
  }

  return (
    <div className="metric-card flex flex-col items-center justify-center py-6 px-4">
      <p className="section-title mb-4 self-start w-full text-center sm:text-left">Outcome mix</p>

      <div className="relative w-[156px] h-[156px] flex-shrink-0">
        <div
          className="absolute inset-0 rounded-full shadow-lg"
          style={{
            background: gradient,
            transform: 'rotate(-90deg)',
            boxShadow: `0 0 40px ${tab.accent}15`,
          }}
        />
        <div className="absolute inset-[20%] rounded-full bg-[#161b25] border border-white/[0.08] flex flex-col items-center justify-center">
          <span className="text-[28px] font-black text-white leading-none tabular-nums">
            {total.toLocaleString()}
          </span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">
            {isNBA ? 'games' : 'matches'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-5 w-full space-y-2">
        <div className="flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-2 text-gray-400">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: homeC }} />
            Home wins
          </span>
          <span className="font-bold text-white tabular-nums">{homeWins.toLocaleString()}</span>
        </div>
        {!isNBA && (
          <div className="flex items-center justify-between text-[12px]">
            <span className="flex items-center gap-2 text-gray-400">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: drawC }} />
              Draws
            </span>
            <span className="font-bold text-white tabular-nums">{draws.toLocaleString()}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-2 text-gray-400">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: awayC }} />
            Away wins
          </span>
          <span className="font-bold text-white tabular-nums">{awayWins.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}
