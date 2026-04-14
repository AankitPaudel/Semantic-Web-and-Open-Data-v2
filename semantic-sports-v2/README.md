# Semantic Sports Analytics V2

> Live multi-sport analytics dashboard powered by **SPARQL**, **Wikidata**, **DBpedia**, and real-time sports APIs — built as an extension of a CS Semantic Web & Ontology university project.

For the full repository (Premier League Python pipeline, data, and report materials), see the [**main README**](../README.md).

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![SPARQL](https://img.shields.io/badge/SPARQL-1.1-FF6B35?logo=data:image/svg+xml;base64,PHN2Zy8+)
![Wikidata](https://img.shields.io/badge/Wikidata-Linked_Data-006699?logo=wikidata&logoColor=white)
![DBpedia](https://img.shields.io/badge/DBpedia-Enrichment-FF6600)

---

## Key Findings

> **Premier League (1,520 matches · 2020–2024)**
> - 🏠 Home teams win **43.82%** vs 33.82% away (draw: 22.37%)
> - 📊 Chi-square: χ² = 105.04, **p < 0.000001** (statistically significant)
> - 🏆 Best home advantage: Tottenham +23.68%, Liverpool +19.74%
> - ⚠️ Most anomalous: Watford −10.53% (performs *worse* at home)

> **La Liga / NBA / Cricket** → computed live from SPARQL + API data on each load

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEMANTIC SPORTS ANALYTICS V2                 │
├─────────────────┬───────────────────┬───────────────────────────┤
│   FRONTEND      │    BACKEND API    │    DATA LAYER             │
│   React + Vite  │  Node.js/Express  │                           │
│   Tailwind CSS  │                   │  ┌─── Wikidata SPARQL ──┐ │
│                 │  /api/soccer      │  │  query.wikidata.org  │ │
│  ⚽ PL Tab      │  /api/nba        │  │  Match results        │ │
│  ⚽ La Liga Tab │  /api/cricket     │  │  Team metadata        │ │
│  🏀 NBA Tab     │                   │  │  ICC tournaments      │ │
│  🏏 Cricket Tab │  lib/sparql.js    │  └──────────────────────┘ │
│                 │  lib/stats.js     │                           │
│  Components:    │                   │  ┌─── DBpedia SPARQL ───┐ │
│  StatCards      │  In-memory cache  │  │  dbpedia.org/sparql  │ │
│  AdvantageChart │  (1-hour TTL)     │  │  Stadiums, cities    │ │
│  PredictionCards│                   │  │  Founding years      │ │
│  StandingsTable │                   │  └──────────────────────┘ │
│  CricketView    │                   │                           │
│  ProvenancePanel│                   │  ┌─── REST APIs ────────┐ │
│                 │                   │  │  football-data.org   │ │
│                 │                   │  │  balldontlie.io      │ │
│                 │                   │  └──────────────────────┘ │
└─────────────────┴───────────────────┴───────────────────────────┘
                          │
                    Vercel Deploy
              /api/* → Express serverless
              /*      → Vite static build
```

---

## Sports Coverage

| Sport | Competition | Live API | SPARQL Source | Wikidata Entity |
|-------|-------------|----------|---------------|-----------------|
| Soccer | Premier League | football-data.org | Wikidata + DBpedia | [wd:Q9448](https://www.wikidata.org/entity/Q9448) |
| Soccer | La Liga | football-data.org | Wikidata + DBpedia | [wd:Q7238](https://www.wikidata.org/entity/Q7238) |
| Basketball | NBA | balldontlie.io | Wikidata | [wd:Q155223](https://www.wikidata.org/entity/Q155223) |
| Cricket | IPL | **None — 100% SPARQL** | Wikidata | [wd:Q1100759](https://www.wikidata.org/entity/Q1100759) |
| Cricket | International | **None — 100% SPARQL** | Wikidata | Multiple |
| Cricket | ICC Tournaments | **None — 100% SPARQL** | Wikidata | [wd:Q193070](https://www.wikidata.org/entity/Q193070) |

---

## Semantic Web Foundation

This project demonstrates **Linked Data** principles throughout:

### SPARQL Endpoints Used

| Endpoint | URL | What We Query |
|----------|-----|---------------|
| Wikidata | `https://query.wikidata.org/sparql` | Match results, team metadata, venues, ICC tournaments |
| DBpedia  | `https://dbpedia.org/sparql` | Team stadiums, cities, founding dates |

### SPARQL Query Files (`/queries/`)

| File | Endpoint | Purpose |
|------|----------|---------|
| `query1_pl_teams.rq` | DBpedia | PL team metadata (stadium, city, founding year) |
| `query2_pl_matches.rq` | Wikidata | Recent PL match results (4 seasons) |
| `query3_laliga_teams.rq` | DBpedia | La Liga team metadata |
| `query4_laliga_matches.rq` | Wikidata | Recent La Liga match results |
| `query5_nba_teams.rq` | Wikidata | NBA teams, arenas, cities |
| `query6_ipl_matches.rq` | Wikidata | IPL match results and venues |
| `query7_intl_cricket.rq` | Wikidata | International cricket (Tests, ODIs, T20Is) |
| `query8_icc_events.rq` | Wikidata | ICC World Cup / T20 WC / Champions Trophy |

### Linked Data URIs in the UI

Every team and entity is traced back to its **Wikidata URI**. In the app:
- The league badge links to its Wikidata entity (e.g. `wd:Q9448` for PL)
- Hovering a team in the Advantage Chart shows its stadium, city, founding year from DBpedia
- Each team's Wikidata URI is displayed as a clickable link
- The **Data Provenance panel** (collapsible, bottom of each tab) shows:
  - The exact SPARQL query string used
  - The endpoint URL (Wikidata vs DBpedia)
  - A timestamp of when data was last fetched
  - A "Run live" link to execute the query directly in the browser

### Statistics Engine (`lib/stats.js`)

All statistics are computed **without external libraries**:

```
chiSquareTest(homeWins, awayWins, draws)
  → chi² test manually implemented with Wilson-Hilferty p-value approximation
  → Lanczos log-Gamma function for accuracy

calcHomeAdvantage(matches)
  → per-team: homeWinPct - awayWinPct

calcLeagueStats(matches)
  → overall home/away/draw rates

predictWinner(homeTeam, awayTeam, teamStats)
  → 3-way probability normalized from historical records

calcVenueAdvantage(matches)  [cricket]
  → venue-level dominance scoring
```

---

## Project Structure

```
semantic-sports-v2/
├── api/
│   ├── index.js                    ← Express server entry point
│   └── routes/
│       ├── soccer.js               ← PL + La Liga (?league=PL or PD)
│       ├── nba.js                  ← NBA
│       └── cricket.js              ← IPL / International / ICC (?comp=)
├── lib/
│   ├── sparql.js                   ← Generic SPARQL runner (fetch + parse)
│   └── stats.js                    ← Full stats engine (no external libs)
├── queries/
│   ├── query1_pl_teams.rq          ← DBpedia: PL team metadata
│   ├── query2_pl_matches.rq        ← Wikidata: PL match results
│   ├── query3_laliga_teams.rq      ← DBpedia: La Liga team metadata
│   ├── query4_laliga_matches.rq    ← Wikidata: La Liga match results
│   ├── query5_nba_teams.rq         ← Wikidata: NBA teams + arenas
│   ├── query6_ipl_matches.rq       ← Wikidata: IPL matches
│   ├── query7_intl_cricket.rq      ← Wikidata: International cricket
│   └── query8_icc_events.rq        ← Wikidata: ICC tournaments
├── src/
│   ├── App.jsx                     ← Tab navigation + header
│   ├── main.jsx
│   ├── index.css                   ← Tailwind + custom classes
│   ├── hooks/
│   │   └── useSportData.js         ← Universal data fetching hook
│   └── components/
│       ├── Dashboard.jsx           ← Routes to sport-specific views
│       ├── SportTab.jsx            ← Soccer + NBA layout
│       ├── StatCards.jsx           ← Metric cards (home%, chi-square, etc.)
│       ├── AdvantageChart.jsx      ← Horizontal bar chart with tooltips
│       ├── PredictionCards.jsx     ← Fixture prediction probability bars
│       ├── StandingsTable.jsx      ← League table (soccer)
│       ├── CricketView.jsx         ← Cricket-specific layout + filters
│       └── ProvenancePanel.jsx     ← Collapsible SPARQL provenance viewer
├── .env.example
├── vercel.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

---

## How to Run Locally

### 1. Clone and install

```bash
git clone <your-repo-url>
cd semantic-sports-v2
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env and add your football-data.org API key:
# FOOTBALL_DATA_KEY=your_key_here
```

Register free at [football-data.org](https://www.football-data.org/client/register)

> **No key needed for NBA** (balldontlie.io is keyless)
> **No key needed for Cricket** (100% Wikidata SPARQL)
> App falls back to realistic mock data if keys are missing — UI always renders.

### 3. Start both servers

```bash
npm run dev
```

This starts:
- Express API on `http://localhost:3001`
- Vite frontend on `http://localhost:5173`

### 4. Open the app

```
http://localhost:5173
```

---

## How to Deploy to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel

# Add your environment variable:
vercel env add FOOTBALL_DATA_KEY
```

### Option B: Vercel Dashboard

1. Push this repo to GitHub
2. Import the project at [vercel.com](https://vercel.com)
3. Add `FOOTBALL_DATA_KEY` in **Settings → Environment Variables**
4. Deploy — Vercel uses `vercel.json` to route `/api/*` to Express and `/*` to the Vite build

---

## Screenshots

> _[Add screenshots here]_
>
> Suggested:
> - Premier League dashboard with stat cards and home advantage chart
> - Data Provenance panel open showing live SPARQL query
> - Cricket competition filter dropdown
> - NBA prediction cards

---

## Academic Context

**Course:** CS4625/5625 — Semantic Web & Ontology  
**Institution:** University of Idaho  
**Date:** December 2024 → Extended April 2026  

This project extends the original Premier League home advantage analysis by:
1. Adding La Liga, NBA, and Cricket sports
2. Building a full live web application around the academic findings
3. Making the **Semantic Web layer visible to users** (not just in code)
4. Extending the stats engine to handle multiple sport types

**Original finding (preserved in this app):**  
Home teams in the Premier League win 43.82% of matches vs 33.82% away — a statistically significant 10-percentage-point advantage (χ² = 105.04, p < 0.000001).

---

## Data Licenses

| Source | License |
|--------|---------|
| Wikidata | CC0 (Public Domain) |
| DBpedia | CC BY-SA 3.0 |
| football-data.org | Free tier — attribution required |
| balldontlie.io | Free, no attribution required |
