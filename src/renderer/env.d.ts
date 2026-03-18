interface EthcoinAPI {
  openExternal: (url: string) => Promise<void>
  createWallet: (password: string) => Promise<{ address: string }>
  importWallet: (key: string, password: string) => Promise<{ address: string }>
  unlockWallet: (password: string) => Promise<{ success: boolean }>
  getWalletStatus: () => Promise<import('../shared/types').WalletStatus>
  exportPrivateKey: (password: string) => Promise<{ privateKey?: string; error?: string }>
  lockWallet: () => Promise<{ locked: boolean }>
  getMaxEth: () => Promise<{ max: string }>
  sendEth: (to: string, amount: string) => Promise<{ txHash?: string; error?: string }>
  sendEthc: (to: string, amount: string) => Promise<{ txHash?: string; error?: string }>
  startMining: (mineCount: number) => Promise<{ started?: boolean; error?: string }>
  stopMining: () => Promise<{ stopped: boolean }>
  setMiningPower: (mineCount: number) => Promise<{ updated: boolean }>
  getBalances: () => Promise<import('../shared/types').Balances>
  getNetworkStats: () => Promise<import('../shared/types').NetworkStats>
  getMiningHistory: (limit?: number, offset?: number) => Promise<import('../shared/types').MiningHistoryEntry[]>
  getMiningStats: () => Promise<import('../shared/types').MiningStats | null>
  getSettings: () => Promise<import('../shared/types').Settings>
  saveSettings: (settings: Partial<import('../shared/types').Settings>) => Promise<{ saved: boolean }>
  validateRpc: (url: string) => Promise<{ valid: boolean; error?: string }>
  onMiningStatus: (callback: (status: import('../shared/types').MiningStatus) => void) => () => void
  onBalancesUpdate: (callback: (balances: import('../shared/types').Balances) => void) => () => void
  onNetworkStatsUpdate: (callback: (stats: import('../shared/types').NetworkStats) => void) => () => void
  downloadUpdate: () => Promise<void>
  installUpdate: () => Promise<void>
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string }) => void) => () => void
  onUpdateDownloadProgress: (callback: (progress: { percent: number }) => void) => () => void
  onUpdateDownloaded: (callback: () => void) => () => void
  onSystemWake: (callback: () => void) => () => void
}

interface Window {
  ethcoinAPI: EthcoinAPI
}
