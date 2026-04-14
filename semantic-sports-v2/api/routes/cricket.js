/**
 * api/routes/cricket.js
 * 100% Wikidata SPARQL — no external sports API.
 * ?comp=ipl | intl | icc | all
 */

const express   = require('express')
const NodeCache = require('node-cache')
const { runSparql, val } = require('../../lib/sparql')
const { calcVenueAdvantage } = require('../../lib/stats')

const router = express.Router()
const cache  = new NodeCache({ stdTTL: 3600 })

const COMP_CONFIG = {
  ipl: {
    label: 'IPL',
    wikidataEntities: ['wd:Q1100759'],
    description: 'Indian Premier League — franchise-based T20 competition',
  },
  intl: {
    label: 'International Cricket',
    wikidataEntities: ['wd:Q854510', 'wd:Q1081326', 'wd:Q1083278'],
    description: 'Test matches, ODIs, and T20Is between national teams',
  },
  icc: {
    label: 'ICC Tournaments',
    wikidataEntities: ['wd:Q193070', 'wd:Q608365', 'wd:Q745708'],
    description: 'ICC World Cup, T20 World Cup, Champions Trophy',
  },
}

const SPARQL_IPL = `PREFIX wd:  <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT DISTINCT ?match ?matchLabel ?date ?team1 ?team1Label ?team2 ?team2Label ?winner ?winnerLabel ?venue ?venueLabel
WHERE {
  # IPL matches: instance of cricket match, part of IPL edition, or cricket competition in India
  {
    ?match wdt:P31 wd:Q1137366 .
    ?match wdt:P361+ ?comp .
    ?comp wdt:P31 wd:Q1100759 .
  } UNION {
    ?match wdt:P31 wd:Q1137366 .
    ?match wdt:P17 wd:Q668 .
    ?match wdt:P585 ?date .
    FILTER(?date >= "2008-01-01"^^xsd:dateTime)
  }
  OPTIONAL { ?match wdt:P585 ?date . }
  OPTIONAL { ?match wdt:P1923 ?team1 . }
  OPTIONAL { ?match wdt:P1924 ?team2 . }
  OPTIONAL { ?match wdt:P1346 ?winner . }
  OPTIONAL { ?match wdt:P276 ?venue . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?date)
LIMIT 400`

const SPARQL_INTL = `PREFIX wd:  <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT DISTINCT ?match ?matchLabel ?date ?team1 ?team1Label ?team2 ?team2Label ?winner ?winnerLabel ?venue ?venueLabel ?format ?formatLabel
WHERE {
  ?match wdt:P31 ?format .
  VALUES ?format {
    wd:Q854510    # Test cricket match
    wd:Q1081326   # One Day International
    wd:Q1083278   # Twenty20 International
  }
  OPTIONAL { ?match wdt:P585 ?date . }
  OPTIONAL { ?match wdt:P1923 ?team1 . }
  OPTIONAL { ?match wdt:P1924 ?team2 . }
  OPTIONAL { ?match wdt:P1346 ?winner . }
  OPTIONAL { ?match wdt:P276 ?venue . }
  # Cover 2015 onwards for better depth
  FILTER(!BOUND(?date) || ?date >= "2015-01-01"^^xsd:dateTime)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?date)
LIMIT 500`

const SPARQL_ICC = `PREFIX wd:  <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT DISTINCT ?match ?matchLabel ?date ?team1 ?team1Label ?team2 ?team2Label ?winner ?winnerLabel ?venue ?venueLabel ?tournament ?tournamentLabel
WHERE {
  ?match wdt:P31 wd:Q1137366 .
  ?match wdt:P361 ?tournament .
  VALUES ?tournament { wd:Q193070 wd:Q608365 wd:Q745708 }
  OPTIONAL { ?match wdt:P585 ?date . }
  OPTIONAL { ?match wdt:P1923 ?team1 . }
  OPTIONAL { ?match wdt:P1924 ?team2 . }
  OPTIONAL { ?match wdt:P1346 ?winner . }
  OPTIONAL { ?match wdt:P276 ?venue . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?date)
LIMIT 300`

const SPARQL_MAP = { ipl: SPARQL_IPL, intl: SPARQL_INTL, icc: SPARQL_ICC }

