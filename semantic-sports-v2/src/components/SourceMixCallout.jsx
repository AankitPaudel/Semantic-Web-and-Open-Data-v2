/**
 * Always-visible explanation of REST vs SPARQL vs enrichment (recruiter / examiner clarity).
 */
export default function SourceMixCallout({ text, tab, title = 'How data sources combine' }) {
  if (!text) return null

  return (
    <div
      className="rounded-xl px-5 py-4 border border-white/[0.08] bg-[#12151c]"
      style={{ borderLeftWidth: 4, borderLeftColor: tab.accent }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500 mb-2">
        {title}
      </p>
      <p className="text-[13px] text-gray-300 leading-relaxed">
        {text}
      </p>
    </div>
  )
}
