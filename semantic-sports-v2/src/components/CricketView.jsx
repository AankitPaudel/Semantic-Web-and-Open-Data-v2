import ProvenancePanel from './ProvenancePanel'
import DataQualityBar from './DataQualityBar'
import SourceMixCallout from './SourceMixCallout'

const COMP_OPTIONS = [
  { value: 'ipl',  label: 'IPL',              sub: 'Indian Premier League' },
  { value: 'intl', label: 'International',    sub: 'Tests · ODIs · T20Is' },
  { value: 'icc',  label: 'ICC Tournaments',  sub: 'World Cup · T20 WC · Champions Trophy' },
  { value: 'all',  label: 'All Competitions', sub: 'Combined view' },
]

function fmtDate(str) {
  if (!str) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(str))
  } catch { return str.slice(0, 10) }
}

function SkeletonBlock({ h = 'h-32' }) {
  return <div className={`skeleton rounded-xl ${h}`} />
}

function SectionHeader({ title, sub }) {
  return (
    <div className="mb-5">
      <h3 className="text-[15px] font-bold text-white">{title}</h3>
      {sub && <p className="text-[12px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function CricketView({ data, loading, error, refetch, comp, setComp, tab }) {
  const accentColor = tab.accent

  return (
    <div className="space-y-5 fade-up">

      {/* ── Page heading ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${tab.bg}cc` }}>
            🏏
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Cricket Analytics</h2>
            <p className="text-[11px] text-gray-500 mt-0.5">
              100% Wikidata SPARQL ·{' '}
              <a href="https://www.wikidata.org/entity/Q1100759" target="_blank" rel="noreferrer"
                 className="hover:underline" style={{ color: accentColor }}>wd:Q1100759</a>
              {' · '}
              <a href="https://www.wikidata.org/entity/Q193070" target="_blank" rel="noreferrer"
                 className="hover:underline" style={{ color: accentColor }}>wd:Q193070</a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Competition filter */}
          <div className="relative">
            <select
              value={comp}
              onChange={e => setComp(e.target.value)}
              className="appearance-none bg-[#1a1f2e] border border-white/[0.08] text-white text-[13px] font-medium
                         rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:border-white/20 transition-colors cursor-pointer"
            >
              {COMP_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none text-[10px]">▼</span>
          </div>
          <button
            onClick={refetch}
            className="btn bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/8"
          >
            ↻
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} h="h-[100px]" />)}
          </div>
          <SkeletonBlock h="h-80" />
          <SkeletonBlock h="h-72" />
        </div>
      ) : !data ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-white font-semibold">Could not load cricket data</p>
          <p className="text-gray-500 text-[13px] mt-1">{error}</p>
        </div>
      ) : (
        <>
          {/* ── Data quality bar ── */}
          <DataQualityBar data={data} sport="cricket" tab={tab} />

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="metric-card flex flex-col gap-3">
              <span className="section-title">Total Matches</span>
              <div>
                <div className="text-3xl font-black tracking-tight" style={{ color: accentColor }}>
                  {data.stats?.totalMatches?.toLocaleString()}
                </div>
                <div className="text-[12px] text-gray-500 mt-1">from Wikidata SPARQL</div>
              </div>
            </div>
            <div className="metric-card flex flex-col gap-3">
              <span className="section-title">Venues Tracked</span>
              <div>
                <div className="text-3xl font-black tracking-tight text-white">
                  {data.stats?.venuesTracked}
                </div>
                <div className="text-[12px] text-gray-500 mt-1">unique cricket grounds</div>
              </div>
            </div>
            <div className="metric-card flex flex-col gap-3">
              <span className="section-title">Data Source</span>
              <div>
                <div className="text-[15px] font-black text-green-400">Wikidata SPARQL</div>
                <div className="text-[11px] text-gray-500 mt-1 font-mono">query.wikidata.org</div>
              </div>
              <span
                className="pill w-fit text-[10px]"
                style={{ background: `${accentColor}15`, color: accentColor, border: `1px solid ${accentColor}30` }}
              >
                No external API
              </span>
            </div>
          </div>

          {/* ── Wikidata entity badges ── */}
          {data.wikidataEntities?.length > 0 && (
            <div className="card p-4">
              <p className="section-title mb-3">Linked Data Entities</p>
              <div className="flex flex-wrap gap-2">
                {data.wikidataEntities.map(uri => {
                  const id  = uri.replace('wd:', '')
                  const url = `https://www.wikidata.org/entity/${id}`
                  return (
                    <a
                      key={uri}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="pill hover:opacity-80 transition-opacity"
                      style={{
                        background: `${accentColor}12`,
                        color: accentColor,
                        border: `1px solid ${accentColor}30`,
                      }}
                    >
                      🔗 {uri}
                    </a>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Venue advantage chart ── */}
          {data.venueAdvantage?.length > 0 && (
            <div className="card p-5">
              <SectionHeader
                title="Top Venues by Home Dominance"
                sub="Most frequent winner's win rate at each venue (min. 3 matches)"
              />
              <div className="space-y-2">
                {data.venueAdvantage.map((v, i) => (
                  <div key={v.venue} className="flex items-center gap-3 group">
                    <span className="text-[11px] text-gray-600 w-4 text-right flex-shrink-0 tabular-nums">{i + 1}</span>
                    <div className="w-44 sm:w-56 flex-shrink-0">
                      <p className="text-[12px] text-gray-300 font-medium truncate">{v.venue}</p>
                      <p className="text-[10px] text-gray-600 truncate">{v.dominantTeam}</p>
                    </div>
                    <div className="flex-1 h-[6px] bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bar-animate"
                        style={{
                          width: `${v.dominanceScore}%`,
                          background: `linear-gradient(90deg, ${accentColor}60, ${accentColor})`,
                          animationDelay: `${i * 40}ms`,
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: accentColor }}>
                        {v.dominanceScore}%
                      </span>
                      <span className="text-[10px] text-gray-600 hidden sm:block">
                        {v.matches} matches
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent matches ── */}
          {data.recentMatches?.length > 0 && (
            <div className="card p-5">
              <SectionHeader
                title="Recent Matches"
                sub="Live from Wikidata SPARQL — no external sports API used"
              />
              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-[12px] min-w-[560px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['Date', 'Team 1', 'Team 2', 'Winner', 'Venue', 'Format'].map(h => (
                        <th key={h} className="pb-3 text-left pr-4">
                          <span className="section-title">{h}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {data.recentMatches.map((m, i) => (
                      <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-2.5 pr-4 text-gray-500 whitespace-nowrap">{fmtDate(m.date)}</td>
                        <td className="py-2.5 pr-4 font-semibold text-white">{m.team1 || '—'}</td>
                        <td className="py-2.5 pr-4 text-gray-400">{m.team2 || '—'}</td>
                        <td className="py-2.5 pr-4 font-bold" style={{ color: accentColor }}>
                          {m.winner || '—'}
                        </td>
                        <td className="py-2.5 pr-4 text-gray-500 max-w-[130px] truncate">{m.venue || '—'}</td>
                        <td className="py-2.5">
                          {m.format && (
                            <span className="pill bg-white/[0.06] text-gray-400 text-[10px]">{m.format}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <SourceMixCallout text={data.provenance?.sourceMixNote} tab={tab} />

          <ProvenancePanel provenance={data.provenance} tab={tab} />
        </>
      )}
    </div>
  )
}
