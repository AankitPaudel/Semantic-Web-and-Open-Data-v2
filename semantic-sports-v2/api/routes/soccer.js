/**
 * api/routes/soccer.js
 * Handles both Premier League (?league=PL) and La Liga (?league=PD).
 *
 * Flow:
 *  1. Try football-data.org REST API for live standings + fixtures
 *  2. Run Wikidata SPARQL for match history → home advantage stats
 *  3. Run DBpedia SPARQL for team metadata enrichment
 *  4. Combine + compute statistics
 *  5. Fall back to mock data if anything fails
 */

const express   = require('express')
const NodeCache = require('node-cache')
const fetch     = require('node-fetch')
const { runSparql, val, numVal } = require('../../lib/sparql')
const {
  calcLeagueStats,
  calcHomeAdvantage,
  predictWinner,
  chiSquareTest,
} = require('../../lib/stats')

const router = express.Router()
const cache  = new NodeCache({ stdTTL: 3600 })

const FOOTBALL_API_BASE = 'https://api.football-data.org/v4'

const LEAGUE_CONFIG = {
  PL: {
    name:        'Premier League',
    country:     'England',
    wikidataURI: 'https://www.wikidata.org/entity/Q9448',
    wikidataEntity: 'wd:Q9448',
    wdSeasons:   ['wd:Q116198950', 'wd:Q111963073', 'wd:Q106624599', 'wd:Q94051381', 'wd:Q76390947', 'wd:Q55268018'],
    dbpediaResource: 'dbr:Premier_League',
    colorPrimary: '#38003c',
    colorAccent:  '#00ff85',
  },
  PD: {
    name:        'La Liga',
    country:     'Spain',
    wikidataURI: 'https://www.wikidata.org/entity/Q7238',
    wikidataEntity: 'wd:Q7238',
    wdSeasons:   ['wd:Q119118059', 'wd:Q111963085', 'wd:Q106624612', 'wd:Q94051395', 'wd:Q76390958', 'wd:Q55268030'],
    dbpediaResource: 'dbr:La_Liga',
    colorPrimary: '#c8102e',
    colorAccent:  '#f5a623',
  },
}

