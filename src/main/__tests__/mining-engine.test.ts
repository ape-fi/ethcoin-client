import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MiningEngine } from '../mining-engine'
import fs from 'fs'
import path from 'path'
import os from 'os'

describe('MiningEngine', () => {
  let engine: MiningEngine
  let mockContract: any
  let mockSigner: any
  let testDir: string

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ethcoin-mining-test-'))
    mockContract = {
      connect: vi.fn(),
      blockNumber: vi.fn().mockResolvedValue(42n),
      selectedMinerOfBlock: vi.fn().mockResolvedValue('0x0000000000000000000000000000000000000000')
    }
    const mockTxResponse = {
      hash: '0xabc123',
      wait: vi.fn().mockResolvedValue({ status: 1 })
    }
    const mockConnected = {
      mine: vi.fn().mockResolvedValue(mockTxResponse)
    }
    mockContract.connect.mockReturnValue(mockConnected)
    mockSigner = { address: '0x1234' }
    engine = new MiningEngine(mockContract, mockSigner, testDir)
  })

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true })
  })

  it('should not be running initially', () => {
    expect(engine.isRunning()).toBe(false)
  })

  it('should mine a block', async () => {
    const result = await engine.mineOnce(5)
    expect(mockContract.connect).toHaveBeenCalledWith(mockSigner)
    expect(mockContract.connect(mockSigner).mine).toHaveBeenCalledWith(5)
    expect(result.txHash).toBe('0xabc123')
    expect(result.blockNumber).toBe(42)
    expect(result.mineCount).toBe(5)
    expect(result.won).toBe(false) // not yet concluded
  })

  it('should persist history to disk', async () => {
    await engine.mineOnce(5)
    const historyFile = path.join(testDir, 'history.json')
    expect(fs.existsSync(historyFile)).toBe(true)
    const history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'))
    expect(history).toHaveLength(1)
    expect(history[0].blockNumber).toBe(42)
  })

  it('should start and stop mining loop', () => {
    engine.start(10)
    expect(engine.isRunning()).toBe(true)
    engine.stop()
    expect(engine.isRunning()).toBe(false)
  })
})
