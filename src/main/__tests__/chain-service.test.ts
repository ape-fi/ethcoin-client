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
