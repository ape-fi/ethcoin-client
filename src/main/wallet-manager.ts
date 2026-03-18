import { Wallet, HDNodeWallet } from 'ethers'
import fs from 'fs'
import path from 'path'
import type { WalletStatus } from '../shared/types'

const WALLET_FILE = 'wallet.json'

export class WalletManager {
  private dataDir: string
  private wallet: Wallet | HDNodeWallet | null = null

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

  getWallet(): Wallet | HDNodeWallet | null {
    return this.wallet
  }

  private validatePassword(password: string): void {
    if (password.length < 8) throw new Error('Password must be at least 8 characters')
  }

  private writeSecure(filePath: string, data: string): void {
    fs.writeFileSync(filePath, data, { encoding: 'utf-8', mode: 0o600 })
  }

  async create(password: string): Promise<string> {
    this.validatePassword(password)
    const wallet = Wallet.createRandom()
    const encrypted = await wallet.encrypt(password)
    this.writeSecure(this.walletPath, encrypted)
    this.wallet = wallet
    return wallet.address
  }

  async importFromKey(privateKey: string, password: string): Promise<string> {
    this.validatePassword(password)
    const wallet = new Wallet(privateKey)
    const encrypted = await wallet.encrypt(password)
    this.writeSecure(this.walletPath, encrypted)
    this.wallet = wallet
    return wallet.address
  }

  async importFromMnemonic(mnemonic: string, password: string): Promise<string> {
    this.validatePassword(password)
    const wallet = Wallet.fromPhrase(mnemonic)
    const encrypted = await wallet.encrypt(password)
    this.writeSecure(this.walletPath, encrypted)
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

  async verifyPassword(password: string): Promise<boolean> {
    if (!this.walletExists) return false
    try {
      const encrypted = fs.readFileSync(this.walletPath, 'utf-8')
      await Wallet.fromEncryptedJson(encrypted, password)
      return true
    } catch {
      return false
    }
  }

  lock(): void {
    this.wallet = null
  }
}
