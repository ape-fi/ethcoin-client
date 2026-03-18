import { contextBridge, ipcRenderer } from 'electron'

const api = {
  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),

  // Wallet
  createWallet: (password: string) => ipcRenderer.invoke('wallet:create', password),
  importWallet: (key: string, password: string) => ipcRenderer.invoke('wallet:import', key, password),
  unlockWallet: (password: string) => ipcRenderer.invoke('wallet:unlock', password),
  getWalletStatus: () => ipcRenderer.invoke('wallet:status'),

  exportPrivateKey: (password: string) => ipcRenderer.invoke('wallet:export-private-key', password),
  lockWallet: () => ipcRenderer.invoke('wallet:lock'),
  getMaxEth: () => ipcRenderer.invoke('wallet:max-eth'),
  sendEth: (to: string, amount: string) => ipcRenderer.invoke('wallet:send-eth', to, amount),
  sendEthc: (to: string, amount: string) => ipcRenderer.invoke('wallet:send-ethc', to, amount),

  // Mining
  startMining: (mineCount: number) => ipcRenderer.invoke('mining:start', mineCount),
  stopMining: () => ipcRenderer.invoke('mining:stop'),
  setMiningPower: (mineCount: number) => ipcRenderer.invoke('mining:set-power', mineCount),

  // Data queries
  getBalances: () => ipcRenderer.invoke('wallet:balances'),
  getNetworkStats: () => ipcRenderer.invoke('chain:stats'),
  getMiningHistory: (limit?: number, offset?: number) => ipcRenderer.invoke('mining:history', limit, offset),
  getMiningStats: () => ipcRenderer.invoke('mining:get-stats'),
  getSettings: () => ipcRenderer.invoke('wallet:settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  validateRpc: (url: string) => ipcRenderer.invoke('settings:validate-rpc', url),

  // Events from main → renderer
  onMiningStatus: (callback: (status: any) => void) => {
    const listener = (_event: any, status: any) => callback(status)
    ipcRenderer.on('mining:status', listener)
    return () => ipcRenderer.removeListener('mining:status', listener)
  },
  onBalancesUpdate: (callback: (balances: any) => void) => {
    const listener = (_event: any, balances: any) => callback(balances)
    ipcRenderer.on('wallet:balances:update', listener)
    return () => ipcRenderer.removeListener('wallet:balances:update', listener)
  },
  onNetworkStatsUpdate: (callback: (stats: any) => void) => {
    const listener = (_event: any, stats: any) => callback(stats)
    ipcRenderer.on('chain:stats:update', listener)
    return () => ipcRenderer.removeListener('chain:stats:update', listener)
  },

  // Auto-update
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.invoke('update:install'),
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string }) => void) => {
    const listener = (_event: any, info: any) => callback(info)
    ipcRenderer.on('update:available', listener)
    return () => ipcRenderer.removeListener('update:available', listener)
  },
  onUpdateDownloadProgress: (callback: (progress: { percent: number }) => void) => {
    const listener = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('update:download-progress', listener)
    return () => ipcRenderer.removeListener('update:download-progress', listener)
  },
  onUpdateDownloaded: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('update:downloaded', listener)
    return () => ipcRenderer.removeListener('update:downloaded', listener)
  },

  // System events
  onSystemWake: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('system:wake', listener)
    return () => ipcRenderer.removeListener('system:wake', listener)
  }
}

contextBridge.exposeInMainWorld('ethcoinAPI', api)
