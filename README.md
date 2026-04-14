# Semantic Web & Open Data — Home Advantage & Sports Analytics

[![Course](https://img.shields.io/badge/Course-CS4625%2F5625-Semantic%20Web-0366d6)](https://www.uidaho.edu/)
[![Python](https://img.shields.io/badge/Python-3.8+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Node](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

**University of Idaho · CS4625/5625 — Semantic Web & Ontology**

This repository brings together a **Premier League home-advantage research pipeline** (Python, SPARQL, statistics) and a **live multi-sport analytics dashboard** (React, Node, Wikidata/DBpedia). Together they show how **Linked Data**, **SPARQL**, and **open APIs** can support reproducible sports analytics—from batch research to an interactive UI.

---

## What this project is

### 1. Premier League home advantage (Python)

We ask whether English Premier League clubs show a **measurable home advantage** over **2020–2024**, using:

- **DBpedia** — team metadata (e.g. stadiums, founding dates) via SPARQL  
- **Wikidata** — structured match entities where coverage allows  
- **Hybrid fallback** — official-style CSVs (e.g. football-data.co.uk) when SPARQL match coverage is thin, keeping the pipeline honest and complete  
- **Statistics** — chi-square and paired tests, team-level home vs away performance  
- **Figures** — publication-style charts (`overall_advantage.png`, `team_variance.png`)

Scripts live at the **repository root** and under **`analysis/`**; CSV outputs go under **`data/`**.

### 2. Semantic Sports Analytics V2 (web app)

The **`semantic-sports-v2/`** folder is a **React + Vite** front end and **Express** API that powers a **dashboard** for soccer (PL, La Liga), **NBA**, and **cricket**, combining **live REST APIs** with **Wikidata/DBpedia SPARQL** (cached, with provenance in the UI). See the [dashboard README](semantic-sports-v2/README.md) for architecture, endpoints, and deployment notes.

---

## Repository layout

```text
Semantic-Web-and-Open-Data-v2/
├── README.md                    ← You are here
├── requirements.txt             ← Python dependencies
├── collect_data.py              ← SPARQL + CSV pipeline → data/raw/
├── make_charts.py               ← Generates PNG charts (run from repo root)
├── overall_advantage.png        ← Example output figure
├── team_variance.png
├── queries/                     ← Reference SPARQL for PL work (.rq)
│   ├── query1_teams.rq
│   ├── query2_matches.rq
│   └── query3_teamstats.rq
├── data/
│   ├── raw/                     ← Teams, matches, stats (CSV + summaries)
│   └── processed/               ← Analysis outputs
├── analysis/
│   └── analyze_data.py          ← Statistical analysis → data/processed/
├── report/                      ← Report snippets (e.g. SPARQL exploration)
├── Plan/                        ← Planning notes (e.g. roadmap)
├── semantic-sports-v2/          ← Full-stack dashboard (npm)
└── Group_Report_Responsibilities.* / *.pptx   ← Course deliverables (local)
```

Paths above match the repo as shipped; if you reorganize folders, update script `Path` logic accordingly.

---

## Quick start — Python pipeline

**Requirements:** Python 3.8+

```bash
cd Semantic-Web-and-Open-Data-v2
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
```

**Run in order:**

| Step | Command | Purpose |
|------|---------|--------|
| 1 | `python collect_data.py` | Fetch/clean data → `data/raw/` |
| 2 | `python analysis/analyze_data.py` | Stats → `data/processed/` |
| 3 | `python make_charts.py` | Write `overall_advantage.png` & `team_variance.png` (run from repo root) |

---

## Quick start — dashboard (local)

```bash
cd semantic-sports-v2
npm install
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** — the Vite dev server proxies `/api` to the API (default **port 3001**). Details: [semantic-sports-v2/README.md](semantic-sports-v2/README.md).

---

## Key findings (Premier League study)

| Topic | Result (illustrative; re-run scripts for your data) |
|--------|------------------------------------------------------|
| Home vs away wins | Home ~**43.8%** vs away ~**33.8%** (draws ~**22.4%**) |
| Overall test | Chi-square **χ² ≈ 105**, **p < 0.000001** |
| Team spread | Strong positive advantage for some clubs; outliers (e.g. negative advantage) appear in the long tail |

Exact numbers depend on the CSVs produced by `collect_data.py`.

---

## Data sources & semantics

- **DBpedia** — `https://dbpedia.org/sparql`  
- **Wikidata Query Service** — `https://query.wikidata.org/`  
- **REST** — e.g. football-data.org, balldontlie.io (see dashboard README)  

Always respect endpoint **terms of use** and use a clear **User-Agent** for SPARQL (see `collect_data.py`).

---

## Documentation

- **`report/`** — Markdown sections for written report material  
- **`Group_Report_Responsibilities.pdf`** (and related `.docx`) — group responsibilities / report artifacts  
- **`semantic-sports-v2/README.md`** — deep dive on the web stack and SPARQL query files used by the app  

---

## License & academic use

Coursework for CS4625/5625 at the University of Idaho. Reuse for learning and citation with attribution; not legal/financial advice; sports data subject to third-party terms.

---

## Remote on GitHub

**https://github.com/AankitPaudel/Semantic-Web-and-Open-Data-v2**
