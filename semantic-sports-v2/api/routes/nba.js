/**
 * api/routes/nba.js
 * NBA data via balldontlie.io (no key needed) + Wikidata SPARQL for team enrichment.
 */

const express   = require('express')
const NodeCache = require('node-cache')
const fetch     = require('node-fetch')
const { runSparql, val } = require('../../lib/sparql')
const {
  calcLeagueStats,
  calcHomeAdvantage,
  predictWinner,
  chiSquareTest,
} = require('../../lib/stats')

const router = express.Router()
const cache  = new NodeCache({ stdTTL: 3600 })

const BDL_BASE = 'https://www.balldontlie.io/api/v1'

const SPARQL_QUERY = `PREFIX wd:  <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT DISTINCT ?team ?teamLabel ?arena ?arenaLabel ?city ?cityLabel ?founded
WHERE {
  ?team wdt:P31 wd:Q4498974 .
  OPTIONAL { ?team wdt:P115 ?arena . }
  OPTIONAL { ?team wdt:P131 ?city . }
  OPTIONAL { ?team wdt:P571 ?founded . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY ?teamLabel
LIMIT 35`

router.get('/', async (req, res) => {
  const cached = cache.get('nba')
  if (cached) return res.json({ ...cached, fromCache: true })

  try {
    const [gamesResult, sparqlResult] = await Promise.allSettled([
      fetchNBAGames(),
      runSparql('wikidata', SPARQL_QUERY),
    ])

    const gamesPayload = gamesResult.status === 'fulfilled'
      ? gamesResult.value
      : { games: getMockGames(), matchSource: 'demo (generated)' }
    const games          = gamesPayload.games ?? gamesPayload
    const nbaMatchSource = gamesPayload.matchSource ?? 'balldontlie.io (REST)'
    const sparqlMeta = sparqlResult.status === 'fulfilled' ? sparqlResult.value  : { results: [], meta: {} }

    const teamMeta = {}
    for (const b of sparqlMeta.results) {
      const name = val(b, 'teamLabel')
      if (name) {
        teamMeta[name] = {
          arena:   val(b, 'arenaLabel'),
          city:    val(b, 'cityLabel'),
          founded: val(b, 'founded'),
          uri:     val(b, 'team'),
        }
      }
    }

    const leagueStats   = calcLeagueStatsNBA(games)
    const teamAdvantage = calcHomeAdvantageNBA(games)
    const chiSq = chiSquareTest(leagueStats.homeWins, leagueStats.awayWins, 0)

    const upcoming = getMockUpcomingNBA()
    const predictions = upcoming.map(g => ({
      ...g,
      prediction: predictWinnerNBA(g.homeTeam, g.awayTeam, teamAdvantage),
    }))

    const response = {
      sport:       'NBA',
      wikidataURI: 'https://www.wikidata.org/entity/Q155223',
      wikidataEntity: 'wd:Q155223',
      colorPrimary: '#1d428a',
      colorAccent:  '#ffc72c',
      leagueStats,
      chiSquare:   chiSq,
      teamAdvantage,
      teamMeta,
      upcoming,
      predictions,
      gameCount:   games.length,
      matchSource: nbaMatchSource,
      provenance: {
        queries: [
          { label: 'NBA Team Metadata (Wikidata)', query: SPARQL_QUERY, endpoint: 'https://query.wikidata.org/sparql' },
          { label: 'Game Results (balldontlie.io REST API)', query: null, endpoint: BDL_BASE },
        ],
        fetchedAt: new Date().toISOString(),
        sourceMixNote:
          'Scores & home/away win totals: primary = balldontlie.io (REST). ' +
          'Wikidata SPARQL supplies arena, city, founding year, and stable team URIs only — it does not drive game counts. ' +
          `This response: ${nbaMatchSource} (${games.length.toLocaleString()} games).`,
      },
      fromCache: false,
      isMock: nbaMatchSource.includes('demo'),
    }

    cache.set('nba', response)
    res.json(response)
  } catch (err) {
    console.error('[nba] Error:', err.message)
    res.json(buildMockNBAResponse(err.message))
  }
})

async function fetchNBAGames() {
  // 6 seasons: 2018–2023 → up to 6 × 1,230 = 7,380 games possible
  const seasons  = [2023, 2022, 2021, 2020, 2019, 2018]
  const allGames = []

  for (const season of seasons) {
    try {
      let page = 1
      const maxPagesPerSeason = 15   // 15 × 100 = 1,500 — enough for one full season
      while (page <= maxPagesPerSeason) {
        const res = await fetch(
          `${BDL_BASE}/games?seasons[]=${season}&per_page=100&page=${page}`,
          { headers: { 'User-Agent': 'SemanticSportsAnalyticsV2/2.0' } }
        )
        if (!res.ok) break
        const json = await res.json()
        const games = json.data || []
        if (games.length === 0) break

        for (const g of games) {
          // Only include completed regular season games with valid scores
          if (g.home_team_score && g.visitor_team_score && g.status === 'Final') {
            allGames.push({
              homeTeamLabel: g.home_team.full_name,
              awayTeamLabel: g.visitor_team.full_name,
              homeGoals:     g.home_team_score,
              awayGoals:     g.visitor_team_score,
              date:          g.date,
              season,
            })
          }
        }
        if (!json.meta?.next_page) break
        page++
      }
    } catch (e) {
      console.error(`[nba] Season ${season} fetch error:`, e.message)
      break
    }
  }

  if (allGames.length > 50) return { games: allGames, matchSource: 'balldontlie.io (REST)' }
  return { games: getMockGames(), matchSource: 'demo (generated)' }
}