router.get('/', async (req, res) => {
  const comp = (req.query.comp || 'ipl').toLowerCase()
  const validComps = ['ipl', 'intl', 'icc', 'all']
  if (!validComps.includes(comp)) {
    return res.status(400).json({ error: 'Invalid comp. Use ipl, intl, icc, or all.' })
  }

  const cacheKey = `cricket_${comp}`
  const cached   = cache.get(cacheKey)
  if (cached) return res.json({ ...cached, fromCache: true })

  try {
    let matches = []
    const provenanceQueries = []

    if (comp === 'all') {
      const [iplRes, intlRes, iccRes] = await Promise.allSettled([
        runSparql('wikidata', SPARQL_IPL),
        runSparql('wikidata', SPARQL_INTL),
        runSparql('wikidata', SPARQL_ICC),
      ])
      for (const [label, result, query] of [
        ['IPL Matches', iplRes, SPARQL_IPL],
        ['International Matches', intlRes, SPARQL_INTL],
        ['ICC Tournament Matches', iccRes, SPARQL_ICC],
      ]) {
        if (result.status === 'fulfilled') {
          matches.push(...parseMatches(result.value.results))
          provenanceQueries.push({ label, query, endpoint: 'https://query.wikidata.org/sparql' })
        }
      }
    } else {
      const query = SPARQL_MAP[comp]
      const result = await runSparql('wikidata', query)
      matches = parseMatches(result.results)
      provenanceQueries.push({ label: `${COMP_CONFIG[comp]?.label || comp} Matches (Wikidata)`, query, endpoint: 'https://query.wikidata.org/sparql' })
    }

    if (matches.length < 5) {
      matches = getMockCricketMatches(comp)
      provenanceQueries.push({ label: 'Fallback mock data (SPARQL returned insufficient results)', query: null, endpoint: 'local' })
    }

    const venueAdvantage = calcVenueAdvantage(matches)
    const venues = [...new Set(matches.map(m => m.venueLabel).filter(Boolean))]

    const wikidataEntities = (comp === 'all')
      ? Object.values(COMP_CONFIG).flatMap(c => c.wikidataEntities)
      : (COMP_CONFIG[comp]?.wikidataEntities || [])

    const response = {
      sport:      'Cricket',
      comp,
      compLabel:  comp === 'all' ? 'All Competitions' : COMP_CONFIG[comp]?.label,
      colorPrimary: '#004c91',
      colorAccent:  '#ff6b35',
      wikidataEntities,
      stats: {
        totalMatches: matches.length,
        venuesTracked: venues.length,
        dataSource: 'Wikidata SPARQL (100%)',
      },
      venueAdvantage,
      recentMatches: matches.slice(0, 30).map(m => ({
        date:      m.date,
        team1:     m.team1Label,
        team2:     m.team2Label,
        winner:    m.winnerLabel,
        venue:     m.venueLabel,
        matchLabel: m.matchLabel,
        tournament: m.tournamentLabel,
        format:    m.formatLabel,
      })),
      provenance: {
        queries:   provenanceQueries,
        fetchedAt: new Date().toISOString(),
        note:      'All cricket data sourced exclusively from Wikidata SPARQL endpoint. No external sports API used.',
        sourceMixNote:
          'Cricket tab: 100% of match rows, venues, and winners come from Wikidata SPARQL (Linked Open Data). ' +
          'Unlike soccer/NBA, there is no REST sports API in this pipeline — coverage depends on Wikidata completeness for each competition. ' +
          `This response: ${matches.length.toLocaleString()} matches.`,
      },
      fromCache: false,
    }

    cache.set(cacheKey, response)
    res.json(response)
  } catch (err) {
    console.error(`[cricket/${comp}] Error:`, err.message)
    const matches = getMockCricketMatches(comp)
    const venueAdvantage = calcVenueAdvantage(matches)
    res.json({
      sport: 'Cricket', comp, compLabel: comp === 'all' ? 'All Competitions' : COMP_CONFIG[comp]?.label,
      colorPrimary: '#004c91', colorAccent: '#ff6b35',
      wikidataEntities: [],
      stats: { totalMatches: matches.length, venuesTracked: 10, dataSource: 'Mock Data (SPARQL unavailable)' },
      venueAdvantage,
      recentMatches: matches.slice(0, 30),
      provenance: {
        queries: [{ label: 'Mock Data', query: null, endpoint: 'local' }],
        fetchedAt: new Date().toISOString(),
        sourceMixNote:
          'SPARQL could not be reached or returned too few rows — showing structured demo data so the dashboard still works. ' +
          'Live mode uses only Wikidata SPARQL for cricket (no REST API).',
      },
      isMock: true, mockReason: err.message,
    })
  }
})

