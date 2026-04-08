export const APP_VERSION = '0.1.9'

export const DISCLAIMER_TEXT = `This software is in beta and may contain bugs. You are solely responsible for your wallet, private keys, and funds. There is no way to recover lost private keys. The developers are not liable for any loss of funds, whether due to software bugs, user error, or any other cause. This is not financial advice. Mining does not guarantee returns.

This app sends anonymous error reports via Sentry to help us fix bugs. No private keys, passwords, or wallet balances are collected — only crash data and app version.`

export const SENTRY_DSN = 'https://8b81fb3e2bf7d7e52c687fe46731315e@o4511064221351936.ingest.us.sentry.io/4511064223973376'

export const DEFAULT_RPC_URL = 'https://ethereum-rpc.publicnode.com'

export const ETHCOIN_CONTRACT_ADDRESS = '0xE957ea0b072910f508dD2009F4acB7238C308E29'
export const ETHCOIN_LENS_ADDRESS = '0x20AD781A301F5Ed73eD2Aa36b48BA7Fa1E7CAa7B'

export const MAX_MINE_COUNT = 200

export const ETHCOIN_ABI = [
  // Mining
  'function mine(uint256 mineCount)',
  'function blockNumber() view returns (uint256)',
  'function lastBlockTime() view returns (uint256)',
  'function totalMineCountOfBlock(uint256 _blockNumber) view returns (uint256)',

  // ERC20
  'function transfer(address to, uint256 amount) returns (bool)',

  // Events
  'event Mine(uint256 indexed blockNumber, address indexed miner, uint256 mineCount)'
] as const

export const ETHCOIN_LENS_ABI = [
  'function getUserBalance(address user) view returns (tuple(uint256 ethBalance, uint256 ethcBalance))',
  'function getNetworkStats() view returns (tuple(uint256 miningReward, uint256 blockNumber, uint256 totalMiningPower, uint256 totalSupply, uint256 maxSupply, uint256 nextHalvingBlock))'
] as const