function calcLeagueStatsNBA(games) {
  let homeWins = 0, awayWins = 0
  for (const g of games) {
    if (Number(g.homeGoals) > Number(g.awayGoals)) homeWins++
    else awayWins++
  }
  const total = homeWins + awayWins
  if (total === 0) return { homeWinPct: 0, awayWinPct: 0, drawPct: 0, total: 0, homeWins: 0, awayWins: 0, draws: 0 }
  return {
    homeWinPct: Math.round((homeWins / total) * 10000) / 100,
    awayWinPct: Math.round((awayWins / total) * 10000) / 100,
    drawPct: 0, total, homeWins, awayWins, draws: 0,
  }
}

function calcHomeAdvantageNBA(games) {
  return calcHomeAdvantage(games)
}

function predictWinnerNBA(homeTeam, awayTeam, teamAdvantage) {
  const h = teamAdvantage.find(t => t.team === homeTeam)
  const a = teamAdvantage.find(t => t.team === awayTeam)
  const homeStr = h ? h.homeWinPct : 58
  const awayStr = a ? a.awayWinPct : 42
  const total   = homeStr + awayStr || 100
  return {
    home: Math.round((homeStr / total) * 10000) / 100,
    draw: 0,
    away: Math.round((awayStr / total) * 10000) / 100,
  }
}

const NBA_TEAMS = [
  'Los Angeles Lakers', 'Boston Celtics', 'Golden State Warriors', 'Miami Heat',
  'Milwaukee Bucks', 'Philadelphia 76ers', 'Denver Nuggets', 'Phoenix Suns',
  'Dallas Mavericks', 'New York Knicks', 'Memphis Grizzlies', 'Cleveland Cavaliers',
]

function getMockGames() {
  // 6 seasons × ~600 games sample = 3,600 games
  // NBA home win rate is historically ~59-60%
  const games = []
  for (let season = 0; season < 6; season++) {
    for (let i = 0; i < 600; i++) {
      const h = NBA_TEAMS[i % NBA_TEAMS.length]
      const a = NBA_TEAMS[(i + 1 + season) % NBA_TEAMS.length] === h
        ? NBA_TEAMS[(i + 2) % NBA_TEAMS.length]
        : NBA_TEAMS[(i + 1 + season) % NBA_TEAMS.length]
      // ~59% home win rate built in
      const homeScore = 100 + Math.floor(Math.random() * 25)
      const awayScore = Math.random() < 0.59
        ? homeScore - Math.floor(Math.random() * 10) - 1
        : homeScore + Math.floor(Math.random() * 10) + 1
      games.push({
        homeTeamLabel: h, awayTeamLabel: a,
        homeGoals:  homeScore,
        awayGoals:  Math.max(awayScore, 85),
        date: new Date(Date.now() - (season * 365 + i * 2) * 86400000).toISOString(),
        season: 2023 - season,
      })
    }
  }
  return games
}

function getMockUpcomingNBA() {
  return NBA_TEAMS.slice(0, 6).reduce((acc, _, i) => {
    if (i % 2 === 0) acc.push({ id: i, date: new Date(Date.now() + (i + 1) * 86400000 * 2).toISOString(), homeTeam: NBA_TEAMS[i], awayTeam: NBA_TEAMS[i + 1] })
    return acc
  }, [])
}

function buildMockNBAResponse(errorMsg) {
  const games = getMockGames()
  const leagueStats = calcLeagueStatsNBA(games)
  const teamAdvantage = calcHomeAdvantageNBA(games)
  const chiSq = chiSquareTest(leagueStats.homeWins, leagueStats.awayWins, 0)
  const upcoming = getMockUpcomingNBA()
  return {
    sport: 'NBA', wikidataURI: 'https://www.wikidata.org/entity/Q155223', wikidataEntity: 'wd:Q155223',
    colorPrimary: '#1d428a', colorAccent: '#ffc72c',
    leagueStats, chiSquare: chiSq, teamAdvantage, teamMeta: {}, upcoming,
    predictions: upcoming.map(g => ({ ...g, prediction: predictWinnerNBA(g.homeTeam, g.awayTeam, teamAdvantage) })),
    gameCount: games.length,
    matchSource: 'demo (generated)',
    provenance: {
      queries: [{ label: 'Mock Data', query: null, endpoint: 'local' }],
      fetchedAt: new Date().toISOString(),
      sourceMixNote:
        'Demo mode: game rows are generated locally. With network access, balldontlie.io supplies scores; Wikidata SPARQL enriches teams only.',
    },
    isMock: true, mockReason: errorMsg,
  }
}

module.exports = router
