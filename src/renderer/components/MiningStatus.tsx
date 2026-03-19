import { useState, useEffect } from 'react'
import type { MiningStatus as MiningStatusType, Balances } from '../../shared/types'
import { MAX_MINE_COUNT } from '../../shared/constants'

const PRESET_POWERS = [1, 5, 10]

interface Props {
  status: MiningStatusType | null
  balances: Balances
  onStart: (mineCount: number) => Promise<{ error?: string } | void>
  onStop: () => void
}

export default function MiningStatus({ status, balances, onStart, onStop }: Props) {
  const [mineCount, setMineCount] = useState(status?.mineCount ?? 1)
  const [customValue, setCustomValue] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [startError, setStartError] = useState('')
  const running = status?.running ?? false

  // Sync mineCount from mining engine status (e.g. after remount from settings)
  useEffect(() => {
    if (status?.mineCount && status.mineCount !== mineCount) {
      setMineCount(status.mineCount)
      if (!PRESET_POWERS.includes(status.mineCount)) {
        setIsCustom(true)
        setCustomValue(String(status.mineCount))
      } else {
        setIsCustom(false)
        setCustomValue('')
      }
    }
  }, [status?.mineCount])
  const hasNoEth = parseFloat(balances.eth) === 0

  const updatePower = (value: number) => {
    setMineCount(value)
    if (running) {
      window.ethcoinAPI.setMiningPower(value)
    }
  }

  const selectPreset = (value: number) => {
    updatePower(value)
    setIsCustom(false)
    setCustomValue('')
  }

  const handleCustomChange = (input: string) => {
    setCustomValue(input)
    const num = parseInt(input, 10)
    if (!isNaN(num) && num >= 1 && num <= MAX_MINE_COUNT) {
      updatePower(num)
    }
  }

  const activateCustom = () => {
    setIsCustom(true)
    setCustomValue(PRESET_POWERS.includes(mineCount) ? '' : String(mineCount))
  }

  const handleStart = async () => {
    setStartError('')
    const result = await onStart(mineCount)
    if (result?.error) {
      setStartError(result.error)
    }
  }

  return (
    <div className="panel mining-status">
      <h2>Mining</h2>

      <div className="status-indicator">
        <span className={`dot ${running ? 'active' : 'inactive'}`} />
        <span>{running ? 'Mining' : 'Stopped'}</span>
      </div>

      {running && (
        <div className="mining-wave">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.12}s` }} />
          ))}
        </div>
      )}

      {status && (
        <div className="stats">
          {status.pendingTx && (
            <div className="stat">
              <span className="label">Pending TX</span>
              <span className="value tx">{status.pendingTx.slice(0, 10)}...</span>
            </div>
          )}
          {status.gasTooHigh && (
            <div className="stat">
              <span className="label">Paused</span>
              <span className="value gas-warning">{status.gasTooHigh}</span>
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
            >
              {p}
            </button>
          ))}
          <div className={`power-custom ${isCustom ? 'selected' : ''}`}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Custom"
              value={isCustom ? customValue : ''}
              onFocus={activateCustom}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '')
                handleCustomChange(v)
              }}
            />
          </div>
        </div>
      </div>

      {(hasNoEth && !running) && (
        <p className="mining-notice">Deposit ETH for gas fees to start mining</p>
      )}
      {status?.error && (
        <p className="mining-notice error">{status.error}</p>
      )}
      {startError && (
        <p className="mining-notice error">{startError}</p>
      )}

      <button
        className={running ? 'btn-stop' : 'btn-start'}
        onClick={() => running ? onStop() : handleStart()}
        disabled={hasNoEth && !running}
      >
        {running ? 'Stop Mining' : 'Start Mining'}
      </button>
    </div>
  )
}
