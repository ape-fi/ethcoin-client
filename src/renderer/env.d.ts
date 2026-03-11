interface EthcoinAPI {
  createWallet: (password: string) => Promise<{ address: string }>
  importWallet: (key: string, password: string) => Promise<{ address: string }>
  unlockWallet: (password: string) => Promise<{ success: boolean }>
  getWalletStatus: () => Promise<import('../shared/types').WalletStatus>
  startMining: (mineCount: number) => Promise<{ started?: boolean; error?: string }>
  stopMining: () => Promise<{ stopped: boolean }>
  getBalances: () => Promise<import('../shared/types').Balances>
  getNetworkStats: () => Promise<import('../shared/types').NetworkStats>
  getMiningHistory: () => Promise<import('../shared/types').MiningHistoryEntry[]>
  getSettings: () => Promise<import('../shared/types').Settings>
  onMiningStatus: (callback: (status: import('../shared/types').MiningStatus) => void) => () => void
  onBalancesUpdate: (callback: (balances: import('../shared/types').Balances) => void) => () => void
  onNetworkStatsUpdate: (callback: (stats: import('../shared/types').NetworkStats) => void) => () => void
}

interface Window {
  ethcoinAPI: EthcoinAPI
}
