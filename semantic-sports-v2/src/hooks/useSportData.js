/**
 * hooks/useSportData.js
 * Universal data fetching hook with loading, error, and stale-while-revalidate states.
 */

import { useState, useEffect, useCallback, useRef } from 'react'

const BASE_URL = '/api'

const ENDPOINTS = {
  PL:      `${BASE_URL}/soccer?league=PL`,
  PD:      `${BASE_URL}/soccer?league=PD`,
  NBA:     `${BASE_URL}/nba`,
  cricket: (comp) => `${BASE_URL}/cricket?comp=${comp}`,
}

/**
 * @param {'PL'|'PD'|'NBA'|'cricket'} sport
 * @param {string} [cricketComp='ipl'] - only used when sport === 'cricket'
 */
export function useSportData(sport, cricketComp = 'ipl') {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const abortRef = useRef(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const url = sport === 'cricket'
      ? ENDPOINTS.cricket(cricketComp)
      : ENDPOINTS[sport]

    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message)
        setData(getFallback(sport, cricketComp))
      }
    } finally {
      setLoading(false)
    }
  }, [sport, cricketComp])

  useEffect(() => {
    fetchData()
    return () => { abortRef.current?.abort() }
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// ── Minimal client-side fallback so the UI always renders ──────────────────
function getFallback(sport, cricketComp) {
  if (sport === 'PL' || sport === 'PD') {
    const isLaLiga = sport === 'PD'
    const teams = isLaLiga
      ? ['Real Madrid', 'Barcelona', 'Atletico Madrid', 'Sevilla', 'Valencia', 'Villarreal', 'Real Betis', 'Athletic Club']
      : ['Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Man United', 'Spurs', 'Newcastle', 'Aston Villa']
    return {
      league: isLaLiga ? 'La Liga' : 'Premier League',
      leagueCode: sport,
      country: isLaLiga ? 'Spain' : 'England',
      wikidataURI: isLaLiga ? 'https://www.wikidata.org/entity/Q7238' : 'https://www.wikidata.org/entity/Q9448',
      wikidataEntity: isLaLiga ? 'wd:Q7238' : 'wd:Q9448',
      colorPrimary: isLaLiga ? '#c8102e' : '#38003c',
      colorAccent:  isLaLiga ? '#f5a623' : '#00ff85',
      leagueStats:  { homeWinPct: 43.82, awayWinPct: 33.82, drawPct: 22.37, total: 1520, homeWins: 666, awayWins: 514, draws: 340 },
      chiSquare:    { chiSquare: 105.04, pValue: '<0.000001', significant: true, df: 2 },
      teamAdvantage: teams.map((team, i) => ({
        team,
        homeWinPct:  60 - i * 3,
        awayWinPct:  45 - i * 2,
        advantage:   15 - i * 1.5,
        homePlayed:  19,
        awayPlayed:  19,
      })),
      standings: teams.map((team, i) => ({ position: i + 1, team, played: 30, won: 20 - i * 2, drawn: 5, lost: i * 2, gf: 60 - i * 5, ga: 20 + i * 4, gd: 40 - i * 9, points: 65 - i * 7 })),
      fixtures: [
        { id: 1, date: new Date(Date.now() + 86400000 * 3).toISOString(), homeTeam: teams[0], awayTeam: teams[1], matchday: 31, prediction: { home: 52, draw: 22, away: 26 } },
        { id: 2, date: new Date(Date.now() + 86400000 * 4).toISOString(), homeTeam: teams[2], awayTeam: teams[3], matchday: 31, prediction: { home: 44, draw: 24, away: 32 } },
        { id: 3, date: new Date(Date.now() + 86400000 * 7).toISOString(), homeTeam: teams[4], awayTeam: teams[5], matchday: 32, prediction: { home: 38, draw: 26, away: 36 } },
      ],
      predictions: [],
      matchCount: 1520,
      teamMeta: {},
      provenance: {
        queries: [{ label: 'Client-side fallback data', query: null, endpoint: 'local' }],
        fetchedAt: new Date().toISOString(),
        sourceMixNote:
          'Offline fallback: static numbers for demo. Live app: football-data.org = primary match grid when API key is set; Wikidata/DBpedia = enrichment or fallback.',
      },
      isMock: true,
    }
  }

  if (sport === 'NBA') {
    const teams = ['Los Angeles Lakers', 'Boston Celtics', 'Golden State Warriors', 'Miami Heat', 'Milwaukee Bucks', 'Phoenix Suns']
    return {
      sport: 'NBA',
      wikidataURI: 'https://www.wikidata.org/entity/Q155223',
      wikidataEntity: 'wd:Q155223',
      colorPrimary: '#1d428a', colorAccent: '#ffc72c',
      leagueStats: { homeWinPct: 59.4, awayWinPct: 40.6, drawPct: 0, total: 1230, homeWins: 731, awayWins: 499, draws: 0 },
      chiSquare: { chiSquare: 88.3, pValue: '<0.000001', significant: true, df: 2 },
      teamAdvantage: teams.map((team, i) => ({ team, homeWinPct: 65 - i * 3, awayWinPct: 50 - i * 2, advantage: 15 - i, homePlayed: 41, awayPlayed: 41 })),
      teamMeta: {},
      upcoming: [
        { id: 1, date: new Date(Date.now() + 86400000 * 2).toISOString(), homeTeam: teams[0], awayTeam: teams[1] },
        { id: 2, date: new Date(Date.now() + 86400000 * 3).toISOString(), homeTeam: teams[2], awayTeam: teams[3] },
      ],
      predictions: [],
      gameCount: 1230,
      provenance: {
        queries: [{ label: 'Client-side fallback data', query: null, endpoint: 'local' }],
        fetchedAt: new Date().toISOString(),
        sourceMixNote:
          'Offline fallback: static demo. Live: balldontlie.io = scores & game counts; Wikidata = team metadata & URIs only.',
      },
      isMock: true,
    }
  }

  // cricket fallback
  const venues = ['Wankhede Stadium', 'Eden Gardens', "Lord's", 'MCG', 'Oval']
  return {
    sport: 'Cricket', comp: cricketComp, compLabel: cricketComp.toUpperCase(),
    colorPrimary: '#004c91', colorAccent: '#ff6b35',
    wikidataEntities: ['wd:Q1100759'],
    stats: { totalMatches: 80, venuesTracked: 5, dataSource: 'Client-side fallback' },
    venueAdvantage: venues.map((venue, i) => ({ venue, matches: 20 - i, homeTeamWins: 12 - i, dominantTeam: 'India', dominanceScore: 65 - i * 5 })),
    recentMatches: Array.from({ length: 10 }, (_, i) => ({
      date: new Date(Date.now() - i * 86400000 * 7).toISOString(),
      team1: ['India', 'Australia', 'England'][i % 3],
      team2: ['Pakistan', 'New Zealand', 'South Africa'][i % 3],
      winner: ['India', 'Australia', 'England'][i % 3],
      venue: venues[i % venues.length],
    })),
    provenance: {
      queries: [{ label: 'Client-side fallback data', query: null, endpoint: 'local' }],
      fetchedAt: new Date().toISOString(),
      sourceMixNote:
        'Offline fallback. Live cricket tab: 100% Wikidata SPARQL — no REST sports API in this pipeline.',
    },
    isMock: true,
  }
}
