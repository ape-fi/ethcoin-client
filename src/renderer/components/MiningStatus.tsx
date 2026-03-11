import { useState } from 'react'
import type { MiningStatus as MiningStatusType } from '../../shared/types'
import { MIN_MINE_COUNT, MAX_MINE_COUNT } from '../../shared/constants'

interface Props {
  status: MiningStatusType | null
  onStart: (mineCount: number) => void
  onStop: () => void
}

export default function MiningStatus({ status, onStart, onStop }: Props) {
  const [mineCount, setMineCount] = useState(1)
  const running = status?.running ?? false

  return (
    <div className="panel mining-status">
      <h2>Mining</h2>

      <div className="status-indicator">
        <span className={`dot ${running ? 'active' : 'inactive'}`} />
        <span>{running ? 'Mining' : 'Stopped'}</span>
      </div>

      {status && (
        <div className="stats">
          <div className="stat">
            <span className="label">Block</span>
            <span className="value">#{status.currentBlock}</span>
          </div>
          {status.pendingTx && (
            <div className="stat">
              <span className="label">Pending TX</span>
              <span className="value tx">{status.pendingTx.slice(0, 10)}...</span>
            </div>
          )}
          {status.lastResult && (
            <div className="stat">
              <span className="label">Last Result</span>
              <span className={`value ${status.lastResult.won ? 'won' : 'lost'}`}>
                {status.lastResult.won ? 'WON!' : 'Not selected'}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mine-count-control">
        <label>Tickets per block: {mineCount}</label>
        <input
          type="range"
          min={MIN_MINE_COUNT}
          max={MAX_MINE_COUNT}
          value={mineCount}
          onChange={(e) => setMineCount(Number(e.target.value))}
          disabled={running}
        />
      </div>

      <button
        className={running ? 'btn-stop' : 'btn-start'}
        onClick={() => running ? onStop() : onStart(mineCount)}
      >
        {running ? 'Stop Mining' : 'Start Mining'}
      </button>
    </div>
  )
}
