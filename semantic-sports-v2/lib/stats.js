/**
 * lib/stats.js
 * Pure statistics engine — no external libraries.
 * All functions implemented from scratch using standard formulas.
 */

/**
 * calcLeagueStats
 * Compute overall league-level home/away/draw percentages.
 *
 * @param {Array<{homeGoals: number, awayGoals: number}>} matches
 * @returns {{ homeWinPct, awayWinPct, drawPct, total, homeWins, awayWins, draws }}
 */
function calcLeagueStats(matches) {
  let homeWins = 0, awayWins = 0, draws = 0

  for (const m of matches) {
    const hg = Number(m.homeGoals ?? m.home_score ?? 0)
    const ag = Number(m.awayGoals ?? m.away_score ?? 0)
    if (hg > ag) homeWins++
    else if (ag > hg) awayWins++
    else draws++
  }

  const total = homeWins + awayWins + draws
  if (total === 0) return { homeWinPct: 0, awayWinPct: 0, drawPct: 0, total: 0, homeWins: 0, awayWins: 0, draws: 0 }

  return {
    homeWinPct: round2((homeWins / total) * 100),
    awayWinPct: round2((awayWins / total) * 100),
    drawPct:    round2((draws    / total) * 100),
    total,
    homeWins,
    awayWins,
    draws,
  }
}

/**
 * calcHomeAdvantage
 * Per-team home advantage scores.
 *
 * @param {Array<{homeTeamLabel: string, awayTeamLabel: string, homeGoals: number, awayGoals: number}>} matches
 * @returns {Array<{ team, homeWinPct, awayWinPct, advantage, homePlayed, awayPlayed }>}
 */
function calcHomeAdvantage(matches) {
  const teams = {}

  for (const m of matches) {
    const home = m.homeTeamLabel || m.homeTeam || m.home_team
    const away = m.awayTeamLabel || m.awayTeam || m.away_team
    const hg   = Number(m.homeGoals ?? m.home_score ?? 0)
    const ag   = Number(m.awayGoals ?? m.away_score ?? 0)

    if (!home || !away) continue

    if (!teams[home]) teams[home] = { homeWins: 0, homePlayed: 0, awayWins: 0, awayPlayed: 0 }
    if (!teams[away]) teams[away] = { homeWins: 0, homePlayed: 0, awayWins: 0, awayPlayed: 0 }

    teams[home].homePlayed++
    teams[away].awayPlayed++

    if (hg > ag) {
      teams[home].homeWins++
    } else if (ag > hg) {
      teams[away].awayWins++
    }
  }

  // Lower threshold so current-season clubs still appear when the match sample is shorter;
  // soccer route merges with league standings so every club gets a row.
  const MIN_GAMES = 3
  return Object.entries(teams)
    .filter(([, t]) => t.homePlayed >= MIN_GAMES && t.awayPlayed >= MIN_GAMES)
    .map(([team, t]) => {
      const homeWinPct = round2((t.homeWins  / t.homePlayed) * 100)
      const awayWinPct = round2((t.awayWins  / t.awayPlayed) * 100)
      return {
        team,
        homeWinPct,
        awayWinPct,
        advantage:   round2(homeWinPct - awayWinPct),
        homePlayed:  t.homePlayed,
        awayPlayed:  t.awayPlayed,
        homeWins:    t.homeWins,
        awayWins:    t.awayWins,
      }
    })
    .sort((a, b) => b.advantage - a.advantage)
}

/**
 * predictWinner
 * Win probability prediction based on each team's historical home/away records.
 * Formula: weighted average of home team's homeWinPct, away team's awayWinPct,
 *          draw probability derived from league draw rate.
 *
 * @param {string} homeTeam
 * @param {string} awayTeam
 * @param {Array}  teamStatsArr  - output of calcHomeAdvantage
 * @param {number} [leagueDrawPct] - league average draw rate (0–100)
 * @returns {{ home: number, draw: number, away: number }}
 */
function predictWinner(homeTeam, awayTeam, teamStatsArr, leagueDrawPct = 22) {
  const h = teamStatsArr.find(t => t.team === homeTeam)
  const a = teamStatsArr.find(t => t.team === awayTeam)

  const homeStr = h ? h.homeWinPct : 45
  const awayStr = a ? a.awayWinPct : 35
  const drawBase = leagueDrawPct

  const raw = homeStr + awayStr + drawBase
  if (raw === 0) return { home: 33, draw: 33, away: 34 }

  return {
    home: round2((homeStr / raw) * 100),
    draw: round2((drawBase / raw) * 100),
    away: round2((awayStr / raw) * 100),
  }
}