// ── Main route ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const league = (req.query.league || 'PL').toUpperCase()
  if (!LEAGUE_CONFIG[league]) {
    return res.status(400).json({ error: 'Invalid league. Use PL or PD.' })
  }

  const cacheKey = `soccer_${league}`
  const cached   = cache.get(cacheKey)
  if (cached) return res.json({ ...cached, fromCache: true })

  const config = LEAGUE_CONFIG[league]
  const provenance = { queries: [], fetchedAt: new Date().toISOString() }

  try {
    const [liveData, sparqlData] = await Promise.allSettled([
      fetchFootballData(league, config),
      fetchSparqlData(league, config),
    ])

    const live   = liveData.status   === 'fulfilled' ? liveData.value   : null
    const sparql = sparqlData.status === 'fulfilled' ? sparqlData.value : null

    // REST (football-data.org) is primary for match grids & outcome stats when available;
    // Wikidata SPARQL fills gaps or substitutes when no API key / empty response.
    const restCount  = live?.matches?.length || 0
    const wdCount    = sparql?.matches?.length || 0
    const useRest    = restCount >= 50
    const matches    = useRest ? live.matches : (sparql?.matches?.length ? sparql.matches : (live?.matches || getMockMatches(league)))
    const teamMeta   = sparql?.teamMeta || {}
    const matchSource = useRest ? 'football-data.org (REST)' : (wdCount ? 'Wikidata SPARQL' : 'demo (generated)')

    const leagueStats = calcLeagueStats(matches)
    const teamAdvantage = calcHomeAdvantage(matches)
    const chiSq = chiSquareTest(leagueStats.homeWins, leagueStats.awayWins, leagueStats.draws)

    const standings = live?.standings || getMockStandings(league)
    const fixtures  = live?.fixtures  || getMockFixtures(league)

    const predictions = fixtures.slice(0, 10).map(f => ({
      ...f,
      prediction: predictWinner(f.homeTeam, f.awayTeam, teamAdvantage, leagueStats.drawPct),
    }))

    if (sparql?.sparqlQuery)  provenance.queries.push({ label: 'Match History (Wikidata)', query: sparql.sparqlQuery,  endpoint: 'https://query.wikidata.org/sparql' })
    if (sparql?.dbpediaQuery) provenance.queries.push({ label: 'Team Metadata (DBpedia)',  query: sparql.dbpediaQuery, endpoint: 'https://dbpedia.org/sparql' })
    if (live)                 provenance.queries.push({ label: 'Match results & standings (football-data.org REST API)', endpoint: `${FOOTBALL_API_BASE}/competitions/${league}/matches`, query: null })

    provenance.sourceMixNote =
      'Match counts & win/draw/loss statistics use football-data.org as the primary source when your API key is set (complete, season-accurate grids). ' +
      'Wikidata SPARQL is used for match history when the API is unavailable or returns too few rows. ' +
      'DBpedia SPARQL adds stadium, city, and founding-year metadata only — it does not drive match totals. ' +
      `This response: ${matchSource} (${matches.length.toLocaleString()} matches). REST rows: ${restCount}, Wikidata rows: ${wdCount}.`

    const response = {
      league:       config.name,
      leagueCode:   league,
      country:      config.country,
      wikidataURI:  config.wikidataURI,
      wikidataEntity: config.wikidataEntity,
      colorPrimary: config.colorPrimary,
      colorAccent:  config.colorAccent,
      leagueStats,
      chiSquare:    chiSq,
      teamAdvantage,
      teamMeta,
      standings,
      fixtures,
      predictions,
      matchCount:   matches.length,
      matchSource,
      isMock: matchSource === 'demo (generated)',
      provenance: { ...provenance, fetchedAt: new Date().toISOString() },
      fromCache: false,
    }

    cache.set(cacheKey, response)
    res.json(response)
  } catch (err) {
    console.error(`[soccer/${league}] Error:`, err.message)
    res.json(buildMockResponse(league, config, err.message))
  }
})

// ── football-data.org REST API ──────────────────────────────────────────────
async function fetchFootballData(league, config) {
  const key = process.env.FOOTBALL_DATA_KEY
  if (!key || process.env.USE_MOCK_DATA === 'true') return null

  const headers = { 'X-Auth-Token': key }

  // Wide date window so free tier returns multiple seasons of finished matches
  const dateFrom = '2018-07-01'
  const dateTo   = new Date().toISOString().slice(0, 10)

  const [standingsRes, matchesRes, fixturesRes] = await Promise.allSettled([
    fetch(`${FOOTBALL_API_BASE}/competitions/${league}/standings`, { headers }),
    fetch(
      `${FOOTBALL_API_BASE}/competitions/${league}/matches?status=FINISHED&dateFrom=${dateFrom}&dateTo=${dateTo}&limit=2000`,
      { headers }
    ),
    fetch(`${FOOTBALL_API_BASE}/competitions/${league}/matches?status=SCHEDULED&limit=20`, { headers }),
  ])

  const standJson = standingsRes.status === 'fulfilled' && standingsRes.value.ok
    ? await standingsRes.value.json() : null
  const matchJson = matchesRes.status === 'fulfilled' && matchesRes.value.ok
    ? await matchesRes.value.json() : null
  const fixJson   = fixturesRes.status === 'fulfilled' && fixturesRes.value.ok
    ? await fixturesRes.value.json() : null

  const standings = standJson?.standings?.[0]?.table?.map(row => ({
    position: row.position,
    team:     row.team.name,
    played:   row.playedGames,
    won:      row.won,
    drawn:    row.draw,
    lost:     row.lost,
    gf:       row.goalsFor,
    ga:       row.goalsAgainst,
    gd:       row.goalDifference,
    points:   row.points,
  })) || null

  const matches = matchJson?.matches?.map(m => ({
    homeTeamLabel: m.homeTeam.name,
    awayTeamLabel: m.awayTeam.name,
    homeGoals:     m.score.fullTime.home,
    awayGoals:     m.score.fullTime.away,
    date:          m.utcDate,
  })).filter(m => m.homeGoals !== null) || []

  const fixtures = fixJson?.matches?.map(m => ({
    id:       m.id,
    date:     m.utcDate,
    homeTeam: m.homeTeam.name,
    awayTeam: m.awayTeam.name,
    matchday: m.matchday,
  })) || []

  return { standings, matches, fixtures }
}

