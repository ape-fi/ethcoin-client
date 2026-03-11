export const ETHCOIN_CONTRACT_ADDRESS = '0x0cfCe463B72476808662fAD25817b2883ECa9a6D'

export const DEFAULT_RPC_URL = 'https://eth.llamarpc.com'

export const MAX_MINE_COUNT = 200
export const MIN_MINE_COUNT = 1
export const DEFAULT_MINE_COUNT = 1

export const ETHCOIN_ABI = [
  // Mining
  'function mine(uint256 mineCount)',
  'function blockNumber() view returns (uint256)',
  'function lastBlockTime() view returns (uint256)',
  'function miningReward() view returns (uint256)',
  'function halvingInterval() view returns (uint256)',
  'function lastHalvingBlock() view returns (uint256)',
  'function nextHalvingBlock() view returns (uint256)',
  'function totalMineCountOfBlock(uint256 _blockNumber) view returns (uint256)',
  'function selectedMinerOfBlock(uint256 _blockNumber) view returns (address)',
  'function mineBatchOfBlock(uint256 _blockNumber) view returns (tuple(address miner, uint256 startIdx, uint256 mineCount)[])',

  // ERC20
  'function balanceOf(address account) view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',

  // Events
  'event Mine(uint256 indexed blockNumber, address indexed miner, uint256 mineCount)',
  'event NewETHCBlock(uint256 indexed blockNumber)',
  'event MinerSelected(uint256 blockNumber, address selectedMiner, uint256 miningReward)'
] as const
