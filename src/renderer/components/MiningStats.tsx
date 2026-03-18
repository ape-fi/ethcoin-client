import { useState, useEffect } from 'react'
import type { MiningStats as MiningStatsType, MiningHistoryEntry } from '../../shared/types'

interface Props {
  history: MiningHistoryEntry[]
}

export default function MiningStats({ history }: Props) {
  const [stats, setStats] = useState<MiningStatsType | null>(null)

  useEffect(() => {
    window.ethcoinAPI.getMiningStats().then(setStats).catch(() => {})
  }, [history])

  if (!stats || stats.blocksMined === 0) {
    return (
      <div className="panel mining-stats">
        <h2>Mining Stats</h2>
        <p className="empty">No mining data yet</p>
      </div>
    )
  }

  return (
    <div className="panel mining-stats">
      <h2>Mining Stats</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card-value">{stats.blocksMined}</span>
          <span className="stat-card-label">Blocks</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{stats.wins}</span>
          <span className="stat-card-label">Wins</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value earned">{parseFloat(stats.ethcMined).toLocaleString()}</span>
          <span className="stat-card-label">ETHC Mined</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-value">{stats.totalPower}</span>
          <span className="stat-card-label">Total Power</span>
        </div>
      </div>
    </div>
  )
}
