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
