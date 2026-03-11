import type { MiningHistoryEntry } from '../../shared/types'

interface Props {
  history: MiningHistoryEntry[]
}

export default function MiningHistory({ history }: Props) {
  return (
    <div className="panel mining-history">
      <h2>Mining History</h2>
      {history.length === 0 ? (
        <p className="empty">No mining activity yet</p>
      ) : (
        <div className="history-list">
          {history.map((entry) => (
            <div key={entry.txHash} className={`history-entry ${entry.won ? 'won' : ''}`}>
              <span className="block">#{entry.blockNumber}</span>
              <span className="tickets">{entry.mineCount} tickets</span>
              <span className={`result ${entry.won ? 'won' : 'lost'}`}>
                {entry.won ? `Won ${entry.reward} ETHC` : 'Not selected'}
              </span>
              <span className="time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
