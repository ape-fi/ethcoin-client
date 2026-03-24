import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChainService } from '../chain-service'

// Mock ethers
vi.mock('ethers', () => {
  const mockEthcoinContract = {
    blockNumber: vi.fn().mockResolvedValue(42n),
    lastBlockTime: vi.fn().mockResolvedValue(1700000000n),
    totalMineCountOfBlock: vi.fn().mockResolvedValue(150n),
    interface: { getEvent: vi.fn() }
  }
  const mockLensContract = {
    getNetworkStats: vi.fn().mockResolvedValue([
      200000000000000000000n,     // miningReward
      42n,                         // blockNumber
      150n,                        // totalMiningPower
      3810000000000000000000000n,  // totalSupply
      10000000000000000000000000n, // maxSupply
      10080n                       // nextHalvingBlock
    ]),
    getUserBalance: vi.fn().mockResolvedValue({
      ethBalance: 1000000000000000000n,
      ethcBalance: 500000000000000000000n
    })
  }
  const mockProvider = {
    destroy: vi.fn(),
    getFeeData: vi.fn().mockResolvedValue({ gasPrice: 1500000000n, maxFeePerGas: null })
  }
  let contractCallCount = 0
  return {
    JsonRpcProvider: vi.fn(() => mockProvider),
    Contract: vi.fn(() => {
      contractCallCount++
      return contractCallCount % 2 === 1 ? mockEthcoinContract : mockLensContract
    }),
    formatEther: vi.fn((val: bigint) => (Number(val) / 1e18).toString()),
    formatUnits: vi.fn((val: bigint, unit: string) => unit === 'gwei' ? (Number(val) / 1e9).toString() : (Number(val) / 1e18).toString()),
    Network: { from: vi.fn(() => ({ name: 'mainnet', chainId: 1n })) }
  }
})

describe('ChainService', () => {
  let service: ChainService

  beforeEach(() => {
    service = new ChainService('https://eth.llamarpc.com')
  })

  it('should get network stats via lens', async () => {
    const stats = await service.getNetworkStats()
    expect(stats.currentBlock).toBe(43)
    expect(stats.miningReward).toBe('200')
    expect(stats.nextHalvingBlock).toBe(10080 - 43)
    expect(stats.totalTicketsInBlock).toBe(150)
    expect(stats.supplyPercent).toBe(38.1)
    expect(stats.gasPrice).toBe('1.5')
  })

  it('should get user balances via lens', async () => {
    const balances = await service.getUserBalances('0xabc')
    expect(balances.eth).toBe('1')
    expect(balances.ethc).toBe('500')
  })
})
