/**
 * lib/sparql.js
 * Generic SPARQL runner — sends queries to Wikidata or DBpedia endpoints
 * and returns parsed JSON results.
 */

const fetch = require('node-fetch')

const ENDPOINTS = {
  wikidata: 'https://query.wikidata.org/sparql',
  dbpedia:  'https://dbpedia.org/sparql',
}

const USER_AGENT = 'SemanticSportsAnalyticsV2/2.0 (university project; contact: student@uidaho.edu)'

/**
 * Run a SPARQL SELECT query against a public endpoint.
 *
 * @param {string} endpointKey  - 'wikidata' | 'dbpedia' | full URL string
 * @param {string} query        - SPARQL query string
 * @param {number} [timeoutMs]  - request timeout in ms (default 15000)
 * @returns {Promise<{ results: object, meta: object }>}
 */
async function runSparql(endpointKey, query, timeoutMs = 15000) {
  const url = ENDPOINTS[endpointKey] || endpointKey

  const params = new URLSearchParams({ query, format: 'json' })
  const fullUrl = `${url}?${params.toString()}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(fullUrl, {
      headers: {
        Accept: 'application/sparql-results+json',
        'User-Agent': USER_AGENT,
      },
      signal: controller.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      throw new Error(`SPARQL endpoint returned HTTP ${res.status}: ${res.statusText}`)
    }

    const json = await res.json()

    return {
      results: json.results?.bindings || [],
      meta: {
        endpoint: url,
        fetchedAt: new Date().toISOString(),
        rowCount: json.results?.bindings?.length || 0,
        query,
      },
    }
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      throw new Error(`SPARQL query timed out after ${timeoutMs}ms (endpoint: ${url})`)
    }
    throw err
  }
}

/**
 * Extract a plain string value from a SPARQL result binding cell.
 */
function val(binding, key) {
  return binding?.[key]?.value ?? null
}

/**
 * Extract numeric value from a SPARQL result binding cell.
 */
function numVal(binding, key) {
  const v = binding?.[key]?.value
  return v !== undefined && v !== null ? Number(v) : null
}

module.exports = { runSparql, val, numVal, ENDPOINTS }
