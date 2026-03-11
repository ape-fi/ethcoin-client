# Ethcoin Miner Desktop App — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Electron desktop app that automatically mines Ethcoin once per block with user-configurable ticket count.

**Architecture:** Three-layer Electron app: React renderer for UI, Node.js main process for mining/wallet/chain services, IPC bridge between them. Main process runs ethers.js to listen for new Ethcoin blocks and submit `mine()` transactions.

**Tech Stack:** Electron, React 18, TypeScript, ethers.js v6, electron-vite (build tooling), Vitest (testing), electron-builder (packaging)

**Spec:** `docs/superpowers/specs/2026-03-12-ethcoin-miner-design.md`

---

## Chunk 1: Project Scaffolding & Shared Types

### Task 1: Initialize Electron + React + TypeScript project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.web.json`
- Create: `electron.vite.config.ts`
- Create: `electron-builder.yml`
- Create: `src/main/index.ts`
- Create: `src/preload/index.ts`
- Create: `src/renderer/index.html`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Update: `.gitignore`

- [ ] **Step 1: Create `package.json` with all dependencies**

```json
{
  "name": "ethcoin-client",
  "version": "0.1.0",
  "description": "Ethcoin mining desktop application",
  "main": "./out/main/index.js",
  "scripts": {
    "dev": "electron-vite dev",
    "build": "electron-vite build",
    "preview": "electron-vite preview",
    "package": "electron-vite build && electron-builder",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "ethers": "^6.13.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "electron": "^33.0.0",
    "electron-builder": "^25.0.0",
    "electron-vite": "^2.3.0",
    "typescript": "^5.5.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create TypeScript configs**

`tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.web.json" }
  ]
}
```

`tsconfig.node.json` (main + preload):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "./out",
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/main/**/*", "src/preload/**/*", "src/shared/**/*", "electron.vite.config.ts"]
}
```

`tsconfig.web.json` (renderer):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "outDir": "./out",
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

- [ ] **Step 3: Create `electron.vite.config.ts`**

```ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    plugins: [react()]
  }
})
```

- [ ] **Step 4: Create `electron-builder.yml`**

```yaml
appId: com.ethcoin.miner
productName: Ethcoin Miner
directories:
  buildResources: resources
  output: dist
files:
  - out/**/*
mac:
  target: dmg
  category: public.app-category.finance
win:
  target: nsis
linux:
  target: AppImage
```

- [ ] **Step 4b: Create `resources/` directory with placeholder**

```bash
mkdir -p resources && touch resources/.gitkeep
```

- [ ] **Step 5: Create minimal main process entry `src/main/index.ts`**

```ts
import { app, BrowserWindow } from 'electron'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

- [ ] **Step 6: Create preload script `src/preload/index.ts`**

```ts
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
```

- [ ] **Step 7: Create renderer entry files**

`src/renderer/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ethcoin Miner</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

`src/renderer/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

`src/renderer/App.tsx`:
```tsx
export default function App() {
  return <div className="app">Ethcoin Miner</div>
}
```

`src/renderer/styles/global.css`:
```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f0f0f; color: #e0e0e0; }
.app { padding: 24px; }
```

- [ ] **Step 8: Update `.gitignore`**

Add to existing `.gitignore`:
```
node_modules/
dist/
out/
.superpowers/
```

- [ ] **Step 9: Install dependencies and verify dev server starts**

Run: `npm install && npm run dev`
Expected: Electron window opens showing "Ethcoin Miner" text.

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: scaffold Electron + React + TypeScript project"
```

---

### Task 2: Shared types and contract constants

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/constants.ts`

- [ ] **Step 1: Create `src/shared/types.ts`**

```ts
export interface WalletStatus {
  exists: boolean
  unlocked: boolean
  address: string | null
}

export interface Balances {
  eth: string   // formatted ETH balance
  ethc: string  // formatted ETHC balance
}

export interface MiningStatus {
  running: boolean
  mineCount: number
  currentBlock: number
  lastBlockTime: number
  pendingTx: string | null  // tx hash if waiting for confirmation
  lastResult: MiningResult | null
}

export interface MiningResult {
  blockNumber: number
  txHash: string
  mineCount: number
  won: boolean
  reward: string | null  // formatted ETHC if won
  timestamp: number
}

export interface NetworkStats {
  currentBlock: number
  miningReward: string     // formatted ETHC
  totalTicketsInBlock: number
  nextHalvingBlock: number
  lastBlockTime: number
}

export interface MiningHistoryEntry {
  blockNumber: number
  txHash: string
  mineCount: number
  won: boolean
  reward: string | null
  timestamp: number
}

