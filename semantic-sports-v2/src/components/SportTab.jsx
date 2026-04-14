import StatCards from './StatCards'
import AdvantageChart from './AdvantageChart'
import PredictionCards from './PredictionCards'
import StandingsTable from './StandingsTable'
import ProvenancePanel from './ProvenancePanel'
import DataQualityBar from './DataQualityBar'
import OutcomeDonut from './OutcomeDonut'
import SourceMixCallout from './SourceMixCallout'

function SkeletonBlock({ h = 'h-32' }) {
  return <div className={`skeleton rounded-xl ${h}`} />
}

function SectionHeader({ title, sub, right }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h3 className="text-[15px] font-bold text-white">{title}</h3>
        {sub && <p className="text-[12px] text-gray-500 mt-0.5">{sub}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  )
}

export default function SportTab({ data, loading, error, refetch, sport, tab }) {
  const isNBA    = sport === 'NBA'
  const isSoccer = sport === 'PL' || sport === 'PD'

  /* ── loading state ── */
  if (loading && !data) {
    return (
      <div className="space-y-5 fade-up">
        <div className={`grid gap-4 ${isNBA ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-5'}`}>
          {Array.from({ length: isNBA ? 4 : 5 }).map((_, i) => <SkeletonBlock key={i} h="h-[100px]" />)}
        </div>
        <SkeletonBlock h="h-[420px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} h="h-28" />)}
        </div>
        {isSoccer && <SkeletonBlock h="h-72" />}
      </div>
    )
  }

  /* ── error / no data ── */
  if (!data) {
    return (
      <div className="card p-10 text-center fade-up">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-white font-semibold mb-1">Could not load data</p>
        <p className="text-gray-500 text-[13px] mb-5 max-w-md mx-auto">{error || 'Unknown error'}</p>
        <button
          onClick={refetch}
          className="btn bg-white/8 text-white hover:bg-white/12 text-[13px] px-5 py-2"
        >
          Try again
        </button>
      </div>
    )
  }

  /* ── build predictions array ── */
  const predictions = data.predictions?.length > 0
    ? data.predictions
    : (data.fixtures || data.upcoming || []).map(f => ({
        ...f,
        prediction: f.prediction || { home: 45, draw: 25, away: 30 },
      }))

  return (
    <div className="space-y-5 fade-up">

      {/* ── Page heading ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${tab.bg}cc` }}
          >
            {tab.flag}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {data.league || data.sport}
              {data.isMock && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                  Demo Data
                </span>
              )}
            </h2>
            {data.wikidataURI && (
              <a
                href={data.wikidataURI}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 mt-0.5"
              >
                🔗 {data.wikidataEntity} — Wikidata Linked Data
              </a>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data.matchCount && (
            <span className="text-[12px] text-gray-500 bg-white/4 px-3 py-1.5 rounded-lg border border-white/5">
              {data.matchCount.toLocaleString()} matches
            </span>
          )}
          <button
            onClick={refetch}
            className="btn bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/8"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* ── Data quality bar ── */}
      <DataQualityBar data={data} sport={sport} tab={tab} />

      {/* ── Outcome donut + stat cards ── */}
      <div className="grid lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-3 flex justify-center lg:justify-stretch">
          <div className="w-full max-w-[200px] lg:max-w-none">
            <OutcomeDonut leagueStats={data.leagueStats} tab={tab} isNBA={isNBA} />
          </div>
        </div>
        <div className="lg:col-span-9">
          <StatCards data={data} tab={tab} isNBA={isNBA} />
        </div>
      </div>

      {/* ── Home advantage chart ── */}
      <div className="card p-5">
        <SectionHeader
          title="Home Advantage by Team"
          sub={
            isSoccer
              ? 'Every club in the league table is listed; home win % minus away win % (sorted by advantage).'
              : 'Home win % minus away win % — sorted by advantage'
          }
        />
        <AdvantageChart
          teams={data.teamAdvantage || []}
          tab={tab}
          teamMeta={data.teamMeta || {}}
          showAllByDefault={isSoccer}
        />
      </div>

      {/* ── Fixture predictions ── */}
      {predictions.length > 0 && (
        <div className="card p-5">
          <SectionHeader
            title={isNBA ? 'Upcoming Games' : 'Upcoming Fixtures'}
            sub={isNBA
              ? 'Win probability based on historical home/away records'
              : 'Three-way outcome probability: Home · Draw · Away'}
          />
          <PredictionCards predictions={predictions} tab={tab} isNBA={isNBA} />
        </div>
      )}

      {/* ── Standings ── */}
      {isSoccer && data.standings?.length > 0 && (
        <div className="card p-5">
          <SectionHeader title="Current Standings" />
          <StandingsTable standings={data.standings} tab={tab} />
        </div>
      )}

      {/* ── Source model (always visible, above SPARQL panel) ── */}
      <SourceMixCallout text={data.provenance?.sourceMixNote} tab={tab} />

      {/* ── Data provenance (queries + endpoints) ── */}
      <ProvenancePanel provenance={data.provenance} tab={tab} />
    </div>
  )
}
