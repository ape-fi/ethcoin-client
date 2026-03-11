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
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private lastSeenBlock = -1
  private mining = false

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
    this.lastSeenBlock = -1
    this.startPolling()
  }

  stop(): void {
    this.running = false
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  private startPolling(): void {
    // Poll every 10 seconds for new blocks and winner results
    this.pollTimer = setInterval(() => this.pollCycle(), 10_000)
    // Run immediately
    this.pollCycle()
  }

  private async pollCycle(): Promise<void> {
    if (!this.running) return
    try {
      const currentBlock = Number(await this.contract.blockNumber())

      // Check for winners on previous blocks we participated in
      await this.checkPendingWinners()

      // Detect new block
      if (this.lastSeenBlock === -1) {
        this.lastSeenBlock = currentBlock
        this.emitStatus(currentBlock)
        return
      }

      if (currentBlock > this.lastSeenBlock && !this.mining) {
        this.lastSeenBlock = currentBlock
        this.mining = true
        try {
          await this.mineOnce(this.mineCount)
        } catch (error) {
          console.error('Mining failed for block', currentBlock, error)
        } finally {
          this.mining = false
        }
      }
    } catch (error) {
      console.error('Poll cycle error:', error)
    }
  }

  private async checkPendingWinners(): Promise<void> {
    const pending = this.resultHistory.filter(r => !r.won && r.reward === null)
    for (const entry of pending) {
      try {
        const selectedMiner = await this.contract.selectedMinerOfBlock(entry.blockNumber)
        // Zero address means block hasn't concluded yet
        if (selectedMiner === '0x0000000000000000000000000000000000000000') continue

        const won = selectedMiner.toLowerCase() === this.signer.address.toLowerCase()
        entry.won = won
        if (won) {
          // Read the mining reward that was active for that block
          entry.reward = 'yes'
        } else {
          entry.reward = 'no'
        }
        this.saveHistory()
        this.emitStatus(entry.blockNumber)
      } catch {
        // ignore — will retry next cycle
      }
    }
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
