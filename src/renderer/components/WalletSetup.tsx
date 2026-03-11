import { useState } from 'react'

interface Props {
  walletExists: boolean
  onCreate: (password: string) => Promise<string>
  onImport: (key: string, password: string) => Promise<string>
  onUnlock: (password: string) => Promise<boolean>
}

export default function WalletSetup({ walletExists, onCreate, onImport, onUnlock }: Props) {
  const [mode, setMode] = useState<'unlock' | 'create' | 'import'>(walletExists ? 'unlock' : 'create')
  const [password, setPassword] = useState('')
  const [importKey, setImportKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [createdAddress, setCreatedAddress] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
    await onImport(importKey.trim(), password)
    setLoading(false)
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

      {walletExists ? (
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
          <p className="link" onClick={() => { setMode('import'); }}>
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
            </div>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}
