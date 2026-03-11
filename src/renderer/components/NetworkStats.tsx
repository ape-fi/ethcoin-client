import type { NetworkStats as NetworkStatsType } from '../../shared/types'

interface Props {
  stats: NetworkStatsType | null
}

export default function NetworkStats({ stats }: Props) {
  if (!stats) return <div className="panel network-stats"><h2>Network</h2><p>Loading...</p></div>

  const blocksToHalving = stats.nextHalvingBlock - stats.currentBlock

  return (
    <div className="panel network-stats">
      <h2>Network</h2>
      <div className="stats">
        <div className="stat">
          <span className="label">Mining Reward</span>
          <span className="value">{parseFloat(stats.miningReward).toFixed(0)} ETHC</span>
        </div>
        <div className="stat">
          <span className="label">Current Block</span>
          <span className="value">#{stats.currentBlock}</span>
        </div>
        <div className="stat">
          <span className="label">Mining Power in Block</span>
          <span className="value">{stats.totalTicketsInBlock}</span>
        </div>
        <div className="stat">
          <span className="label">Next Halving</span>
          <span className="value">{blocksToHalving} blocks</span>
        </div>
      </div>
    </div>
  )
}
