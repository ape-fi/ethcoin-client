import { useState, useEffect } from 'react'

interface Props {
  walletExists: boolean
  onCreate: (password: string) => Promise<string>
  onImport: (key: string, password: string) => Promise<string>
  onUnlock: (password: string) => Promise<boolean>
}

export default function WalletSetup({ walletExists, onCreate, onImport, onUnlock }: Props) {
  const [mode, setMode] = useState<'unlock' | 'create' | 'import'>(walletExists ? 'unlock' : 'create')
  const [password, setPassword] = useState('')

  // Sync mode when walletExists changes (e.g. after async status fetch)
  useEffect(() => {
    if (walletExists) setMode('unlock')
  }, [walletExists])
  const [importKey, setImportKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdAddress, setCreatedAddress] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showReplaceWarning, setShowReplaceWarning] = useState(false)

  const handleUnlock = async () => {
    setLoading(true)
    setError('')
    const success = await onUnlock(password)
    if (!success) setError('Wrong password')
    setLoading(false)
  }

  const handleCreate = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')
    const address = await onCreate(password)
    setCreatedAddress(address)
    setLoading(false)
  }

  const handleImport = async () => {
    if (!importKey.trim()) {
      setError('Enter a private key or mnemonic phrase')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onImport(importKey.trim(), password)
    } catch {
      setError('Failed to import wallet')
    }
    setLoading(false)
  }

  const handleReplaceConfirm = () => {
    setShowReplaceWarning(false)
    setMode('import')
    setPassword('')
    setImportKey('')
    setError('')
  }

  const copyAddress = async () => {
    if (!createdAddress) return
    await navigator.clipboard.writeText(createdAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (createdAddress) {
    return (
      <div className="wallet-setup">
        <h1>Wallet Created</h1>
        <p className="subtitle">Send ETH to this address for gas fees, then start mining</p>
        <div className="created-address-card">
          <div className="created-address" onClick={copyAddress}>
            {createdAddress}
          </div>
          <button onClick={copyAddress}>
            {copied ? 'Copied!' : 'Copy Address'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="wallet-setup">
      <h1>Ethcoin Miner</h1>
      <p className="subtitle">Set up your wallet to start mining</p>

      {walletExists && mode === 'unlock' ? (
        <div className="setup-form">
          <h2>Unlock Wallet</h2>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          />
          <button onClick={handleUnlock} disabled={loading}>
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
          <p className="link" onClick={() => setShowReplaceWarning(true)}>
            Import a different wallet
          </p>
        </div>
      ) : (
        <div className="setup-tabs">
          <div className="tabs">
            <button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>
              Create New
            </button>
            <button className={mode === 'import' ? 'active' : ''} onClick={() => setMode('import')}>
              Import Existing
            </button>
          </div>

          {walletExists && (
            <div className="replace-warning-banner">
              This will replace your existing wallet. Make sure you have backed up your private key.
            </div>
          )}

          {mode === 'create' && (
            <div className="setup-form">
              <input
                type="password"
                placeholder="Set a password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Wallet'}
              </button>
              {walletExists && (
                <p className="link" onClick={() => { setMode('unlock'); setError(''); }}>
                  Back to unlock
                </p>
              )}
            </div>
          )}

          {mode === 'import' && (
            <div className="setup-form">
              <textarea
                placeholder="Private key or mnemonic phrase"
                value={importKey}
                onChange={(e) => setImportKey(e.target.value)}
                rows={3}
              />
              <input
                type="password"
                placeholder="Set a password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button onClick={handleImport} disabled={loading}>
                {loading ? 'Importing...' : 'Import Wallet'}
              </button>
              {walletExists && (
                <p className="link" onClick={() => { setMode('unlock'); setError(''); }}>
                  Back to unlock
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {showReplaceWarning && (
        <div className="modal-overlay" onClick={() => setShowReplaceWarning(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Replace Wallet?</h2>
              <button className="modal-close" onClick={() => setShowReplaceWarning(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="replace-warning-text">
                Creating or importing a new wallet will permanently replace your current wallet.
                If you haven't backed up your private key, you will lose access to your funds.
              </p>
              <button className="btn-danger" onClick={handleReplaceConfirm}>
                I've backed up my key, continue
              </button>
              <button onClick={() => setShowReplaceWarning(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
