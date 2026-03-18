import { useState, useEffect } from 'react'
import { APP_VERSION, DISCLAIMER_TEXT } from '../../shared/constants'

interface Props {
  onBack: () => void
  onLock: () => void
}

export default function Settings({ onBack, onLock }: Props) {
  const [rpcUrl, setRpcUrl] = useState('')
  const [maxGasGwei, setMaxGasGwei] = useState('20')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDisclaimer, setShowDisclaimer] = useState(false)

  useEffect(() => {
    window.ethcoinAPI.getSettings().then((s) => {
      setRpcUrl(s.rpcUrl)
      setMaxGasGwei(String(s.maxGasGwei ?? 20))
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    const gasVal = parseInt(maxGasGwei, 10)
    await window.ethcoinAPI.saveSettings({
      rpcUrl: rpcUrl.trim(),
      maxGasGwei: isNaN(gasVal) || gasVal <= 0 ? 20 : gasVal
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return null

  return (
    <div className="app">
      <header className="app-header">
        <h1>Settings</h1>
        <button className="btn-back" onClick={onBack}>Back</button>
      </header>
      <div className="settings-page">
        <div className="panel">
          <h2>RPC Endpoint</h2>
          <p className="settings-desc">
            A public RPC is used by default. For more reliable mining, provide your own RPC from Alchemy, Infura, or other providers.
          </p>
          <div className="settings-form">
            <input
              type="text"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              placeholder="Leave empty to use default public RPC"
            />
          </div>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <h2>Max Gas Price</h2>
          <p className="settings-desc">
            Mining will pause when gas price exceeds this limit and resume automatically when it drops below.
          </p>
          <div className="settings-form">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="text"
                inputMode="numeric"
                value={maxGasGwei}
                onChange={(e) => setMaxGasGwei(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="20"
                style={{ flex: 1 }}
              />
              <span style={{ color: '#8b949e', fontSize: 13 }}>Gwei</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <button onClick={handleSave}>
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <h2>Export Private Key</h2>
          <p className="settings-desc">
            Your private key gives full access to your wallet. Never share it with anyone.
          </p>
          <div className="settings-form">
            <button className="btn-danger" onClick={() => setShowModal(true)}>
              Show Private Key
            </button>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <h2>Lock Wallet</h2>
          <p className="settings-desc">
            Lock your wallet to prevent unauthorized access. You'll need your password to unlock again.
          </p>
          <div className="settings-form">
            <button onClick={async () => { await window.ethcoinAPI.lockWallet(); onLock(); }}>
              Lock Wallet
            </button>
          </div>
        </div>
        <div className="panel" style={{ marginTop: 16 }}>
          <h2>About</h2>
          <p className="settings-desc">
            Ethcoin Miner — Beta v{APP_VERSION}
          </p>
          <div className="settings-form">
            <button onClick={() => setShowDisclaimer(true)}>
              View Disclaimer
            </button>
          </div>
        </div>
      </div>

      {showModal && <PrivateKeyModal onClose={() => setShowModal(false)} />}

      {showDisclaimer && (
        <div className="modal-overlay" onClick={() => setShowDisclaimer(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Disclaimer</h2>
              <button className="modal-close" onClick={() => setShowDisclaimer(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="disclaimer-text">{DISCLAIMER_TEXT}</p>
              <button onClick={() => setShowDisclaimer(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PrivateKeyModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async () => {
    if (!password) {
      setError('Enter your password')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await window.ethcoinAPI.exportPrivateKey(password)
      if (result.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      setPrivateKey(result.privateKey!)
    } catch {
      setError('Failed to export private key')
    }
    setLoading(false)
  }

  const copyKey = async () => {
    if (!privateKey) return
    await navigator.clipboard.writeText(privateKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Private Key</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        {privateKey ? (
          <div className="modal-body">
            <p className="settings-desc" style={{ color: '#ef4444' }}>
              Do not share this key with anyone. Anyone with this key has full control of your wallet.
            </p>
            <div className="private-key-display" onClick={copyKey}>
              {privateKey}
            </div>
            <button onClick={copyKey}>
              {copied ? 'Copied!' : 'Copy Private Key'}
            </button>
          </div>
        ) : (
          <div className="modal-body">
            <p className="settings-desc">Enter your wallet password to reveal your private key.</p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              autoFocus
            />
            <button onClick={handleSubmit} disabled={loading || !password}>
              {loading ? 'Verifying...' : 'Confirm'}
            </button>
            {error && <p className="error">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