// ── SPARQL enrichment (Wikidata + DBpedia) ─────────────────────────────────
async function fetchSparqlData(league, config) {
  const seasonsValues = config.wdSeasons.join('\n    ')

  const sparqlQuery = `PREFIX wd:  <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT DISTINCT ?match ?date ?homeTeam ?homeTeamLabel ?awayTeam ?awayTeamLabel ?homeGoals ?awayGoals
WHERE {
  VALUES ?season { ${seasonsValues} }
  ?match wdt:P2453 ?season .
  ?match wdt:P6112 ?homeTeam ;
         wdt:P6113 ?awayTeam ;
         wdt:P585  ?date ;
         wdt:P1350 ?homeGoals ;
         wdt:P1351 ?awayGoals .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?date)
LIMIT 2500`

  const dbpediaQuery = `PREFIX dbo:  <http://dbpedia.org/ontology/>
PREFIX ${config.dbpediaResource.split(':')[0]}: <http://dbpedia.org/resource/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?team ?teamName ?stadiumName ?cityName ?founded
WHERE {
  ?team dbo:league ${config.dbpediaResource} .
  ?team rdfs:label ?teamName .
  OPTIONAL { ?team dbo:ground ?stadium . ?stadium rdfs:label ?stadiumName . FILTER (lang(?stadiumName) = 'en') }
  OPTIONAL { ?team dbo:city ?city . ?city rdfs:label ?cityName . FILTER (lang(?cityName) = 'en') }
  OPTIONAL { ?team dbo:foundingDate ?founded . }
  FILTER (lang(?teamName) = 'en')
}
ORDER BY ?teamName
LIMIT 50`

  const [wdResult, dbResult] = await Promise.allSettled([
    runSparql('wikidata', sparqlQuery),
    runSparql('dbpedia',  dbpediaQuery),
  ])

  const matches = wdResult.status === 'fulfilled'
    ? wdResult.value.results.map(b => ({
        homeTeamLabel: val(b, 'homeTeamLabel'),
        awayTeamLabel: val(b, 'awayTeamLabel'),
        homeGoals:     numVal(b, 'homeGoals'),
        awayGoals:     numVal(b, 'awayGoals'),
        date:          val(b, 'date'),
        homeTeamURI:   val(b, 'homeTeam'),
        awayTeamURI:   val(b, 'awayTeam'),
      })).filter(m => m.homeGoals !== null && m.awayGoals !== null)
    : []

  const teamMeta = {}
  if (dbResult.status === 'fulfilled') {
    for (const b of dbResult.value.results) {
      const name = val(b, 'teamName')
      if (name) {
        teamMeta[name] = {
          stadium: val(b, 'stadiumName'),
          city:    val(b, 'cityName'),
          founded: val(b, 'founded'),
          uri:     val(b, 'team'),
        }
      }
    }
  }

  return { matches, teamMeta, sparqlQuery, dbpediaQuery }
}

