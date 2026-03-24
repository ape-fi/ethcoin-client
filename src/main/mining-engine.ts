import { Contract, Wallet, JsonRpcProvider, formatEther } from 'ethers'
import * as Sentry from '@sentry/electron/main'
import type { MiningResult, MiningStatus } from '../shared/types'

type StatusCallback = (status: MiningStatus) => void

export class MiningEngine {
  private contract: Contract
  private signer: Wallet
  private provider: JsonRpcProvider
  private running = false
  private mineCount = 1
  private maxGasGwei = 20
  private statusCallback: StatusCallback | null = null
  private resultHistory: MiningResult[] = []
  private pendingTx: string | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private lastSeenBlock = -1
  private lastMinedBlock = -1
  private mining = false
  private gasTooHigh: string | null = null
  private error: string | null = null

  constructor(contract: Contract, signer: Wallet, provider: JsonRpcProvider) {
    this.contract = contract
    this.signer = signer
    this.provider = provider
  }

  /** contract.blockNumber() returns last concluded block. Active block = that + 1. */
  private async getActiveBlock(): Promise<number> {
    return Number(await this.contract.blockNumber()) + 1
  }

  isRunning(): boolean {
    return this.running
  }

  onStatus(callback: StatusCallback): void {
    this.statusCallback = callback
  }

  async mineOnce(mineCount: number): Promise<MiningResult> {
    const connectedContract = this.contract.connect(this.signer) as any

    const activeBlock = await this.getActiveBlock()
    this.pendingTx = null
    this.emitStatus(activeBlock)

    // Estimate gas and add 30% buffer — mine() gas usage varies
    // depending on whether it triggers a block conclusion
    const estimated = await connectedContract.mine.estimateGas(mineCount)
    const gasLimit = (estimated * 130n) / 100n

    const tx = await connectedContract.mine(mineCount, { gasLimit })
    this.pendingTx = tx.hash
    this.emitStatus(activeBlock)

    // Wait up to 3 minutes for confirmation, then treat as dropped
    const receipt = await Promise.race([
      tx.wait(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Transaction timed out — likely dropped from mempool')), 180_000)
      )
    ])
    this.pendingTx = null

    // Parse the Mine event from receipt to get the exact block we entered
    let enteredBlock = activeBlock
    if (receipt) {
      for (const log of receipt.logs) {
        try {
          const parsed = this.contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          })
          if (parsed?.name === 'Mine') {
            enteredBlock = Number(parsed.args[0])
            break
          }
        } catch { /* not our event */ }
      }
    }

    // Calculate gas cost from receipt
    let gasCostEth: string | null = null
    if (receipt) {
      const gasUsed = receipt.gasUsed ?? 0n
      const effectiveGasPrice = receipt.gasPrice ?? 0n
      gasCostEth = formatEther(gasUsed * effectiveGasPrice)
    }

    const result: MiningResult = {
      blockNumber: enteredBlock,
      txHash: tx.hash,
      mineCount,
      won: false,
      gasCostEth,
      timestamp: Date.now()
    }

    this.resultHistory.unshift(result)
    if (this.resultHistory.length > 100) this.resultHistory.pop()

    this.emitStatus(enteredBlock)
    return result
  }

  setMineCount(mineCount: number): void {
    this.mineCount = mineCount
  }

  setMaxGasGwei(gwei: number): void {
    this.maxGasGwei = gwei
  }

  private async checkGasPrice(): Promise<boolean> {
    const feeData = await this.provider.getFeeData()
    const gasPriceWei = feeData.gasPrice ?? 0n
    const gasPriceGwei = Number(gasPriceWei) / 1e9
    if (gasPriceGwei > this.maxGasGwei) {
      this.gasTooHigh = `Gas too high (${gasPriceGwei.toFixed(1)} > ${this.maxGasGwei} Gwei limit)`
      return false
    }
    this.gasTooHigh = null
    return true
  }

  start(mineCount: number): void {
    this.mineCount = mineCount
    this.running = true
    this.error = null
    this.lastSeenBlock = -1
    this.lastMinedBlock = -1
    this.emitStatus(0)
    this.pollTimer = setInterval(() => this.pollCycle(), 12_000)
    this.pollCycle()
  }

  stop(): void {
    this.running = false
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
    this.emitStatus(this.lastSeenBlock > 0 ? this.lastSeenBlock : 0)
  }

  pause(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  resume(): void {
    if (this.running && !this.pollTimer) {
      this.pollTimer = setInterval(() => this.pollCycle(), 12_000)
    }
  }

  private async pollCycle(): Promise<void> {
    if (!this.running) return
    try {
      const [activeBlock, lastBlockTime] = await Promise.all([
        this.getActiveBlock(),
        this.contract.lastBlockTime().then(Number)
      ])

      // First poll — just record current active block
      if (this.lastSeenBlock === -1) {
        this.lastSeenBlock = activeBlock
        this.emitStatus(activeBlock)
        return
      }

      const isNewBlock = activeBlock > this.lastMinedBlock
      const blockExpired = Math.floor(Date.now() / 1000) > lastBlockTime + 60
      const alreadyMinedThisBlock = this.lastMinedBlock === activeBlock

      if (!this.mining && (isNewBlock || (alreadyMinedThisBlock && blockExpired))) {
        // Check gas price before mining
        const gasOk = await this.checkGasPrice()
        if (!gasOk) {
          this.lastSeenBlock = activeBlock
          this.emitStatus(activeBlock)
          return
        }

        this.lastSeenBlock = activeBlock
        this.mining = true
        try {
          let power = this.mineCount
          if (alreadyMinedThisBlock && blockExpired) {
            // Block expired, we already mined into it. Check if we're the only miner.
            const totalPower = Number(await this.contract.totalMineCountOfBlock(activeBlock))
            const ourEntry = this.resultHistory.find(r => r.blockNumber === activeBlock)
            const ourPower = ourEntry?.mineCount ?? 0
            // Only reduce to 1 if we actually mined and we're the sole miner
            power = (ourPower > 0 && totalPower === ourPower) ? 1 : this.mineCount
          }
          const result = await this.mineOnce(power)
          this.error = null
          this.lastMinedBlock = result.blockNumber
          const newActiveBlock = await this.getActiveBlock()
          this.lastSeenBlock = newActiveBlock
        } catch (error: any) {
          this.pendingTx = null
          const msg = error?.message ?? String(error)
          if (msg.includes('insufficient funds') || msg.includes('INSUFFICIENT_FUNDS')) {
            this.error = 'Insufficient ETH for gas — deposit ETH and restart'
            this.emitStatus(activeBlock)
            this.stop()
            return
          }
          // Transient errors — report to Sentry, will retry next poll
          Sentry.captureException(error)
          this.error = null
          this.emitStatus(activeBlock)
        } finally {
          this.mining = false
        }
      } else {
        this.lastSeenBlock = activeBlock
        this.emitStatus(activeBlock)
      }
    } catch (error) {
      Sentry.captureException(error)
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
      lastResult: this.resultHistory[0] ?? null,
      gasTooHigh: this.gasTooHigh,
      error: this.error
    })
  }
}
