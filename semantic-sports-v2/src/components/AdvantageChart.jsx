import { useState } from 'react'

function TeamRow({ team, rank, accent, meta, maxAbs }) {
  const [hovered, setHovered] = useState(false)
  const insufficient = team.insufficientData === true
  const isPos   = !insufficient && team.advantage >= 0
  const barPct  = insufficient ? 0 : Math.min(Math.abs(team.advantage / maxAbs) * 100, 100)
  const color   = insufficient ? '#64748b' : (isPos ? accent : '#f87171')

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-150"
        style={{ background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent' }}
      >
        {/* Rank */}
        <span className="text-[11px] text-gray-600 w-5 text-right flex-shrink-0 tabular-nums">
          {rank}
        </span>

        {/* Team name */}
        <span className="text-[13px] text-gray-200 font-medium w-36 sm:w-44 truncate flex-shrink-0">
          {team.team}
        </span>

        {/* Bar track */}
        <div className="flex-1 flex items-center gap-3">
          <div className="flex-1 h-[6px] bg-white/[0.06] rounded-full overflow-hidden">
            {!insufficient && (
              <div
                className="h-full rounded-full bar-animate"
                style={{
                  width: `${barPct}%`,
                  background: isPos
                    ? `linear-gradient(90deg, ${accent}60, ${accent})`
                    : 'linear-gradient(90deg, #f8717160, #f87171)',
                  animationDelay: `${rank * 30}ms`,
                }}
              />
            )}
          </div>

          {/* Value */}
          <span
            className="text-[13px] font-bold tabular-nums w-14 text-right flex-shrink-0"
            style={{ color }}
          >
            {insufficient ? '—' : `${team.advantage > 0 ? '+' : ''}${team.advantage}%`}
          </span>

          {/* Mini stats */}
          <span className="hidden sm:block text-[11px] text-gray-600 w-24 text-right flex-shrink-0">
            {insufficient ? 'No sample' : `H ${team.homeWinPct}% / A ${team.awayWinPct}%`}
          </span>
        </div>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute left-0 top-full mt-1 z-30 card p-4 shadow-2xl w-60 pointer-events-none fade-up"
             style={{ border: `1px solid ${accent}30` }}>
          <p className="text-[13px] font-bold text-white mb-3">{team.team}</p>
          <div className="space-y-2">
            {insufficient ? (
              <p className="text-[12px] text-gray-400 leading-snug">
                Not enough finished matches in the current sample for this club (need home and away games in the dataset).
              </p>
            ) : (
              <>
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Home win rate</span>
                  <span className="font-semibold" style={{ color: accent }}>{team.homeWinPct}%</span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Away win rate</span>
                  <span className="font-semibold text-[#f87171]">{team.awayWinPct}%</span>
                </div>
                <div className="divider my-2" />
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Home advantage</span>
                  <span className="font-bold" style={{ color }}>
                    {team.advantage > 0 ? '+' : ''}{team.advantage}%
                  </span>
                </div>
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Games (H/A)</span>
                  <span className="text-gray-400">{team.homePlayed} / {team.awayPlayed}</span>
                </div>
              </>
            )}
          </div>
          {meta && (
            <div className="mt-3 pt-3 divider space-y-1.5 text-[11px] text-gray-500">
              {meta.stadium && <div>🏟 {meta.stadium}</div>}
              {meta.city    && <div>📍 {meta.city}</div>}
              {meta.founded && <div>📅 Founded {meta.founded?.slice(0, 4)}</div>}
              {meta.uri && (
                <a
                  href={meta.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-400 hover:underline pointer-events-auto mt-1"
                  onClick={e => e.stopPropagation()}
                >
                  🔗 Wikidata entity ↗
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdvantageChart({ teams = [], tab, teamMeta = {}, showAllByDefault }) {
  const defaultExpanded = showAllByDefault ?? teams.length <= 24
  const [showAll, setShowAll] = useState(defaultExpanded)

  if (teams.length === 0) {
    return (
      <div className="py-12 text-center text-gray-600 text-sm">
        No team data available
      </div>
    )
  }

  const withStats = teams.filter(t => !t.insufficientData)
  const maxAbs    = Math.max(...withStats.map(t => Math.abs(t.advantage)), 1)
  const displayed = showAll ? teams : teams.slice(0, 12)
  const avgAdv    = withStats.length
    ? Math.round((withStats.reduce((s, t) => s + t.advantage, 0) / withStats.length) * 10) / 10
    : 0

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-[11px] text-gray-500 px-4">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-[3px] rounded-full inline-block" style={{ background: tab.accent }} />
          Home advantage
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-[3px] rounded-full bg-[#f87171] inline-block" />
          Home disadvantage
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-[3px] rounded-full bg-[#64748b] inline-block" />
          No sample
        </span>
        <span className="ml-auto">
          League avg: <span className="font-semibold text-white">{avgAdv > 0 ? '+' : ''}{avgAdv}%</span>
        </span>
      </div>

      {/* Rows */}
      <div className="space-y-0.5">
        {displayed.map((t, i) => (
          <TeamRow
            key={t.team}
            team={t}
            rank={i + 1}
            accent={tab.accent}
            meta={teamMeta[t.team]}
            maxAbs={maxAbs}
          />
        ))}
      </div>

      {teams.length > 12 && (
        <button
          onClick={() => setShowAll(s => !s)}
          className="mt-3 mx-auto flex items-center gap-1.5 btn-ghost text-[12px]"
        >
          {showAll ? '▲ Show less' : `▼ Show all ${teams.length} teams`}
        </button>
      )}
    </div>
  )
}
