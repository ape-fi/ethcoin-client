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
            <div key={entry.blockNumber} className={`history-entry ${entry.won ? 'won' : ''} ${entry.won === null ? 'pending' : ''}`}>
              <span className="block">#{entry.blockNumber}</span>
              <span className="tickets">Power: {entry.mineCount}{entry.totalCount > 0 ? `/${entry.totalCount}` : ''}</span>
              <span className={`result ${entry.won === null ? 'pending' : entry.won ? 'won' : 'lost'}`}>
                {entry.won === null ? 'Pending' : entry.won ? 'Won' : 'Not selected'}
              </span>
              <span className="time">{new Date(entry.timestamp * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {new Date(entry.timestamp * 1000).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
