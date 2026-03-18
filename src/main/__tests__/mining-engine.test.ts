import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@sentry/electron/main', () => ({
  captureException: vi.fn()
}))

import { MiningEngine } from '../mining-engine'

describe('MiningEngine', () => {
  let engine: MiningEngine
  let mockContract: any
  let mockSigner: any

  beforeEach(() => {
    mockContract = {
      connect: vi.fn(),
      blockNumber: vi.fn().mockResolvedValue(42n),
      lastBlockTime: vi.fn().mockResolvedValue(BigInt(Math.floor(Date.now() / 1000))),
      interface: {
        parseLog: vi.fn().mockReturnValue({ name: 'Mine', args: [43n] })
      }
    }
    const mockTxResponse = {
      hash: '0xabc123',
      wait: vi.fn().mockResolvedValue({
        status: 1,
        logs: [{ topics: ['0x1'], data: '0x' }]
      })
    }
    const mineFn = vi.fn().mockResolvedValue(mockTxResponse) as any
    mineFn.estimateGas = vi.fn().mockResolvedValue(200000n)
    const mockConnected = {
      mine: mineFn
    }
    mockContract.connect.mockReturnValue(mockConnected)
    mockSigner = { address: '0x1234' }
    const mockProvider = {
      getFeeData: vi.fn().mockResolvedValue({ gasPrice: 10000000000n }) // 10 gwei
    }
    engine = new MiningEngine(mockContract, mockSigner, mockProvider as any)
  })

  afterEach(() => {
    engine.stop()
  })

  it('should not be running initially', () => {
    expect(engine.isRunning()).toBe(false)
  })

  it('should mine a block', async () => {
    const result = await engine.mineOnce(5)
    expect(mockContract.connect).toHaveBeenCalledWith(mockSigner)
    expect(mockContract.connect(mockSigner).mine).toHaveBeenCalledWith(5, { gasLimit: 260000n })
    expect(result.txHash).toBe('0xabc123')
    expect(result.blockNumber).toBe(43) // blockNumber() returns 42 (concluded), active = 43
    expect(result.mineCount).toBe(5)
    expect(result.won).toBe(false)
  })

  it('should start and stop mining loop', () => {
    engine.start(10)
    expect(engine.isRunning()).toBe(true)
    engine.stop()
    expect(engine.isRunning()).toBe(false)
  })

  it('should emit status on start', () => {
    const callback = vi.fn()
    engine.onStatus(callback)
    engine.start(10)
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ running: true, mineCount: 10 })
    )
  })
})
