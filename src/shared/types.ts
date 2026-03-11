export interface WalletStatus {
  exists: boolean
  unlocked: boolean
  address: string | null
}

export interface Balances {
  eth: string
  ethc: string
}

export interface MiningStatus {
  running: boolean
  mineCount: number
  currentBlock: number
  lastBlockTime: number
  pendingTx: string | null
  lastResult: MiningResult | null
}

export interface MiningResult {
  blockNumber: number
  txHash: string
  mineCount: number
  won: boolean
  reward: string | null
  timestamp: number
}

export interface NetworkStats {
  currentBlock: number
  miningReward: string
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
