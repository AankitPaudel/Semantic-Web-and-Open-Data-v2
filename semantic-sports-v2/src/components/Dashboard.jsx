import { useState } from 'react'
import { useSportData } from '../hooks/useSportData'
import SportTab from './SportTab'
import CricketView from './CricketView'

export default function Dashboard({ activeTab, tab }) {
  const [cricketComp, setCricketComp] = useState('ipl')

  const sport = (activeTab === 'PL' || activeTab === 'PD') ? activeTab
              : activeTab === 'NBA' ? 'NBA'
              : 'cricket'

  const { data, loading, error, refetch } = useSportData(sport, cricketComp)

  if (activeTab === 'cricket') {
    return (
      <CricketView
        data={data}
        loading={loading}
        error={error}
        refetch={refetch}
        comp={cricketComp}
        setComp={setCricketComp}
        tab={tab}
      />
    )
  }

  return (
    <SportTab
      data={data}
      loading={loading}
      error={error}
      refetch={refetch}
      sport={activeTab}
      tab={tab}
    />
  )
}
