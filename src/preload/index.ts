import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Wallet
  createWallet: (password: string) => ipcRenderer.invoke('wallet:create', password),
  importWallet: (key: string, password: string) => ipcRenderer.invoke('wallet:import', key, password),
  unlockWallet: (password: string) => ipcRenderer.invoke('wallet:unlock', password),
  getWalletStatus: () => ipcRenderer.invoke('wallet:status'),

  // Mining
  startMining: (mineCount: number) => ipcRenderer.invoke('mining:start', mineCount),
  stopMining: () => ipcRenderer.invoke('mining:stop'),

  // Data queries
  getBalances: () => ipcRenderer.invoke('wallet:balances'),
  getNetworkStats: () => ipcRenderer.invoke('chain:stats'),
  getMiningHistory: () => ipcRenderer.invoke('mining:history'),
  getSettings: () => ipcRenderer.invoke('wallet:settings'),
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),

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
  }
}

contextBridge.exposeInMainWorld('ethcoinAPI', api)
