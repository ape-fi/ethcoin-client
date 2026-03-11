import { useState, useEffect } from 'react'

interface Props {
  onBack: () => void
}

export default function Settings({ onBack }: Props) {
  const [rpcUrl, setRpcUrl] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.ethcoinAPI.getSettings().then((s) => {
      setRpcUrl(s.rpcUrl)
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    await window.ethcoinAPI.saveSettings({ rpcUrl: rpcUrl.trim() })
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
            Enter your Ethereum RPC URL. You can get one from Infura, Alchemy, or any RPC provider.
          </p>
          <div className="settings-form">
            <input
              type="text"
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              placeholder="https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY"
            />
            <button onClick={handleSave} disabled={!rpcUrl.trim()}>
              {saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