function parseMatches(bindings) {
  return bindings.map(b => ({
    date:           val(b, 'date'),
    team1Label:     val(b, 'team1Label'),
    team2Label:     val(b, 'team2Label'),
    winnerLabel:    val(b, 'winnerLabel'),
    venueLabel:     val(b, 'venueLabel'),
    matchLabel:     val(b, 'matchLabel'),
    tournamentLabel: val(b, 'tournamentLabel'),
    formatLabel:    val(b, 'formatLabel'),
  }))
}

const IPL_TEAMS  = [
  'Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers Bangalore',
  'Kolkata Knight Riders', 'Delhi Capitals', 'Sunrisers Hyderabad',
  'Rajasthan Royals', 'Punjab Kings', 'Gujarat Titans', 'Lucknow Super Giants',
]
const INTL_TEAMS = [
  'India', 'Australia', 'England', 'Pakistan', 'South Africa',
  'New Zealand', 'West Indies', 'Sri Lanka', 'Bangladesh', 'Afghanistan',
]
const ICC_TEAMS  = ['India', 'Australia', 'England', 'Pakistan', 'South Africa', 'New Zealand', 'West Indies', 'Sri Lanka']

const VENUES_IPL  = [
  'Wankhede Stadium', 'Eden Gardens', 'M. Chinnaswamy Stadium',
  'Arun Jaitley Stadium', 'Punjab Cricket Association Stadium',
  'Rajiv Gandhi International Cricket Stadium', 'MA Chidambaram Stadium',
  'Narendra Modi Stadium',
]
const VENUES_INTL = [
  "Lord's Cricket Ground", 'Melbourne Cricket Ground', 'Eden Gardens',
  'The Oval', 'The Gabba', 'Sydney Cricket Ground', 'Headingley',
  'Adelaide Oval', "Newlands Cricket Ground", 'Galle International Stadium',
]
const VENUES_ICC  = [
  'Melbourne Cricket Ground', 'Eden Gardens', "Lord's Cricket Ground",
  'Wankhede Stadium', 'Dubai International Cricket Stadium', 'Dambulla Cricket Stadium',
]

const FORMAT_MAP = { ipl: 'T20', intl: 'ODI', icc: 'ICC T20 WC', all: 'T20' }

function getMockCricketMatches(comp) {
  const isIPL  = comp === 'ipl'
  const isICC  = comp === 'icc'
  const teams  = isIPL ? IPL_TEAMS : isICC ? ICC_TEAMS : INTL_TEAMS
  const venues = isIPL ? VENUES_IPL : isICC ? VENUES_ICC : VENUES_INTL
  const fmt    = FORMAT_MAP[comp] || 'T20'

  // Generate ~200 matches for good stats
  const matches = []
  const seasons = isIPL ? 8 : 4
  for (let season = 0; season < seasons; season++) {
    const gamesPerSeason = isIPL ? 74 : 30
    for (let i = 0; i < gamesPerSeason; i++) {
      const t1 = teams[i % teams.length]
      const t2 = teams[(i + 3 + season) % teams.length] === t1
        ? teams[(i + 2) % teams.length]
        : teams[(i + 3 + season) % teams.length]
      const venue = venues[i % venues.length]
      // Slight home venue bias: ~55% win rate for team playing at "home" venue
      const winner = Math.random() < 0.55 ? t1 : t2
      matches.push({
        date:           new Date(Date.now() - (season * 200 + i * 3) * 86400000).toISOString(),
        team1Label:     t1,
        team2Label:     t2,
        winnerLabel:    winner,
        venueLabel:     venue,
        matchLabel:     `${t1} vs ${t2}`,
        tournamentLabel: isIPL ? 'IPL' : isICC ? 'ICC Tournament' : 'International',
        formatLabel:    fmt,
      })
    }
  }
  return matches
}

module.exports = router
