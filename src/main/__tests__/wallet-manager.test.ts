import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WalletManager } from '../wallet-manager'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('WalletManager', () => {
  let manager: WalletManager
  let testDir: string

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethcoin-test-'))
    manager = new WalletManager(testDir)
  })

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true })
  })

  it('should report no wallet exists initially', () => {
    const status = manager.getStatus()
    expect(status.exists).toBe(false)
    expect(status.unlocked).toBe(false)
    expect(status.address).toBeNull()
  })

  it('should create a new wallet', async () => {
    const address = await manager.create('testpassword123')
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    const status = manager.getStatus()
    expect(status.exists).toBe(true)
    expect(status.unlocked).toBe(true)
    expect(status.address).toBe(address)
  })

  it('should lock and unlock wallet', async () => {
    await manager.create('testpassword123')
    manager.lock()
    expect(manager.getStatus().unlocked).toBe(false)

    const unlocked = await manager.unlock('testpassword123')
    expect(unlocked).toBe(true)
    expect(manager.getStatus().unlocked).toBe(true)
  })

  it('should reject wrong password on unlock', async () => {
    await manager.create('testpassword123')
    manager.lock()
    const unlocked = await manager.unlock('wrongpassword')
    expect(unlocked).toBe(false)
  })

  it('should import wallet from private key', async () => {
    // Hardhat/Anvil default test key #0 — well-known public fixture, no real funds
    const testKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
    const address = await manager.importFromKey(testKey, 'password')
    expect(address).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(manager.getStatus().unlocked).toBe(true)
  })
})
