import { Wallet } from 'ethers'
import fs from 'fs'
import path from 'path'
import type { WalletStatus } from '../shared/types'

const WALLET_FILE = 'wallet.json'

export class WalletManager {
  private dataDir: string
  private wallet: Wallet | null = null

  constructor(dataDir: string) {
    this.dataDir = dataDir
  }

  private get walletPath(): string {
    return path.join(this.dataDir, WALLET_FILE)
  }

  private get walletExists(): boolean {
    return fs.existsSync(this.walletPath)
  }

  getStatus(): WalletStatus {
    return {
      exists: this.walletExists,
      unlocked: this.wallet !== null,
      address: this.wallet?.address ?? null
    }
  }

  getWallet(): Wallet | null {
    return this.wallet
  }

  async create(password: string): Promise<string> {
    const wallet = Wallet.createRandom()
    const encrypted = await wallet.encrypt(password)
    fs.writeFileSync(this.walletPath, encrypted, 'utf-8')
    this.wallet = wallet
    return wallet.address
  }

  async importFromKey(privateKey: string, password: string): Promise<string> {
    const wallet = new Wallet(privateKey)
    const encrypted = await wallet.encrypt(password)
    fs.writeFileSync(this.walletPath, encrypted, 'utf-8')
    this.wallet = wallet
    return wallet.address
  }

  async importFromMnemonic(mnemonic: string, password: string): Promise<string> {
    const wallet = Wallet.fromPhrase(mnemonic)
    const encrypted = await wallet.encrypt(password)
    fs.writeFileSync(this.walletPath, encrypted, 'utf-8')
    this.wallet = wallet
    return wallet.address
  }

  async unlock(password: string): Promise<boolean> {
    if (!this.walletExists) return false
    try {
      const encrypted = fs.readFileSync(this.walletPath, 'utf-8')
      this.wallet = await Wallet.fromEncryptedJson(encrypted, password)
      return true
    } catch {
      return false
    }
  }

  lock(): void {
    this.wallet = null
  }
}
