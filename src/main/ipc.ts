import { ipcMain, BrowserWindow, powerSaveBlocker } from 'electron'
import { WalletManager } from './wallet-manager'
import { ChainService } from './chain-service'
import type { MiningEngine as MiningEngineType } from './mining-engine'
import { DEFAULT_RPC_URL } from '../shared/constants'
import type { Settings, MiningResult } from '../shared/types'
import { parseEther } from 'ethers'
import fs from 'fs'
import path from 'path'

let chainService: ChainService | null = null
let miningEngine: MiningEngineType | null = null
let pollInterval: ReturnType<typeof setInterval> | null = null
let powerBlockerId: number | null = null

const IPC_CHANNELS = [
  'wallet:create',
  'wallet:import',
  'wallet:unlock',
  'wallet:status',
  'wallet:balances',
  'wallet:settings',
  'wallet:export-private-key',
  'wallet:lock',
  'wallet:max-eth',
  'wallet:send-eth',
  'wallet:send-ethc',
  'settings:save',
  'settings:validate-rpc',
  'mining:start',
  'mining:stop',
  'mining:set-power',
  'mining:history',
  'mining:get-stats',
  'chain:stats'
]

export function registerIpcHandlers(
  walletManager: WalletManager,
  dataDir: string,
  getMainWindow: () => BrowserWindow | null
): void {
  // Remove existing handlers to support hot-reload in dev mode
  for (const channel of IPC_CHANNELS) {
    ipcMain.removeHandler(channel)
  }

  const settingsPath = path.join(dataDir, 'settings.json')

  function loadSettings(): Settings {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    } catch {
      return { mineCount: 1, rpcUrl: DEFAULT_RPC_URL, maxGasGwei: 20 }
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

  // Stop mining and clean up when switching wallets
  function stopMiningAndCleanup(): void {
    miningEngine?.stop()
    miningEngine = null
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
    if (powerBlockerId !== null) {
      powerSaveBlocker.stop(powerBlockerId)
      powerBlockerId = null
    }
  }

  // Wallet handlers
  ipcMain.handle('wallet:create', async (_event, password: string) => {
    try {
      stopMiningAndCleanup()
      const address = await walletManager.create(password)
      return { address }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('wallet:import', async (_event, key: string, password: string) => {
    try {
      stopMiningAndCleanup()
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
    try {
      const wallet = walletManager.getWallet()
      if (!wallet) return { eth: '0', ethc: '0' }
      const chain = getChainService()
      return chain.getUserBalances(wallet.address)
    } catch {
      return { eth: '0', ethc: '0' }
    }
  })

  ipcMain.handle('wallet:settings', () => {
    return loadSettings()
  })

  ipcMain.handle('settings:save', (_event, newSettings: Partial<Settings>) => {
    const settings = loadSettings()
    if (newSettings.rpcUrl !== undefined && newSettings.rpcUrl !== settings.rpcUrl) {
      settings.rpcUrl = newSettings.rpcUrl
      // Stop mining, kill old provider completely, reset references
      miningEngine?.stop()
      miningEngine = null
      chainService?.destroy()
      chainService = null
      // Clear polling interval that holds old provider references
      if (pollInterval) {
        clearInterval(pollInterval)
        pollInterval = null
      }
    }
    if (newSettings.mineCount !== undefined) {
      settings.mineCount = newSettings.mineCount
    }
    if (newSettings.maxGasGwei !== undefined) {
      settings.maxGasGwei = newSettings.maxGasGwei
      miningEngine?.setMaxGasGwei(newSettings.maxGasGwei)
    }
    saveSettings(settings)
    return { saved: true }
  })

  ipcMain.handle('settings:validate-rpc', async (_event, url: string) => {
    try {
      const { JsonRpcProvider } = await import('ethers')
      const provider = new JsonRpcProvider(url)
      const blockNumber = await provider.getBlockNumber()
      provider.destroy()
      if (typeof blockNumber !== 'number' || blockNumber <= 0) {
        return { valid: false, error: 'RPC returned invalid data' }
      }
      return { valid: true }
    } catch {
      return { valid: false, error: 'Could not connect to RPC endpoint' }
    }
  })

  ipcMain.handle('wallet:export-private-key', async (_event, password: string) => {
    try {
      const wallet = walletManager.getWallet()
      if (!wallet) return { error: 'Wallet not unlocked' }
      // Verify password by attempting to decrypt the stored keystore
      const verified = await walletManager.verifyPassword(password)
      if (!verified) return { error: 'Wrong password' }
      return { privateKey: wallet.privateKey }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('wallet:lock', () => {
    stopMiningAndCleanup()
    walletManager.lock()
    return { locked: true }
  })

  ipcMain.handle('wallet:max-eth', async () => {
    try {
      const wallet = walletManager.getWallet()
      if (!wallet) return { max: '0' }
      const chain = getChainService()
      const provider = chain.getProvider()
      const [balance, feeData] = await Promise.all([
        provider.getBalance(wallet.address),
        provider.getFeeData()
      ])
      const gasLimit = 21000n
      const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n
      const gasCost = gasLimit * gasPrice
      const max = balance > gasCost ? balance - gasCost : 0n
      const { formatEther: fmt } = await import('ethers')
      return { max: fmt(max) }
    } catch {
      return { max: '0' }
    }
  })

  ipcMain.handle('wallet:send-eth', async (_event, to: string, amount: string) => {
    try {
      const wasMining = miningEngine?.isRunning() ?? false
      if (wasMining) miningEngine!.pause()
      const wallet = walletManager.getWallet()
      if (!wallet) return { error: 'Wallet not unlocked' }
      const chain = getChainService()
      const connectedWallet = wallet.connect(chain.getProvider())
      const tx = await connectedWallet.sendTransaction({ to, value: parseEther(amount) })
      if (wasMining) miningEngine?.resume()
      return { txHash: tx.hash }
    } catch (err: any) {
      if (miningEngine?.isRunning() === false && err.message !== 'Wallet not unlocked') miningEngine?.resume()
      return { error: err.message }
    }
  })

  ipcMain.handle('wallet:send-ethc', async (_event, to: string, amount: string) => {
    try {
      const wasMining = miningEngine?.isRunning() ?? false
      if (wasMining) miningEngine!.pause()
      const wallet = walletManager.getWallet()
      if (!wallet) return { error: 'Wallet not unlocked' }
      const chain = getChainService()
      const connectedWallet = wallet.connect(chain.getProvider())
      const contract = chain.getContract().connect(connectedWallet) as any
      const tx = await contract.transfer(to, parseEther(amount))
      if (wasMining) miningEngine?.resume()
      return { txHash: tx.hash }
    } catch (err: any) {
      if (miningEngine?.isRunning() === false && err.message !== 'Wallet not unlocked') miningEngine?.resume()
      return { error: err.message }
    }
  })

  // Mining handlers
  ipcMain.handle('mining:start', async (_event, mineCount: number) => {
    try {
      const wallet = walletManager.getWallet()
      if (!wallet) return { error: 'Wallet not unlocked' }

      // Stop any existing mining engine
      miningEngine?.stop()

      const chain = getChainService()
      const connectedWallet = wallet.connect(chain.getProvider())
      const { MiningEngine } = await import('./mining-engine')
      miningEngine = new MiningEngine(chain.getContract(), connectedWallet as any, chain.getProvider())

      const settings = loadSettings()
      miningEngine.setMaxGasGwei(settings.maxGasGwei ?? 20)
      miningEngine.onStatus((status) => send('mining:status', status))
      miningEngine.start(mineCount)

      // Start periodic balance and stats push
      if (pollInterval) clearInterval(pollInterval)
      pollInterval = setInterval(async () => {
        try {
          const w = walletManager.getWallet()
          if (!w) return
          const c = getChainService()
          const [balances, networkStats] = await Promise.all([
            c.getUserBalances(w.address),
            c.getNetworkStats()
          ])
          send('wallet:balances:update', balances)
          send('chain:stats:update', networkStats)
        } catch { /* ignore polling errors */ }
      }, 30_000)

      settings.mineCount = mineCount
      saveSettings(settings)

      // Prevent system sleep while mining
      if (powerBlockerId === null) {
        powerBlockerId = powerSaveBlocker.start('prevent-app-suspension')
      }

      return { started: true }
    } catch (err: any) {
      return { error: err.message }
    }
  })

  ipcMain.handle('mining:stop', () => {
    stopMiningAndCleanup()
    return { stopped: true }
  })

  ipcMain.handle('mining:set-power', (_event, mineCount: number) => {
    if (miningEngine) {
      miningEngine.setMineCount(mineCount)
    }
    return { updated: true }
  })

  const ETHCOIN_API_BASE = 'https://api.ethcoin.org/mine/history/miner_info'
  const CHAIN_ID = 1

  ipcMain.handle('mining:history', async (_event, limit = 50, offset = 0) => {
    try {
      const wallet = walletManager.getWallet()
      if (!wallet) return []
      const url = `${ETHCOIN_API_BASE}/detail/${wallet.address}?chain_id=${CHAIN_ID}&limit=${limit}&offset=${offset}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.status !== 'success' || !json.data) return []
      return json.data.map((e: any) => ({
        blockNumber: e.block,
        mineCount: e.mining_cnt,
        totalCount: e.total_cnt,
        prob: e.prob,
        won: e.won,
        timestamp: e.timestamp
      }))
    } catch {
      return []
    }
  })

  ipcMain.handle('mining:get-stats', async () => {
    try {
      const wallet = walletManager.getWallet()
      if (!wallet) return null
      const url = `${ETHCOIN_API_BASE}/stats/${wallet.address}?chain_id=${CHAIN_ID}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.status !== 'success' || !json.data) return null
      const d = json.data
      return {
        blocksMined: d.total,
        totalPower: d.total_mining_power,
        wins: d.actual,
        ethcMined: d.ethc_mined
      }
    } catch {
      return null
    }
  })

  // Network stats
  ipcMain.handle('chain:stats', async () => {
    try {
      const chain = getChainService()
      return chain.getNetworkStats()
    } catch {
      return null
    }
  })
}
