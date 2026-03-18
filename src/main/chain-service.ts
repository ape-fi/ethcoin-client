import { JsonRpcProvider, Contract, formatEther, Network } from 'ethers'
import { ETHCOIN_CONTRACT_ADDRESS, ETHCOIN_ABI, ETHCOIN_LENS_ADDRESS, ETHCOIN_LENS_ABI, DEFAULT_RPC_URL } from '../shared/constants'
import type { NetworkStats, Balances } from '../shared/types'

export class ChainService {
  private provider: JsonRpcProvider
  private contract: Contract
  private lens: Contract

  private static readonly ETH_MAINNET = Network.from(1)

  constructor(rpcUrl: string) {
    const url = rpcUrl || DEFAULT_RPC_URL
    this.provider = new JsonRpcProvider(url, ChainService.ETH_MAINNET, { staticNetwork: ChainService.ETH_MAINNET })
    this.contract = new Contract(ETHCOIN_CONTRACT_ADDRESS, ETHCOIN_ABI, this.provider)
    this.lens = new Contract(ETHCOIN_LENS_ADDRESS, ETHCOIN_LENS_ABI, this.provider)
  }

  getContract(): Contract {
    return this.contract
  }

  getProvider(): JsonRpcProvider {
    return this.provider
  }

  async getNetworkStats(): Promise<NetworkStats> {
    const stats = await this.lens.getNetworkStats()

    const miningReward = stats[0]
    const blockNumber = Number(stats[1])
    const totalMiningPower = Number(stats[2])
    const totalSupply = stats[3]
    const maxSupply = stats[4]
    const nextHalvingBlock = Number(stats[5])
    const activeBlock = blockNumber + 1

    const supplyPercent = maxSupply > 0n
      ? Number((totalSupply * 1000000n) / maxSupply) / 10000
      : 0

    return {
      currentBlock: activeBlock,
      miningReward: formatEther(miningReward),
      totalTicketsInBlock: totalMiningPower,
      nextHalvingBlock: nextHalvingBlock - activeBlock,
      supplyPercent
    }
  }

  async getUserBalances(address: string): Promise<Balances> {
    const bal = await this.lens.getUserBalance(address)
    return {
      eth: formatEther(bal.ethBalance),
      ethc: formatEther(bal.ethcBalance)
    }
  }

  destroy(): void {
    this.provider.destroy()
  }
}
