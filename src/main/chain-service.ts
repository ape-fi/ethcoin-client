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
