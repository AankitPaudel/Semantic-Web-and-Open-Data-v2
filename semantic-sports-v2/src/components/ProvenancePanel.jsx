import { useState } from 'react'

function fmtTs(ts) {
  if (!ts) return '—'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(ts))
  } catch { return ts }
}

export default function ProvenancePanel({ provenance, tab }) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)

  if (!provenance) return null

  const queries     = provenance.queries || []
  const activeQuery = queries[activeIdx]

  return (
    <div className="card overflow-hidden">

      {/* Toggle header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
            style={{ background: `${tab.accent}15`, color: tab.accent }}
          >
            🔍
          </div>
          <div>
            <p className="text-[13px] font-semibold text-white">Data Provenance</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {queries.length} source{queries.length !== 1 ? 's' : ''} ·
              Last fetched {fmtTs(provenance.fetchedAt)}
            </p>
          </div>
        </div>
        <span className="text-gray-600 text-[11px] font-medium mr-1">
          {open ? '▲ Collapse' : '▼ View SPARQL queries'}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/[0.06] p-5 space-y-5">

          {/* Source chips */}
          <div className="flex flex-wrap gap-2">
            {queries.map((q, i) => (
              <button
                key={i}
                onClick={() => q.query && setActiveIdx(i)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all duration-150"
                style={activeIdx === i && q.query ? {
                  background: `${tab.accent}12`,
                  borderColor: `${tab.accent}40`,
                  color: tab.accent,
                } : {
                  background: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.06)',
                  color: '#6b7280',
                  cursor: q.query ? 'pointer' : 'default',
                }}
              >
                {q.query ? '📡' : '🔧'}
                <span className="truncate max-w-[200px]">{q.label}</span>
              </button>
            ))}
          </div>

          {/* SPARQL query block */}
          {activeQuery?.query && (
            <div className="space-y-2">
              {/* Endpoint row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px]">
                  <span className="text-gray-500">Endpoint:</span>
                  <a
                    href={activeQuery.endpoint}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono hover:underline transition-colors"
                    style={{ color: tab.accent }}
                  >
                    {activeQuery.endpoint}
                  </a>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(activeQuery.query)}
                  className="btn bg-white/5 hover:bg-white/8 text-gray-400 hover:text-white text-[11px]"
                >
                  Copy
                </button>
              </div>

              {/* Query code block */}
              <div className="bg-[#0a0c10] border border-white/[0.06] rounded-xl overflow-hidden">
                {/* Code toolbar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.05] bg-white/[0.02]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <span className="text-[11px] text-gray-600 font-mono ml-2">SPARQL 1.1</span>
                  </div>
                  <a
                    href={`https://query.wikidata.org/#${encodeURIComponent(activeQuery.query)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] flex items-center gap-1 hover:underline transition-colors"
                    style={{ color: tab.accent }}
                  >
                    Run live ↗
                  </a>
                </div>

                {/* Query text */}
                <pre className="text-[11px] font-mono text-green-300/90 p-4 overflow-x-auto leading-relaxed whitespace-pre">
                  {activeQuery.query}
                </pre>
              </div>
            </div>
          )}

          {/* No SPARQL available */}
          {!activeQuery?.query && (
            <div className="text-[12px] text-gray-600 italic">
              No SPARQL query for this source — data fetched via REST API.
            </div>
          )}

          {provenance.note && (
            <p className="text-[11px] text-gray-600 pt-2 border-t border-white/[0.05] italic">
              {provenance.note}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