export interface Settings {
  mineCount: number
  rpcUrl: string
}
```

- [ ] **Step 2: Create `src/shared/constants.ts`**

```ts
export const ETHCOIN_CONTRACT_ADDRESS = '0x0cfCe463B72476808662fAD25817b2883ECa9a6D'

export const DEFAULT_RPC_URL = 'https://eth.llamarpc.com'

export const MAX_MINE_COUNT = 200
export const MIN_MINE_COUNT = 1
export const DEFAULT_MINE_COUNT = 1

export const ETHCOIN_ABI = [
  // Mining
  'function mine(uint256 mineCount)',
  'function blockNumber() view returns (uint256)',
  'function lastBlockTime() view returns (uint256)',
  'function miningReward() view returns (uint256)',
  'function halvingInterval() view returns (uint256)',
  'function lastHalvingBlock() view returns (uint256)',
  'function nextHalvingBlock() view returns (uint256)',
  'function totalMineCountOfBlock(uint256 _blockNumber) view returns (uint256)',
  'function selectedMinerOfBlock(uint256 _blockNumber) view returns (address)',
  'function mineBatchOfBlock(uint256 _blockNumber) view returns (tuple(address miner, uint256 startIdx, uint256 mineCount)[])',

  // ERC20
  'function balanceOf(address account) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',

  // Events
  'event Mine(uint256 indexed blockNumber, address indexed miner, uint256 mineCount)',
  'event NewETHCBlock(uint256 indexed blockNumber)',
  'event MinerSelected(uint256 blockNumber, address selectedMiner, uint256 miningReward)'
] as const
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/ && git commit -m "feat: add shared types and contract constants"
```

---

## Chunk 2: Main Process Services

### Task 3: ChainService — Ethereum provider and contract interaction

**Files:**
- Create: `src/main/chain-service.ts`
- Create: `src/main/__tests__/chain-service.test.ts`

- [ ] **Step 1: Write test for ChainService initialization and read methods**

`src/main/__tests__/chain-service.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChainService } from '../chain-service'

// Mock ethers
vi.mock('ethers', () => {
  const mockContract = {
    blockNumber: vi.fn().mockResolvedValue(42n),
    miningReward: vi.fn().mockResolvedValue(200000000000000000000n),
    lastBlockTime: vi.fn().mockResolvedValue(1700000000n),
    nextHalvingBlock: vi.fn().mockResolvedValue(10080n),
    totalMineCountOfBlock: vi.fn().mockResolvedValue(150n),
    selectedMinerOfBlock: vi.fn().mockResolvedValue('0x1234567890abcdef1234567890abcdef12345678'),
    balanceOf: vi.fn().mockResolvedValue(500000000000000000000n),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    interface: { getEvent: vi.fn() }
  }
  const mockProvider = {
    getBalance: vi.fn().mockResolvedValue(1000000000000000000n),
    destroy: vi.fn()
  }
  return {
    JsonRpcProvider: vi.fn(() => mockProvider),
    Contract: vi.fn(() => mockContract),
    formatEther: vi.fn((val: bigint) => (Number(val) / 1e18).toString()),
    formatUnits: vi.fn((val: bigint, decimals: number) => (Number(val) / 10 ** decimals).toString())
  }
})

