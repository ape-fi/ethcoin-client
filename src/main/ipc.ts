import { ipcMain, BrowserWindow } from 'electron'
import { WalletManager } from './wallet-manager'
import { ChainService } from './chain-service'
import { MiningEngine } from './mining-engine'
import { DEFAULT_RPC_URL } from '../shared/constants'
import type { Settings } from '../shared/types'
import fs from 'fs'
import path from 'path'

let chainService: ChainService | null = null
let miningEngine: MiningEngine | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null

export function registerIpcHandlers(
  walletManager: WalletManager,
  dataDir: string,
  getMainWindow: () => BrowserWindow | null
): void {
  const settingsPath = path.join(dataDir, 'settings.json')

  function loadSettings(): Settings {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    } catch {
      return { mineCount: 1, rpcUrl: DEFAULT_RPC_URL }
    }
  }

  function saveSettings(settings: Settings): void {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  }

  function getChainService(): ChainService {
    if (!chainService) {
      const settings = loadSettings()
      chainService = new ChainService(settings.rpcUrl)
    }
    return chainService
  }

  function send(channel: string, data: any): void {
    getMainWindow()?.webContents.send(channel, data)
  }

  // Wallet handlers
  ipcMain.handle('wallet:create', async (_event, password: string) => {
    try {
      const address = await walletManager.create(password)
      return { address }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('wallet:import', async (_event, key: string, password: string) => {
    try {
      const address = key.trim().includes(' ')
        ? await walletManager.importFromMnemonic(key, password)
        : await walletManager.importFromKey(key, password)
      return { address }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('wallet:unlock', async (_event, password: string) => {
    const success = await walletManager.unlock(password)
    return { success }
  })

  ipcMain.handle('wallet:status', () => {
    return walletManager.getStatus()
  })

  ipcMain.handle('wallet:balances', async () => {
    const wallet = walletManager.getWallet()
    if (!wallet) return { eth: '0', ethc: '0' }
    const chain = getChainService()
    const [eth, ethc] = await Promise.all([
      chain.getEthBalance(wallet.address),
      chain.getEthcBalance(wallet.address)
    ])
    return { eth, ethc }
  })

  ipcMain.handle('wallet:settings', () => {
    return loadSettings()
  })

  ipcMain.handle('settings:save', (_event, newSettings: Partial<Settings>) => {
    const settings = loadSettings()
    if (newSettings.rpcUrl !== undefined) {
      settings.rpcUrl = newSettings.rpcUrl
      // Recreate chain service with new RPC
      chainService?.destroy()
      chainService = new ChainService(settings.rpcUrl)
    }
    if (newSettings.mineCount !== undefined) {
      settings.mineCount = newSettings.mineCount
    }
    saveSettings(settings)
    return { saved: true }
  })

  // Mining handlers
  ipcMain.handle('mining:start', async (_event, mineCount: number) => {
    const wallet = walletManager.getWallet()
    if (!wallet) return { error: 'Wallet not unlocked' }

    const chain = getChainService()
    const connectedWallet = wallet.connect(chain.getProvider())
    miningEngine = new MiningEngine(chain.getContract(), connectedWallet as any, dataDir)

    miningEngine.onStatus((status) => send('mining:status', status))
    miningEngine.start(mineCount)

    // Start periodic balance and stats push
    if (pollInterval) clearInterval(pollInterval)
    pollInterval = setInterval(async () => {
      try {
        const w = walletManager.getWallet()
        if (!w) return
        const [balances, networkStats] = await Promise.all([
          (async () => ({
            eth: await chain.getEthBalance(w.address),
            ethc: await chain.getEthcBalance(w.address)
          }))(),
          chain.getNetworkStats()
        ])
        send('wallet:balances:update', balances)
        send('chain:stats:update', networkStats)
      } catch { /* ignore polling errors */ }
    }, 15_000)

    const settings = loadSettings()
    settings.mineCount = mineCount
    saveSettings(settings)

    return { started: true }
  })

  ipcMain.handle('mining:stop', () => {
    miningEngine?.stop()
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    return { stopped: true }
  })

  ipcMain.handle('mining:history', () => {
    return miningEngine?.getHistory() ?? []
  })

  // Network stats
  ipcMain.handle('chain:stats', async () => {
    const chain = getChainService()
    return chain.getNetworkStats()
  })
}
