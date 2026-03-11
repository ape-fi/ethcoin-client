import { useState, useEffect } from 'react'
import { useWallet, useMining, useBalances, useNetworkStats } from './hooks/useIpc'
import WalletSetup from './components/WalletSetup'
import MiningStatus from './components/MiningStatus'
import WalletInfo from './components/WalletInfo'
import MiningHistory from './components/MiningHistory'
import NetworkStats from './components/NetworkStats'
import Settings from './components/Settings'
import type { MiningHistoryEntry } from '../shared/types'

export default function App() {
  const { status: walletStatus, create, importWallet, unlock } = useWallet()
  const { miningStatus, start, stop } = useMining()
  const { balances, refresh: refreshBalances } = useBalances()
  const { stats } = useNetworkStats()
  const [history, setHistory] = useState<MiningHistoryEntry[]>([])
  const [showSettings, setShowSettings] = useState(false)

  // Refresh balances periodically when wallet is unlocked
  useEffect(() => {
    if (!walletStatus.unlocked) return
    refreshBalances()
    const interval = setInterval(refreshBalances, 30_000)
    return () => clearInterval(interval)
  }, [walletStatus.unlocked, refreshBalances])

  // Refresh history when mining status changes
  useEffect(() => {
    if (!walletStatus.unlocked) return
    window.ethcoinAPI.getMiningHistory().then(setHistory)
  }, [miningStatus?.lastResult, walletStatus.unlocked])

  if (!walletStatus.unlocked) {
    return (
      <WalletSetup
        walletExists={walletStatus.exists}
        onCreate={create}
        onImport={importWallet}
        onUnlock={unlock}
      />
    )
  }

  if (showSettings) {
    return <Settings onBack={() => setShowSettings(false)} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Ethcoin Miner</h1>
        <div className="header-right">
          <span className="address">{walletStatus.address?.slice(0, 6)}...{walletStatus.address?.slice(-4)}</span>
          <button className="btn-settings" onClick={() => setShowSettings(true)}>Settings</button>
        </div>
      </header>
      <div className="dashboard">
        <MiningStatus status={miningStatus} onStart={start} onStop={stop} />
        <WalletInfo address={walletStatus.address!} balances={balances} />
        <NetworkStats stats={stats} />
        <MiningHistory history={history} />
      </div>
    </div>
  )
}