// ── Mock data fallbacks ─────────────────────────────────────────────────────
function getMockMatches(league) {
  const teams = league === 'PL'
    ? ['Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Man United', 'Spurs', 'Newcastle', 'Aston Villa', 'Brighton', 'West Ham']
    : ['Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla', 'Real Betis', 'Valencia', 'Villarreal', 'Athletic Club', 'Real Sociedad', 'Osasuna']

  // Generate 6 seasons worth of mock matches (6 × 380 = 2,280)
  const matches = []
  for (let season = 0; season < 6; season++) {
    // round-robin: each pair plays home and away
    for (let i = 0; i < teams.length; i++) {
      for (let j = 0; j < teams.length; j++) {
        if (i === j) continue
        // Home advantage baked in: home team wins ~44%, away ~34%, draw ~22%
        const r  = Math.random()
        const hg = Math.floor(Math.random() * 4)
        const ag = r < 0.44 ? Math.max(0, hg - 1) : r < 0.78 ? Math.floor(Math.random() * 3) : hg + 1
        const daysAgo = (season * 365) + (i * 10) + j
        matches.push({
          homeTeamLabel: teams[i],
          awayTeamLabel: teams[j],
          homeGoals: hg,
          awayGoals: ag,
          date: new Date(Date.now() - daysAgo * 86400000).toISOString(),
        })
      }
    }
  }
  return matches
}

function getMockStandings(league) {
  const teams = league === 'PL'
    ? ['Man City', 'Arsenal', 'Liverpool', 'Aston Villa', 'Spurs', 'Chelsea', 'Newcastle', 'Man United', 'West Ham', 'Brighton']
    : ['Real Madrid', 'Barcelona', 'Atletico Madrid', 'Girona', 'Villarreal', 'Athletic Club', 'Real Betis', 'Real Sociedad', 'Las Palmas', 'Getafe']
  return teams.map((team, i) => ({
    position: i + 1, team, played: 30, won: 20 - i * 1.5 | 0,
    drawn: 5, lost: 5 + i | 0, gf: 60 - i * 4, ga: 20 + i * 3,
    gd: 40 - i * 7, points: 65 - i * 5,
  }))
}

function getMockFixtures(league) {
  const teams = league === 'PL'
    ? ['Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Spurs', 'Newcastle']
    : ['Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla', 'Valencia', 'Villarreal']
  return [
    { id: 1, date: new Date(Date.now() + 86400000 * 3).toISOString(), homeTeam: teams[0], awayTeam: teams[1], matchday: 31 },
    { id: 2, date: new Date(Date.now() + 86400000 * 3).toISOString(), homeTeam: teams[2], awayTeam: teams[3], matchday: 31 },
    { id: 3, date: new Date(Date.now() + 86400000 * 4).toISOString(), homeTeam: teams[4], awayTeam: teams[5], matchday: 31 },
    { id: 4, date: new Date(Date.now() + 86400000 * 7).toISOString(), homeTeam: teams[1], awayTeam: teams[4], matchday: 32 },
    { id: 5, date: new Date(Date.now() + 86400000 * 7).toISOString(), homeTeam: teams[3], awayTeam: teams[0], matchday: 32 },
  ]
}

function buildMockResponse(league, config, errorMsg) {
  const matches = getMockMatches(league)
  const leagueStats = calcLeagueStats(matches)
  const teamAdvantage = calcHomeAdvantage(matches)
  const chiSq = chiSquareTest(leagueStats.homeWins, leagueStats.awayWins, leagueStats.draws)
  const fixtures = getMockFixtures(league)
  return {
    league: config.name, leagueCode: league, country: config.country,
    wikidataURI: config.wikidataURI, wikidataEntity: config.wikidataEntity,
    colorPrimary: config.colorPrimary, colorAccent: config.colorAccent,
    leagueStats, chiSquare: chiSq, teamAdvantage, teamMeta: {},
    standings: getMockStandings(league), fixtures,
    predictions: fixtures.map(f => ({ ...f, prediction: predictWinner(f.homeTeam, f.awayTeam, teamAdvantage, leagueStats.drawPct) })),
    matchCount: matches.length,
    matchSource: 'demo (generated)',
    provenance: {
      queries: [{ label: 'Mock Data (API unavailable)', query: null, endpoint: 'local' }],
      fetchedAt: new Date().toISOString(),
      sourceMixNote:
        'Demo mode: match rows are generated locally so the UI always works without an API key. ' +
        'With FOOTBALL_DATA_KEY set, match counts & outcomes come from football-data.org (REST); Wikidata/DBpedia then enrich or substitute as configured.',
    },
    isMock: true, mockReason: errorMsg,
  }
}

module.exports = router
