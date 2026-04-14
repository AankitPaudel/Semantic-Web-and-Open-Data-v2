function ZoneDot({ position, total }) {
  if (position <= 4) return <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: '#3b82f6' }} />
  if (position === 5) return <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: '#f97316' }} />
  if (position >= total - 2) return <span className="w-1 h-4 rounded-full flex-shrink-0" style={{ background: '#f87171' }} />
  return <span className="w-1 h-4 rounded-full flex-shrink-0 bg-transparent" />
}

export default function StandingsTable({ standings, tab }) {
  if (!standings?.length) {
    return <p className="text-gray-600 text-[13px]">No standings data available.</p>
  }

  const total = standings.length

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-[12px] min-w-[620px]">
        <thead>
          <tr>
            <th className="pb-3 pl-2 pr-4 text-left">
              <span className="section-title">#</span>
            </th>
            <th className="pb-3 text-left">
              <span className="section-title">Club</span>
            </th>
            {['MP','W','D','L','GF','GA','GD','Pts'].map(h => (
              <th key={h} className="pb-3 text-center">
                <span className="section-title">{h}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {standings.map((row, i) => {
            const isTop4    = row.position <= 4
            const isRelegation = row.position >= total - 2

            return (
              <tr
                key={row.team}
                className="group hover:bg-white/[0.025] transition-colors duration-100"
              >
                <td className="py-2.5 pl-2 pr-3">
                  <div className="flex items-center gap-2">
                    <ZoneDot position={row.position} total={total} />
                    <span className="text-gray-500 tabular-nums w-4">{row.position}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-6">
                  <span className={`font-semibold ${isTop4 ? 'text-white' : 'text-gray-300'}`}>
                    {row.team}
                  </span>
                </td>
                <td className="py-2.5 text-center text-gray-400 tabular-nums">{row.played}</td>
                <td className="py-2.5 text-center font-semibold text-green-400 tabular-nums">{row.won}</td>
                <td className="py-2.5 text-center text-gray-500 tabular-nums">{row.drawn}</td>
                <td className="py-2.5 text-center text-red-400 tabular-nums">{row.lost}</td>
                <td className="py-2.5 text-center text-gray-400 tabular-nums">{row.gf}</td>
                <td className="py-2.5 text-center text-gray-400 tabular-nums">{row.ga}</td>
                <td className={`py-2.5 text-center font-medium tabular-nums ${row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                  {row.gd > 0 ? `+${row.gd}` : row.gd}
                </td>
                <td className="py-2.5 text-center">
                  <span
                    className="font-black text-[14px] tabular-nums"
                    style={{ color: isTop4 ? tab.accent : isRelegation ? '#f87171' : '#e2e8f0' }}
                  >
                    {row.points}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Zone legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white/[0.04] text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Champions League</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> Europa League</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Relegation</span>
      </div>
    </div>
  )
}
