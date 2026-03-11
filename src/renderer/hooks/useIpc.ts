import { useState, useEffect, useCallback } from 'react'
import type { MiningStatus, Balances, NetworkStats, WalletStatus } from '../../shared/types'

const api = window.ethcoinAPI

export function useWallet() {
  const [status, setStatus] = useState<WalletStatus>({ exists: false, unlocked: false, address: null })

  const refresh = useCallback(async () => {
    const s = await api.getWalletStatus()
    setStatus(s)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = async (password: string) => {
    const result = await api.createWallet(password)
    await refresh()
    return result.address
  }

  const importWallet = async (key: string, password: string) => {
    const result = await api.importWallet(key, password)
    await refresh()
    return result.address
  }

  const unlock = async (password: string) => {
    const result = await api.unlockWallet(password)
    await refresh()
    return result.success
  }

  return { status, create, importWallet, unlock, refresh }
}

export function useMining() {
  const [miningStatus, setMiningStatus] = useState<MiningStatus | null>(null)

  useEffect(() => {
    const unsubscribe = api.onMiningStatus(setMiningStatus)
    return unsubscribe
  }, [])

  const start = (mineCount: number) => api.startMining(mineCount)
  const stop = () => api.stopMining()

  return { miningStatus, start, stop }
}

export function useBalances() {
  const [balances, setBalances] = useState<Balances>({ eth: '0', ethc: '0' })

  const refresh = useCallback(async () => {
    const b = await api.getBalances()
    setBalances(b)
  }, [])

  useEffect(() => {
    refresh()
    const unsubscribe = api.onBalancesUpdate(setBalances)
    return unsubscribe
  }, [refresh])

  return { balances, refresh }
}

export function useNetworkStats() {
  const [stats, setStats] = useState<NetworkStats | null>(null)

  const refresh = useCallback(async () => {
    const s = await api.getNetworkStats()
    setStats(s)
  }, [])

  useEffect(() => {
    refresh()
    const unsubscribe = api.onNetworkStatsUpdate(setStats)
    return unsubscribe
  }, [refresh])

  return { stats, refresh }
}