describe('ChainService', () => {
  let service: ChainService

  beforeEach(() => {
    service = new ChainService('https://eth.llamarpc.com')
  })

  it('should get network stats', async () => {
    const stats = await service.getNetworkStats()
    expect(stats.currentBlock).toBe(42)
    expect(stats.miningReward).toBe('200')
    expect(stats.nextHalvingBlock).toBe(10080)
  })

  it('should get ETHC balance', async () => {
    const balance = await service.getEthcBalance('0xabc')
    expect(balance).toBe('500')
  })

  it('should get ETH balance', async () => {
    const balance = await service.getEthBalance('0xabc')
    expect(balance).toBe('1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/__tests__/chain-service.test.ts`
Expected: FAIL — `chain-service.ts` doesn't exist yet.

- [ ] **Step 3: Implement `src/main/chain-service.ts`**

```ts
import { JsonRpcProvider, Contract, formatEther, formatUnits } from 'ethers'
import { ETHCOIN_CONTRACT_ADDRESS, ETHCOIN_ABI } from '../shared/constants'
import type { NetworkStats } from '../shared/types'

export class ChainService {
  private provider: JsonRpcProvider
  private contract: Contract

  constructor(rpcUrl: string) {
    this.provider = new JsonRpcProvider(rpcUrl)
    this.contract = new Contract(ETHCOIN_CONTRACT_ADDRESS, ETHCOIN_ABI, this.provider)
  }

  getContract(): Contract {
    return this.contract
  }

  getProvider(): JsonRpcProvider {
    return this.provider
  }

  async getNetworkStats(): Promise<NetworkStats> {
    const [currentBlock, miningReward, lastBlockTime, nextHalvingBlock] =
      await Promise.all([
        this.contract.blockNumber(),
        this.contract.miningReward(),
        this.contract.lastBlockTime(),
        this.contract.nextHalvingBlock()
      ])

    const totalTicketsInBlock = await this.contract.totalMineCountOfBlock(currentBlock)

    return {
      currentBlock: Number(currentBlock),
      miningReward: formatEther(miningReward),
      totalTicketsInBlock: Number(totalTicketsInBlock),
      nextHalvingBlock: Number(nextHalvingBlock),
      lastBlockTime: Number(lastBlockTime)
    }
  }

  async getEthBalance(address: string): Promise<string> {
    const balance = await this.provider.getBalance(address)
    return formatEther(balance)
  }

  async getEthcBalance(address: string): Promise<string> {
    const balance = await this.contract.balanceOf(address)
    return formatEther(balance)
  }

  onNewBlock(callback: (blockNumber: number) => void): void {
    this.contract.on('NewETHCBlock', (blockNumber: bigint) => {
      callback(Number(blockNumber))
    })
  }

  onMinerSelected(callback: (blockNumber: number, miner: string, reward: string) => void): void {
    this.contract.on('MinerSelected', (blockNumber: bigint, miner: string, reward: bigint) => {
      callback(Number(blockNumber), miner, formatEther(reward))
    })
  }

  destroy(): void {
    this.contract.removeAllListeners()
    this.provider.destroy()
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/main/__tests__/chain-service.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/chain-service.ts src/main/__tests__/chain-service.test.ts
git commit -m "feat: add ChainService for contract interaction"
```

---

### Task 4: WalletManager — wallet creation, import, encryption

**Files:**
- Create: `src/main/wallet-manager.ts`
- Create: `src/main/__tests__/wallet-manager.test.ts`

- [ ] **Step 1: Write tests for WalletManager**

`src/main/__tests__/wallet-manager.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WalletManager } from '../wallet-manager'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('WalletManager', () => {
  let manager: WalletManager
  let testDir: string

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethcoin-test-'))
    manager = new WalletManager(testDir)
  })

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true })
  })

  it('should report no wallet exists initially', () => {
    const status = manager.getStatus()
    expect(status.exists).toBe(false)
    expect(status.unlocked).toBe(false)
    expect(status.address).toBeNull()
  })

  it('should create a new wallet', async () => {
    const address = await manager.create('testpassword123')
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    const status = manager.getStatus()
    expect(status.exists).toBe(true)
    expect(status.unlocked).toBe(true)
    expect(status.address).toBe(address)
  })

  it('should lock and unlock wallet', async () => {
    await manager.create('testpassword123')
    manager.lock()
    expect(manager.getStatus().unlocked).toBe(false)

    const unlocked = await manager.unlock('testpassword123')
    expect(unlocked).toBe(true)
    expect(manager.getStatus().unlocked).toBe(true)
  })

  it('should reject wrong password on unlock', async () => {
    await manager.create('testpassword123')
    manager.lock()
    const unlocked = await manager.unlock('wrongpassword')
    expect(unlocked).toBe(false)
  })

  it('should import wallet from private key', async () => {
    // Use a known test private key
    const testKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    const address = await manager.importFromKey(testKey, 'password')
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(manager.getStatus().unlocked).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/__tests__/wallet-manager.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement `src/main/wallet-manager.ts`**

```ts
import { Wallet } from 'ethers'
import fs from 'fs'
import path from 'path'
import type { WalletStatus } from '../shared/types'

const WALLET_FILE = 'wallet.json'

export class WalletManager {
  private dataDir: string
  private wallet: Wallet | null = null

  constructor(dataDir: string) {
    this.dataDir = dataDir
  }

  private get walletPath(): string {
    return path.join(this.dataDir, WALLET_FILE)
  }

  private get walletExists(): boolean {
    return fs.existsSync(this.walletPath)
  }

  getStatus(): WalletStatus {
    return {
      exists: this.walletExists,
      unlocked: this.wallet !== null,
      address: this.wallet?.address ?? null
    }
  }

  getWallet(): Wallet | null {
    return this.wallet
  }

  async create(password: string): Promise<string> {
    const wallet = Wallet.createRandom()
    const encrypted = await wallet.encrypt(password)
    fs.writeFileSync(this.walletPath, encrypted, 'utf-8')
    this.wallet = wallet
    return wallet.address
  }

  async importFromKey(privateKey: string, password: string): Promise<string> {
    const wallet = new Wallet(privateKey)
    const encrypted = await wallet.encrypt(password)
    fs.writeFileSync(this.walletPath, encrypted, 'utf-8')
    this.wallet = wallet
    return wallet.address
  }

  async importFromMnemonic(mnemonic: string, password: string): Promise<string> {
    const wallet = Wallet.fromPhrase(mnemonic)
    const encrypted = await wallet.encrypt(password)
    fs.writeFileSync(this.walletPath, encrypted, 'utf-8')
    this.wallet = wallet
    return wallet.address
  }

  async unlock(password: string): Promise<boolean> {
    if (!this.walletExists) return false
    try {
      const encrypted = fs.readFileSync(this.walletPath, 'utf-8')
      this.wallet = await Wallet.fromEncryptedJson(encrypted, password)
      return true
    } catch {
      return false
    }
  }

  lock(): void {
    this.wallet = null
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/main/__tests__/wallet-manager.test.ts`
Expected: PASS (note: `encrypt` is slow ~3s per call — this is expected).

- [ ] **Step 5: Commit**

```bash
git add src/main/wallet-manager.ts src/main/__tests__/wallet-manager.test.ts
git commit -m "feat: add WalletManager with create, import, and encrypted storage"
```

---

### Task 5: MiningEngine — automatic mining loop

**Files:**
- Create: `src/main/mining-engine.ts`
- Create: `src/main/__tests__/mining-engine.test.ts`

- [ ] **Step 1: Write tests for MiningEngine**

`src/main/__tests__/mining-engine.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MiningEngine } from '../mining-engine'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('MiningEngine', () => {
  let engine: MiningEngine
  let mockContract: any
  let mockSigner: any
  let testDir: string

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethcoin-mining-test-'))
    mockContract = {
      on: vi.fn(),
      removeAllListeners: vi.fn(),
      connect: vi.fn(),
      blockNumber: vi.fn().mockResolvedValue(42n)
    }
    const mockTxResponse = {
      hash: '0xabc123',
      wait: vi.fn().mockResolvedValue({ status: 1 })
    }
    const mockConnected = {
      mine: vi.fn().mockResolvedValue(mockTxResponse)
    }
    mockContract.connect.mockReturnValue(mockConnected)
    mockSigner = { address: '0x1234' }
    engine = new MiningEngine(mockContract, mockSigner, testDir)
  })

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true })
  })

  it('should not be running initially', () => {
    expect(engine.isRunning()).toBe(false)
  })

  it('should mine a block', async () => {
    const result = await engine.mineOnce(5)
    expect(mockContract.connect).toHaveBeenCalledWith(mockSigner)
    expect(mockContract.connect(mockSigner).mine).toHaveBeenCalledWith(5)
    expect(result.txHash).toBe('0xabc123')
    expect(result.blockNumber).toBe(42)
    expect(result.mineCount).toBe(5)
    expect(result.won).toBe(false) // not yet concluded
  })

  it('should persist history to disk', async () => {
    await engine.mineOnce(5)
    const historyFile = path.join(testDir, 'history.json')
    expect(fs.existsSync(historyFile)).toBe(true)
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'))
    expect(history).toHaveLength(1)
    expect(history[0].blockNumber).toBe(42)
  })

  it('should start and stop mining loop', () => {
    engine.start(10)
    expect(engine.isRunning()).toBe(true)
    engine.stop()
    expect(engine.isRunning()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/main/__tests__/mining-engine.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/main/mining-engine.ts`**

```ts
import { Contract, Wallet, formatEther } from 'ethers'
import fs from 'fs'
import path from 'path'
import type { MiningResult, MiningStatus } from '../shared/types'

type StatusCallback = (status: MiningStatus) => void

export class MiningEngine {
  private contract: Contract
  private signer: Wallet
  private dataDir: string
  private running = false
  private mineCount = 1
  private statusCallback: StatusCallback | null = null
  private resultHistory: MiningResult[] = []
  private pendingTx: string | null = null

  constructor(contract: Contract, signer: Wallet, dataDir: string) {
    this.contract = contract
    this.signer = signer
    this.dataDir = dataDir
    this.loadHistory()
  }

  private get historyPath(): string {
    return path.join(this.dataDir, 'history.json')
  }

  private loadHistory(): void {
    try {
      const data = fs.readFileSync(this.historyPath, 'utf-8')
      this.resultHistory = JSON.parse(data)
    } catch {
      this.resultHistory = []
    }
  }

  private saveHistory(): void {
    fs.writeFileSync(this.historyPath, JSON.stringify(this.resultHistory, null, 2))
  }

  isRunning(): boolean {
    return this.running
  }

  onStatus(callback: StatusCallback): void {
    this.statusCallback = callback
  }

  getHistory(): MiningResult[] {
    return [...this.resultHistory]
  }

  async mineOnce(mineCount: number): Promise<MiningResult> {
    const connectedContract = this.contract.connect(this.signer) as any
    const currentBlock = Number(await this.contract.blockNumber())

    this.pendingTx = null
    this.emitStatus(currentBlock)

    const tx = await connectedContract.mine(mineCount)
    this.pendingTx = tx.hash
    this.emitStatus(currentBlock)

    await tx.wait()
    this.pendingTx = null

    // Don't check winner immediately — the block hasn't concluded yet.
    // The block concludes when the *next* block's first mine() triggers _concludeBlock().
    // We record the entry as "pending" and update it via MinerSelected event listener.
    const result: MiningResult = {
      blockNumber: currentBlock,
      txHash: tx.hash,
      mineCount,
      won: false,
      reward: null,
      timestamp: Date.now()
    }

    this.resultHistory.unshift(result)
    if (this.resultHistory.length > 100) this.resultHistory.pop()
    this.saveHistory()

    this.emitStatus(currentBlock)
    return result
  }

  start(mineCount: number): void {
    this.mineCount = mineCount
    this.running = true
    this.listenForBlocks()
    this.listenForWinners()
  }

  stop(): void {
    this.running = false
    this.contract.removeAllListeners('NewETHCBlock')
    this.contract.removeAllListeners('MinerSelected')
  }

  private listenForBlocks(): void {
    this.contract.on('NewETHCBlock', async (blockNumber: bigint) => {
      if (!this.running) return
      try {
        await this.mineOnce(this.mineCount)
      } catch (error) {
        console.error('Mining failed for block', Number(blockNumber), error)
      }
    })
  }

  private listenForWinners(): void {
    this.contract.on('MinerSelected', (blockNumber: bigint, selectedMiner: string, reward: bigint) => {
      const bn = Number(blockNumber)
      const entry = this.resultHistory.find(r => r.blockNumber === bn)
      if (!entry) return

      const won = selectedMiner.toLowerCase() === this.signer.address.toLowerCase()
      entry.won = won
      entry.reward = won ? formatEther(reward) : null
      this.saveHistory()
      this.emitStatus(bn)
    })
  }

  private emitStatus(currentBlock: number): void {
    if (!this.statusCallback) return
    this.statusCallback({
      running: this.running,
      mineCount: this.mineCount,
      currentBlock,
      lastBlockTime: Date.now(),
      pendingTx: this.pendingTx,
      lastResult: this.resultHistory[0] ?? null
    })
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/main/__tests__/mining-engine.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/mining-engine.ts src/main/__tests__/mining-engine.test.ts
git commit -m "feat: add MiningEngine with block listener and mine loop"
```

---

### Task 6: IPC handlers — bridge main process to renderer

**Files:**
- Create: `src/main/ipc.ts`
- Modify: `src/main/index.ts` — integrate all services

- [ ] **Step 1: Create `src/main/ipc.ts`**

```ts
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
```

- [ ] **Step 2: Update `src/main/index.ts` to wire everything together**

Replace the full file:

```ts
import { app, BrowserWindow } from 'electron'
import path from 'path'
import { WalletManager } from './wallet-manager'
import { registerIpcHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const dataDir = app.getPath('userData')
  const walletManager = new WalletManager(dataDir)

  registerIpcHandlers(walletManager, dataDir, () => mainWindow)
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
```

- [ ] **Step 3: Verify app still starts**

Run: `npm run dev`
Expected: Electron window opens without errors.

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc.ts src/main/index.ts
git commit -m "feat: add IPC handlers bridging main process services to renderer"
```

---

## Chunk 3: Renderer UI Components

### Task 7: Type declarations and IPC hook for renderer

**Files:**
- Create: `src/renderer/env.d.ts`
- Create: `src/renderer/hooks/useIpc.ts`

- [ ] **Step 1: Create `src/renderer/env.d.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/renderer/hooks/useIpc.ts`**

```ts
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
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/env.d.ts src/renderer/hooks/
git commit -m "feat: add renderer type declarations and IPC hooks"
```

---

### Task 8: WalletSetup component — first-run experience

**Files:**
- Create: `src/renderer/components/WalletSetup.tsx`

- [ ] **Step 1: Create `src/renderer/components/WalletSetup.tsx`**

```tsx
import { useState } from 'react'

interface Props {
  walletExists: boolean
  onCreate: (password: string) => Promise<string>
  onImport: (key: string, password: string) => Promise<string>
  onUnlock: (password: string) => Promise<boolean>
}

export default function WalletSetup({ walletExists, onCreate, onImport, onUnlock }: Props) {
  const [mode, setMode] = useState<'unlock' | 'create' | 'import'>(walletExists ? 'unlock' : 'create')
  const [password, setPassword] = useState('')
  const [importKey, setImportKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUnlock = async () => {
    setLoading(true)
    setError('')
    const success = await onUnlock(password)
    if (!success) setError('Wrong password')
    setLoading(false)
  }

  const handleCreate = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')
    await onCreate(password)
    setLoading(false)
  }

  const handleImport = async () => {
    if (!importKey.trim()) {
      setError('Enter a private key or mnemonic phrase')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError('')
    await onImport(importKey.trim(), password)
    setLoading(false)
  }

  return (
    <div className="wallet-setup">
      <h1>Ethcoin Miner</h1>
      <p className="subtitle">Set up your wallet to start mining</p>

      {walletExists ? (
        <div className="setup-form">
          <h2>Unlock Wallet</h2>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          />
          <button onClick={handleUnlock} disabled={loading}>
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
          <p className="link" onClick={() => { setMode('import'); }}>
            Import a different wallet
          </p>
        </div>
      ) : (
        <div className="setup-tabs">
          <div className="tabs">
            <button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>
              Create New
            </button>
            <button className={mode === 'import' ? 'active' : ''} onClick={() => setMode('import')}>
              Import Existing
            </button>
          </div>

          {mode === 'create' && (
            <div className="setup-form">
              <input
                type="password"
                placeholder="Set a password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button onClick={handleCreate} disabled={loading}>
                {loading ? 'Creating...' : 'Create Wallet'}
              </button>
            </div>
          )}

          {mode === 'import' && (
            <div className="setup-form">
              <textarea
                placeholder="Private key or mnemonic phrase"
                value={importKey}
                onChange={(e) => setImportKey(e.target.value)}
                rows={3}
              />
              <input
                type="password"
                placeholder="Set a password (min 8 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button onClick={handleImport} disabled={loading}>
                {loading ? 'Importing...' : 'Import Wallet'}
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/components/WalletSetup.tsx
git commit -m "feat: add WalletSetup component for first-run wallet creation"
```

---

### Task 9: Dashboard components — MiningStatus, WalletInfo, MiningHistory, NetworkStats

**Files:**
- Create: `src/renderer/components/MiningStatus.tsx`
- Create: `src/renderer/components/WalletInfo.tsx`
- Create: `src/renderer/components/MiningHistory.tsx`
- Create: `src/renderer/components/NetworkStats.tsx`

- [ ] **Step 1: Create `src/renderer/components/MiningStatus.tsx`**

```tsx
import { useState } from 'react'
import type { MiningStatus as MiningStatusType } from '../../shared/types'
import { MIN_MINE_COUNT, MAX_MINE_COUNT } from '../../shared/constants'

interface Props {
  status: MiningStatusType | null
  onStart: (mineCount: number) => void
  onStop: () => void
}

export default function MiningStatus({ status, onStart, onStop }: Props) {
  const [mineCount, setMineCount] = useState(1)
  const running = status?.running ?? false

  return (
    <div className="panel mining-status">
      <h2>Mining</h2>

      <div className="status-indicator">
        <span className={`dot ${running ? 'active' : 'inactive'}`} />
        <span>{running ? 'Mining' : 'Stopped'}</span>
      </div>

      {status && (
        <div className="stats">
          <div className="stat">
            <span className="label">Block</span>
            <span className="value">#{status.currentBlock}</span>
          </div>
          {status.pendingTx && (
            <div className="stat">
              <span className="label">Pending TX</span>
              <span className="value tx">{status.pendingTx.slice(0, 10)}...</span>
            </div>
          )}
          {status.lastResult && (
            <div className="stat">
              <span className="label">Last Result</span>
              <span className={`value ${status.lastResult.won ? 'won' : 'lost'}`}>
                {status.lastResult.won ? 'WON!' : 'Not selected'}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mine-count-control">
        <label>Tickets per block: {mineCount}</label>
        <input
          type="range"
          min={MIN_MINE_COUNT}
          max={MAX_MINE_COUNT}
          value={mineCount}
          onChange={(e) => setMineCount(Number(e.target.value))}
          disabled={running}
        />
      </div>

      <button
        className={running ? 'btn-stop' : 'btn-start'}
        onClick={() => running ? onStop() : onStart(mineCount)}
      >
        {running ? 'Stop Mining' : 'Start Mining'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/renderer/components/WalletInfo.tsx`**

```tsx
import type { Balances } from '../../shared/types'

interface Props {
  address: string
  balances: Balances
}

export default function WalletInfo({ address, balances }: Props) {
  return (
    <div className="panel wallet-info">
      <h2>Wallet</h2>
      <div className="address">{address.slice(0, 6)}...{address.slice(-4)}</div>
      <div className="balances">
        <div className="balance">
          <span className="label">ETH (gas)</span>
          <span className="value">{parseFloat(balances.eth).toFixed(4)}</span>
        </div>
        <div className="balance">
          <span className="label">ETHC</span>
          <span className="value">{parseFloat(balances.ethc).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/renderer/components/MiningHistory.tsx`**

```tsx
import type { MiningHistoryEntry } from '../../shared/types'

interface Props {
  history: MiningHistoryEntry[]
}

export default function MiningHistory({ history }: Props) {
  return (
    <div className="panel mining-history">
      <h2>Mining History</h2>
      {history.length === 0 ? (
        <p className="empty">No mining activity yet</p>
      ) : (
        <div className="history-list">
          {history.map((entry) => (
            <div key={entry.txHash} className={`history-entry ${entry.won ? 'won' : ''}`}>
              <span className="block">#{entry.blockNumber}</span>
              <span className="tickets">{entry.mineCount} tickets</span>
              <span className={`result ${entry.won ? 'won' : 'lost'}`}>
                {entry.won ? `Won ${entry.reward} ETHC` : 'Not selected'}
              </span>
              <span className="time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `src/renderer/components/NetworkStats.tsx`**

```tsx
import type { NetworkStats as NetworkStatsType } from '../../shared/types'

interface Props {
  stats: NetworkStatsType | null
}

export default function NetworkStats({ stats }: Props) {
  if (!stats) return <div className="panel network-stats"><h2>Network</h2><p>Loading...</p></div>

  const blocksToHalving = stats.nextHalvingBlock - stats.currentBlock

  return (
    <div className="panel network-stats">
      <h2>Network</h2>
      <div className="stats">
        <div className="stat">
          <span className="label">Mining Reward</span>
          <span className="value">{parseFloat(stats.miningReward).toFixed(0)} ETHC</span>
        </div>
        <div className="stat">
          <span className="label">Current Block</span>
          <span className="value">#{stats.currentBlock}</span>
        </div>
        <div className="stat">
          <span className="label">Tickets in Block</span>
          <span className="value">{stats.totalTicketsInBlock}</span>
        </div>
        <div className="stat">
          <span className="label">Next Halving</span>
          <span className="value">{blocksToHalving} blocks</span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/
git commit -m "feat: add dashboard components — MiningStatus, WalletInfo, MiningHistory, NetworkStats"
```

---

### Task 10: App shell — wire components together with routing

**Files:**
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/styles/global.css`

- [ ] **Step 1: Update `src/renderer/App.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { useWallet, useMining, useBalances, useNetworkStats } from './hooks/useIpc'
import WalletSetup from './components/WalletSetup'
import MiningStatus from './components/MiningStatus'
import WalletInfo from './components/WalletInfo'
import MiningHistory from './components/MiningHistory'
import NetworkStats from './components/NetworkStats'
import type { MiningHistoryEntry } from '../shared/types'

export default function App() {
  const { status: walletStatus, create, importWallet, unlock } = useWallet()
  const { miningStatus, start, stop } = useMining()
  const { balances, refresh: refreshBalances } = useBalances()
  const { stats } = useNetworkStats()
  const [history, setHistory] = useState<MiningHistoryEntry[]>([])

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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Ethcoin Miner</h1>
        <span className="address">{walletStatus.address?.slice(0, 6)}...{walletStatus.address?.slice(-4)}</span>
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
```

- [ ] **Step 2: Update `src/renderer/styles/global.css`**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0a0a0f;
  color: #e0e0e0;
}

/* App Layout */
.app { padding: 20px; max-width: 1100px; margin: 0 auto; }

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #1e1e2e;
}

.app-header h1 { font-size: 22px; color: #ffffff; }
.app-header .address { font-size: 13px; color: #888; font-family: monospace; }

.dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Panels */
.panel {
  background: #12121a;
  border: 1px solid #1e1e2e;
  border-radius: 12px;
  padding: 20px;
}

.panel h2 { font-size: 15px; color: #888; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }

/* Status Indicator */
.status-indicator { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 18px; }
.dot { width: 10px; height: 10px; border-radius: 50%; }
.dot.active { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
.dot.inactive { background: #666; }

/* Stats */
.stats { display: flex; flex-direction: column; gap: 10px; }
.stat { display: flex; justify-content: space-between; }
.stat .label { color: #888; font-size: 13px; }
.stat .value { font-family: monospace; font-size: 14px; }
.value.won { color: #22c55e; font-weight: bold; }
.value.lost { color: #888; }
.value.tx { color: #60a5fa; }

/* Mine Count Slider */
.mine-count-control { margin: 16px 0; }
.mine-count-control label { display: block; margin-bottom: 8px; font-size: 13px; color: #aaa; }
.mine-count-control input[type="range"] { width: 100%; }

/* Buttons */
button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  width: 100%;
  transition: opacity 0.15s;
}
button:hover { opacity: 0.85; }
button:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-start { background: #22c55e; color: #000; }
.btn-stop { background: #ef4444; color: #fff; }

/* Wallet Info */
.wallet-info .address { font-family: monospace; color: #60a5fa; margin-bottom: 12px; font-size: 14px; }
.balances { display: flex; flex-direction: column; gap: 8px; }
.balance { display: flex; justify-content: space-between; }
.balance .label { color: #888; font-size: 13px; }
.balance .value { font-family: monospace; font-size: 16px; }

/* Mining History */
.mining-history { grid-column: 1 / -1; }
.empty { color: #555; font-size: 14px; }
.history-list { display: flex; flex-direction: column; gap: 6px; max-height: 250px; overflow-y: auto; }
.history-entry {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 12px; background: #1a1a25; border-radius: 8px; font-size: 13px;
}
.history-entry.won { border-left: 3px solid #22c55e; }
.history-entry .block { font-family: monospace; color: #aaa; }
.history-entry .tickets { color: #888; }
.history-entry .result.won { color: #22c55e; font-weight: bold; }
.history-entry .result.lost { color: #555; }
.history-entry .time { color: #555; font-size: 12px; }

/* Wallet Setup */
.wallet-setup {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; padding: 40px; text-align: center;
}
.wallet-setup h1 { font-size: 32px; margin-bottom: 8px; }
.wallet-setup .subtitle { color: #888; margin-bottom: 32px; }

.setup-form { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 380px; }
.setup-form input, .setup-form textarea {
  padding: 12px; border: 1px solid #2a2a3a; border-radius: 8px;
  background: #12121a; color: #e0e0e0; font-size: 14px; resize: none;
}
.setup-form input:focus, .setup-form textarea:focus { border-color: #60a5fa; outline: none; }
.setup-form button { background: #60a5fa; color: #000; }

.tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.tabs button { background: #1a1a25; color: #888; flex: 1; }
.tabs button.active { background: #60a5fa; color: #000; }
.setup-tabs { width: 100%; max-width: 380px; }

.link { color: #60a5fa; cursor: pointer; font-size: 13px; margin-top: 8px; }
.link:hover { text-decoration: underline; }
.error { color: #ef4444; font-size: 13px; margin-top: 12px; }
```

- [ ] **Step 3: Verify the app builds and renders**

Run: `npm run dev`
Expected: App shows wallet setup screen with create/import tabs.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/App.tsx src/renderer/styles/global.css
git commit -m "feat: wire up App shell with dashboard layout and styling"
```

---

## Chunk 4: Integration & Packaging

### Task 11: End-to-end integration test

- [ ] **Step 1: Manual end-to-end test**

Run: `npm run dev`
Test sequence:
1. App shows wallet setup screen
2. Click "Create New", enter password → wallet created, dashboard shows
3. Dashboard displays all 4 panels
4. ETH and ETHC balances show (may be 0 for new wallet)
5. Network stats load from mainnet
6. Click "Start Mining" → mining status changes to active
7. (On new Ethcoin block) transaction sent, result appears in history

- [ ] **Step 2: Commit any integration fixes**

```bash
git add -u && git commit -m "fix: integration test fixes"
```

---

### Task 12: Electron packaging setup

- [ ] **Step 1: Verify build**

Run: `npm run build`
Expected: `out/` directory created with compiled main, preload, and renderer.

- [ ] **Step 2: Test packaging**

Run: `npm run package`
Expected: `dist/` directory created with platform-specific installer (`.dmg` on macOS).

- [ ] **Step 3: Commit final packaging config tweaks if needed**

```bash
git add -u && git commit -m "chore: finalize build and packaging config"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding | `package.json`, configs, entry files |
| 2 | Shared types & constants | `src/shared/types.ts`, `constants.ts` |
| 3 | ChainService | `src/main/chain-service.ts` |
| 4 | WalletManager | `src/main/wallet-manager.ts` |
| 5 | MiningEngine | `src/main/mining-engine.ts` |
| 6 | IPC handlers | `src/main/ipc.ts` |
| 7 | Renderer types & hooks | `src/renderer/env.d.ts`, `hooks/useIpc.ts` |
| 8 | WalletSetup component | `src/renderer/components/WalletSetup.tsx` |
| 9 | Dashboard components | 4 panel components |
| 10 | App shell & styling | `App.tsx`, `global.css` |
| 11 | Integration & polling | E2E test, balance polling |
| 12 | Packaging | Build verification |
