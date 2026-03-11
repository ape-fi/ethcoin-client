# Ethcoin Miner — Desktop App Design

## Overview

Electron desktop app that automatically mines Ethcoin on Ethereum mainnet. Users download the app, set up a wallet, configure their ticket count, and the app mines once per Ethcoin block (~1 minute intervals).

## Contract Reference

- **Proxy implementation**: `0x0cfce463b72476808662fad25817b2883eca9a6d`
- **Key function**: `mine(uint256 mineCount)` — submit 1-200 tickets per call
- **Block interval**: ~1 minute, concludes via `_concludeBlock()`
- **Winner selection**: Beacon root randomness (EIP-4788)
- **Reward**: Starts at 200 ETHC, halves every 10,080 blocks (~1 week)
- **Events**: `Mine`, `NewETHCBlock`, `MinerSelected`

## Tech Stack

- **Electron** (desktop shell)
- **React + TypeScript** (renderer UI)
- **ethers.js v6** (Ethereum interaction)
- **Mainnet only** (no testnet — contract not deployed there)

## Architecture

### Three-layer design

```
Renderer (React UI)  ⇄  IPC  ⇄  Main Process (Node.js)  →  Ethereum Mainnet
```

### Main Process Services

**MiningEngine** (`mining-engine.ts`)
- Listens for `NewETHCBlock` events on the contract
- Calls `mine(mineCount)` once per new Ethcoin block
- Tracks transaction status (pending/confirmed/failed)
- User-configurable `mineCount` (1-200)

**WalletManager** (`wallet-manager.ts`)
- Generate new wallet or import via private key / mnemonic
- Encrypt keystore with AES-256, password-protected
- Stored in Electron's `userData` directory
- Unlock with password on app start

**ChainService** (`chain-service.ts`)
- ethers.js `JsonRpcProvider` for Ethereum mainnet
- Contract instance with Ethcoin ABI
- Event subscriptions (NewETHCBlock, MinerSelected, Mine)
- Default public RPC, user can configure their own endpoint

### Renderer Components

**WalletSetup** — First-run screen: generate or import wallet, set password

**MiningStatus** — Running/stopped toggle, current Ethcoin block number, time until next block, mineCount slider

**WalletInfo** — ETH balance (for gas), ETHC balance (rewards)

**MiningHistory** — List of blocks participated in, win/loss per block

**NetworkStats** — Current mining reward, total miners in current block, halving countdown

### IPC Bridge

Electron IPC channels between renderer and main process:
- `mining:start` / `mining:stop` — control mining loop
- `mining:status` — stream mining state updates to renderer
- `wallet:create` / `wallet:import` / `wallet:unlock` — wallet operations
- `wallet:balances` — ETH and ETHC balance updates
- `chain:stats` — network stats (reward, block info, halving)
- `mining:history` — historical mining results

### Mining Loop

1. Listen for `NewETHCBlock` event (or poll `blockNumber` on contract)
2. Call `mine(mineCount)` with user's configured ticket count
3. Wait for transaction confirmation
4. Listen for `MinerSelected` event to check if user won
5. Update UI with result
6. Repeat on next block

### Data Storage

- **Encrypted keystore**: `{userData}/wallet.json`
- **Mining history**: `{userData}/history.json` (local log of past blocks)
- **Settings**: `{userData}/settings.json` (mineCount, RPC endpoint)

## Project Structure

```
ethcoin-client/
├── package.json
├── tsconfig.json
├── electron-builder.yml
├── src/
│   ├── main/
│   │   ├── index.ts
│   │   ├── ipc.ts
│   │   ├── mining-engine.ts
│   │   ├── wallet-manager.ts
│   │   └── chain-service.ts
│   ├── renderer/
│   │   ├── index.html
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── MiningStatus.tsx
│   │   │   ├── WalletInfo.tsx
│   │   │   ├── MiningHistory.tsx
│   │   │   ├── NetworkStats.tsx
│   │   │   └── WalletSetup.tsx
│   │   ├── hooks/
│   │   │   └── useIpc.ts
│   │   └── styles/
│   │       └── global.css
│   └── shared/
│       ├── types.ts
│       └── constants.ts
└── resources/
```

## Deferred Features

- Gas tracking (total gas spent, cost per block)
- Earnings summary (total ETHC earned, daily/weekly yield estimates)
