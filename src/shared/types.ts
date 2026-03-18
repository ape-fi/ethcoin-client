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
  gasTooHigh: string | null
  error: string | null
}

export interface MiningResult {
  blockNumber: number
  txHash: string
  mineCount: number
  won: boolean
  gasCostEth?: string | null
  timestamp: number
}

export interface NetworkStats {
  currentBlock: number
  miningReward: string
  totalTicketsInBlock: number
  nextHalvingBlock: number
  supplyPercent: number
}

export interface MiningHistoryEntry {
  blockNumber: number
  mineCount: number
  totalCount: number
  prob: number
  won: boolean | null
  timestamp: number
}

export interface MiningStats {
  blocksMined: number
  totalPower: number
  wins: number
  ethcMined: string
}

export interface Settings {
  mineCount: number
  rpcUrl: string
  maxGasGwei: number
}