/**
 * chiSquareTest
 * Manual chi-square goodness-of-fit test against equal expected distribution.
 * Approximates p-value using chi-square CDF (Wilson–Hilferty approximation).
 *
 * @param {number} homeWins
 * @param {number} awayWins
 * @param {number} draws
 * @returns {{ chiSquare: number, pValue: number, significant: boolean, df: number }}
 */
function chiSquareTest(homeWins, awayWins, draws) {
  const total = homeWins + awayWins + draws
  if (total === 0) return { chiSquare: 0, pValue: 1, significant: false, df: 2 }

  const expected = total / 3
  const chi2 =
    Math.pow(homeWins - expected, 2) / expected +
    Math.pow(awayWins - expected, 2) / expected +
    Math.pow(draws    - expected, 2) / expected

  const df = 2
  const pValue = chiSquarePValue(chi2, df)

  return {
    chiSquare:   round2(chi2),
    pValue:      pValue < 0.000001 ? '<0.000001' : round6(pValue),
    significant: pValue < 0.05,
    df,
  }
}

/**
 * Approximate p-value for chi-square distribution using Wilson–Hilferty transformation.
 * Returns the right-tail probability P(X² > chi2) for given degrees of freedom.
 */
function chiSquarePValue(chi2, df) {
  if (chi2 <= 0) return 1
  // Use regularized incomplete gamma function approximation
  return 1 - gammaCDF(chi2 / 2, df / 2)
}

/**
 * Regularized lower incomplete gamma function P(a, x)
 * Approximated via series expansion for small x, continued fraction for large x.
 */
function gammaCDF(x, a) {
  if (x < 0) return 0
  if (x === 0) return 0
  if (x < a + 1) return gammaSeriesExpansion(x, a)
  return 1 - gammaContinuedFraction(x, a)
}

function gammaSeriesExpansion(x, a) {
  const MAX_ITER = 200
  const EPS = 1e-10
  let term = 1 / a
  let sum  = term
  for (let n = 1; n <= MAX_ITER; n++) {
    term *= x / (a + n)
    sum  += term
    if (Math.abs(term) < EPS * Math.abs(sum)) break
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a))
}

function gammaContinuedFraction(x, a) {
  const MAX_ITER = 200
  const EPS = 1e-10
  const FPMIN = 1e-300
  let b = x + 1 - a
  let c = 1 / FPMIN
  let d = 1 / b
  let h = d
  for (let i = 1; i <= MAX_ITER; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < EPS) break
  }
  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h
}

/**
 * log-Gamma using Lanczos approximation.
 */
function logGamma(z) {
  const g = 7
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ]
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  }
  z -= 1
  let x = c[0]
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i)
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

/**
 * calcVenueAdvantage  (cricket)
 * Computes per-venue dominance metrics.
 *
 * @param {Array<{venue: string, team1: string, team2: string, winner: string}>} matches
 * @returns {Array<{ venue, matches, homeTeamWins, dominantTeam, dominanceScore }>}
 */
function calcVenueAdvantage(matches) {
  const venues = {}

  for (const m of matches) {
    const venue  = m.venueLabel || m.venue
    const winner = m.winnerLabel || m.winner
    const t1     = m.team1Label || m.homeTeam
    const t2     = m.team2Label || m.awayTeam

    if (!venue) continue

    if (!venues[venue]) venues[venue] = { total: 0, winners: {} }
    venues[venue].total++
    if (winner) {
      venues[venue].winners[winner] = (venues[venue].winners[winner] || 0) + 1
    }
  }

  return Object.entries(venues)
    .filter(([, v]) => v.total >= 3)
    .map(([venue, v]) => {
      const sorted = Object.entries(v.winners).sort((a, b) => b[1] - a[1])
      const dominant = sorted[0]
      return {
        venue,
        matches: v.total,
        homeTeamWins:   dominant ? dominant[1] : 0,
        dominantTeam:  dominant ? dominant[0] : 'N/A',
        dominanceScore: dominant ? round2((dominant[1] / v.total) * 100) : 0,
      }
    })
    .sort((a, b) => b.dominanceScore - a.dominanceScore)
    .slice(0, 15)
}

function round2(n)  { return Math.round(n * 100) / 100 }
function round6(n)  { return Math.round(n * 1_000_000) / 1_000_000 }

module.exports = {
  calcLeagueStats,
  calcHomeAdvantage,
  predictWinner,
  chiSquareTest,
  calcVenueAdvantage,
}
