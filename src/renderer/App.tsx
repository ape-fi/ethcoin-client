import { useState, useEffect, useCallback, useRef } from 'react'
import { useWallet, useMining, useBalances, useNetworkStats } from './hooks/useIpc'
import WalletSetup from './components/WalletSetup'
import MiningStatus from './components/MiningStatus'
import WalletInfo from './components/WalletInfo'
import MiningHistory from './components/MiningHistory'
import NetworkStats from './components/NetworkStats'
import MiningStats from './components/MiningStats'
import Settings from './components/Settings'
import Disclaimer from './components/Disclaimer'
import UpdateBanner from './components/UpdateBanner'
import { APP_VERSION } from '../shared/constants'
import type { MiningHistoryEntry, MiningResult } from '../shared/types'

export default function App() {
  const { status: walletStatus, create, importWallet, unlock, refresh: refreshWallet } = useWallet()
  const { miningStatus, start, stop } = useMining()
  const { balances, refresh: refreshBalances } = useBalances(walletStatus.unlocked)
  const { stats } = useNetworkStats(walletStatus.unlocked)
  const [apiHistory, setApiHistory] = useState<MiningHistoryEntry[]>([])
  const localResultsRef = useRef<MiningResult[]>([])
  const [history, setHistory] = useState<MiningHistoryEntry[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(() => localStorage.getItem('disclaimer-accepted') === 'true')

  // Merge API history with local results that haven't appeared in API yet
  const mergeHistory = useCallback((api: MiningHistoryEntry[], local: MiningResult[]) => {
    const apiBlocks = new Set(api.map(e => e.blockNumber))
    const localEntries: MiningHistoryEntry[] = local
      .filter(r => !apiBlocks.has(r.blockNumber))
      .map(r => ({
        blockNumber: r.blockNumber,
        mineCount: r.mineCount,
        totalCount: 0,
        prob: 0,
        won: null,
        timestamp: Math.floor(r.timestamp / 1000)
      }))
    // Remove local results that have been absorbed by API
    localResultsRef.current = local.filter(r => !apiBlocks.has(r.blockNumber))
    return [...localEntries, ...api]
  }, [])

  const refreshHistory = useCallback(() => {
    window.ethcoinAPI.getMiningHistory().then((data) => {
      setApiHistory(data)
      setHistory(mergeHistory(data, localResultsRef.current))
    })
  }, [mergeHistory])

  // Refresh everything after system wake
  useEffect(() => {
    return window.ethcoinAPI.onSystemWake(() => {
      if (!walletStatus.unlocked) return
      refreshBalances()
      refreshHistory()
    })
  }, [walletStatus.unlocked, refreshBalances, refreshHistory])

  // Load history when wallet unlocks, clear on lock
  useEffect(() => {
    if (!walletStatus.unlocked) {
      setHistory([])
      setApiHistory([])
      localResultsRef.current = []
      return
    }
    refreshHistory()
  }, [walletStatus.unlocked, walletStatus.address, refreshHistory])

  // Track local mining results
  useEffect(() => {
    if (!walletStatus.unlocked || !miningStatus?.lastResult) return
    const result = miningStatus.lastResult
    if (!localResultsRef.current.some(r => r.blockNumber === result.blockNumber)) {
      localResultsRef.current = [result, ...localResultsRef.current]
    }
    setHistory(mergeHistory(apiHistory, localResultsRef.current))
    refreshHistory()
  }, [miningStatus?.lastResult, walletStatus.unlocked, refreshHistory, mergeHistory, apiHistory])

  // Poll history: always while mining, or until all pending entries are resolved
  const isMining = miningStatus?.running ?? false
  const hasPending = history.some(e => e.won === null)

  useEffect(() => {
    if (!walletStatus.unlocked) return
    if (!isMining && !hasPending) return
    const interval = setInterval(refreshHistory, 15_000)
    return () => clearInterval(interval)
  }, [walletStatus.unlocked, isMining, hasPending, refreshHistory])

  const acceptDisclaimer = () => {
    localStorage.setItem('disclaimer-accepted', 'true')
    setDisclaimerAccepted(true)
  }

  // First-launch disclaimer
  if (!disclaimerAccepted) {
    return <Disclaimer onAccept={acceptDisclaimer} />
  }

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
    return <Settings onBack={() => setShowSettings(false)} onLock={() => { setShowSettings(false); refreshWallet(); }} />
  }

  return (
    <div className="app">
      <UpdateBanner />
      <header className="app-header">
        <div className="header-left">
          <h1>Ethcoin Miner</h1>
          <span className="beta-badge">Beta v{APP_VERSION}</span>
        </div>
        <div className="header-right">
          <span className="address">{walletStatus.address?.slice(0, 6)}...{walletStatus.address?.slice(-4)}</span>
          <button className="btn-settings" onClick={() => setShowSettings(true)}>Settings</button>
        </div>
      </header>
      <div className="dashboard">
        <MiningStatus status={miningStatus} balances={balances} onStart={start} onStop={stop} />
        <WalletInfo address={walletStatus.address!} balances={balances} onBalancesRefresh={refreshBalances} />
        <MiningStats history={history} />
        <NetworkStats stats={stats} />
        <MiningHistory history={history} />
      </div>
    </div>
  )
}
