const ICONS = {
  home:  '🏠',
  away:  '✈️',
  draw:  '🤝',
  total: '📊',
  chi:   '🧮',
}

function MetricCard({ icon, label, value, sub, highlight, trend }) {
  return (
    <div className="metric-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="section-title">{label}</span>
        <span className="text-lg leading-none opacity-70">{icon}</span>
      </div>

      <div>
        <div
          className="text-3xl font-black tracking-tight leading-none"
          style={{ color: highlight || '#fff' }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[12px] text-gray-500 mt-1.5 leading-snug">{sub}</div>
        )}
      </div>

      {trend !== undefined && (
        <div
          className="text-[11px] font-semibold flex items-center gap-1"
          style={{ color: trend >= 0 ? '#4ade80' : '#f87171' }}
        >
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs away
        </div>
      )}
    </div>
  )
}

function ChiCard({ chi }) {
  if (!chi) return null
  const sig = chi.significant
  return (
    <div className="metric-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="section-title">Chi-Square Test</span>
        <span className="text-lg leading-none opacity-70">🧮</span>
      </div>

      <div>
        <div
          className="text-3xl font-black tracking-tight leading-none"
          style={{ color: sig ? '#4ade80' : '#f87171' }}
        >
          {typeof chi.pValue === 'string' ? chi.pValue : `${chi.pValue}`}
        </div>
        <div className="text-[12px] text-gray-500 mt-1.5">p-value · df={chi.df}</div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="pill text-[10px]"
          style={sig
            ? { background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }
            : { background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)' }
          }
        >
          {sig ? '✓ Significant' : '✗ Not significant'}
        </span>
        <span className="text-[11px] text-gray-600">χ² = {chi.chiSquare}</span>
      </div>
    </div>
  )
}

export default function StatCards({ data, tab, isNBA }) {
  const ls  = data?.leagueStats
  const chi = data?.chiSquare

  if (!ls) return null

  const trend = ls.homeWinPct && ls.awayWinPct
    ? Math.round((ls.homeWinPct - ls.awayWinPct) * 10) / 10
    : undefined

  return (
    <div className={`grid gap-4 ${isNBA ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-5'}`}>
      <MetricCard
        icon={ICONS.home}
        label="Home Win Rate"
        value={`${ls.homeWinPct}%`}
        sub={`${ls.homeWins?.toLocaleString() ?? '—'} victories`}
        highlight={tab.accent}
        trend={trend}
      />
      <MetricCard
        icon={ICONS.away}
        label="Away Win Rate"
        value={`${ls.awayWinPct}%`}
        sub={`${ls.awayWins?.toLocaleString() ?? '—'} victories`}
        highlight="#f87171"
      />
      {!isNBA && (
        <MetricCard
          icon={ICONS.draw}
          label="Draw Rate"
          value={`${ls.drawPct}%`}
          sub={`${ls.draws?.toLocaleString() ?? '—'} draws`}
          highlight="#94a3b8"
        />
      )}
      <MetricCard
        icon={ICONS.total}
        label="Matches Analysed"
        value={ls.total?.toLocaleString() ?? '—'}
        sub={`Seasons 2020–2024`}
        highlight="#e2e8f0"
      />
      <ChiCard chi={chi} />
    </div>
  )
}
