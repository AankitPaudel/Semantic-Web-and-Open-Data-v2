import { useState } from 'react'
import Dashboard from './components/Dashboard'

const TABS = [
  {
    id: 'PL',
    label: 'Premier League',
    short: 'PL',
    country: 'England',
    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    accent: '#00ff85',
    bg: '#38003c',
    wdEntity: 'wd:Q9448',
  },
  {
    id: 'PD',
    label: 'La Liga',
    short: 'LaLiga',
    country: 'Spain',
    flag: '🇪🇸',
    accent: '#f5a623',
    bg: '#c8102e',
    wdEntity: 'wd:Q7238',
  },
  {
    id: 'NBA',
    label: 'NBA',
    short: 'NBA',
    country: 'USA',
    flag: '🇺🇸',
    accent: '#ffc72c',
    bg: '#1d428a',
    wdEntity: 'wd:Q155223',
  },
  {
    id: 'cricket',
    label: 'Cricket',
    short: 'Cricket',
    country: 'Global',
    flag: '🌍',
    accent: '#ff6b35',
    bg: '#004c91',
    wdEntity: 'wd:Q1100759',
  },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('PL')
  const tab = TABS.find(t => t.id === activeTab)

  return (
    <div className="min-h-screen bg-[#0d0f14] flex flex-col">

      {/* ── Top nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-[#0d0f14]/95 backdrop-blur-xl border-b border-white/[0.06]">

        {/* Brand row */}
        <div className="max-w-[1280px] mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black"
              style={{ background: `linear-gradient(135deg, ${tab.bg}, ${tab.accent}40)`, color: tab.accent }}
            >
              S
            </div>
            <div>
              <span className="text-[15px] font-bold text-white tracking-tight">
                Semantic Sports
              </span>
              <span className="text-[15px] font-bold tracking-tight ml-1" style={{ color: tab.accent }}>
                Analytics
              </span>
            </div>
            <span className="hidden sm:block text-[10px] font-semibold text-gray-600 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-widest ml-1">
              V2
            </span>
          </div>

          {/* Right side: data source chips */}
          <div className="hidden md:flex items-center gap-2 text-[11px] text-gray-600">
            <span className="flex items-center gap-1 bg-white/4 px-2.5 py-1 rounded-full border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Wikidata SPARQL
            </span>
            <span className="flex items-center gap-1 bg-white/4 px-2.5 py-1 rounded-full border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              DBpedia
            </span>
            <span className="flex items-center gap-1 bg-white/4 px-2.5 py-1 rounded-full border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Live APIs
            </span>
          </div>
        </div>

        {/* Sport tabs row */}
        <div className="max-w-[1280px] mx-auto px-5">
          <div className="flex items-end gap-0.5 overflow-x-auto pb-0 scrollbar-none">
            {TABS.map(t => {
              const isActive = activeTab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="relative flex items-center gap-2 px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-all duration-200 border-b-2 focus:outline-none"
                  style={{
                    color:       isActive ? t.accent : '#6b7280',
                    borderColor: isActive ? t.accent : 'transparent',
                  }}
                >
                  <span className="text-base leading-none">{t.flag}</span>
                  <span>{t.label}</span>
                  {isActive && (
                    <span
                      className="absolute inset-0 opacity-[0.06] rounded-t-lg pointer-events-none"
                      style={{ background: t.accent }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── Page body ───────────────────────────────────────── */}
      <main className="flex-1 max-w-[1280px] mx-auto w-full px-5 py-7">
        <Dashboard activeTab={activeTab} tab={tab} />
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-6 mt-8">
        <div className="max-w-[1280px] mx-auto px-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[12px] text-gray-600">
          <div>
            <span className="text-gray-400 font-medium">Semantic Sports Analytics V2</span>
            {' · '}CS4625/5625 Semantic Web &amp; Ontology · University of Idaho
          </div>
          <div className="flex items-center gap-4">
            <a href="https://www.wikidata.org" target="_blank" rel="noreferrer" className="hover:text-gray-400 transition-colors">Wikidata (CC0)</a>
            <a href="https://dbpedia.org" target="_blank" rel="noreferrer" className="hover:text-gray-400 transition-colors">DBpedia (CC-BY-SA)</a>
            <a href="https://www.football-data.org" target="_blank" rel="noreferrer" className="hover:text-gray-400 transition-colors">football-data.org</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
