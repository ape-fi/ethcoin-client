import { useState } from 'react'
import type { MiningStatus as MiningStatusType } from '../../shared/types'
import { MAX_MINE_COUNT } from '../../shared/constants'

const PRESET_POWERS = [1, 5, 10]

interface Props {
  status: MiningStatusType | null
  onStart: (mineCount: number) => void
  onStop: () => void
}

export default function MiningStatus({ status, onStart, onStop }: Props) {
  const [mineCount, setMineCount] = useState(1)
  const [customValue, setCustomValue] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const running = status?.running ?? false

  const selectPreset = (value: number) => {
    setMineCount(value)
    setIsCustom(false)
    setCustomValue('')
  }

  const handleCustomChange = (input: string) => {
    setCustomValue(input)
    const num = parseInt(input, 10)
    if (!isNaN(num) && num >= 1 && num <= MAX_MINE_COUNT) {
      setMineCount(num)
    }
  }

  const activateCustom = () => {
    setIsCustom(true)
    setCustomValue(PRESET_POWERS.includes(mineCount) ? '' : String(mineCount))
  }

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

      <div className="mine-power-control">
        <label>Mining Power: {mineCount}</label>
        <div className="power-options">
          {PRESET_POWERS.map((p) => (
            <button
              key={p}
              className={`power-btn ${!isCustom && mineCount === p ? 'selected' : ''}`}
              onClick={() => selectPreset(p)}
              disabled={running}
            >
              {p}
            </button>
          ))}
          <div className={`power-custom ${isCustom ? 'selected' : ''}`}>
            <input
              type="number"
              placeholder="Custom"
              min={1}
              max={MAX_MINE_COUNT}
              value={isCustom ? customValue : ''}
              onFocus={activateCustom}
              onChange={(e) => handleCustomChange(e.target.value)}
              disabled={running}
            />
          </div>
        </div>
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
