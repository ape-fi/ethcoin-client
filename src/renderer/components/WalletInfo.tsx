import { useState } from 'react'
import type { Balances } from '../../shared/types'

interface Props {
  address: string
  balances: Balances
}

export default function WalletInfo({ address, balances }: Props) {
  const [copied, setCopied] = useState(false)

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="panel wallet-info">
      <h2>Wallet</h2>
      <div className="address-row" onClick={copyAddress}>
        <span className="address">{address.slice(0, 6)}...{address.slice(-4)}</span>
        <span className="copy-hint">{copied ? 'Copied!' : 'Click to copy'}</span>
      </div>
      <div className="balances">
        <div className="balance">
          <span className="label">ETH (gas)</span>
          <span className="value">{parseFloat(balances.eth).toFixed(4)}</span>
        </div>
        <div className="balance">
          <span className="label">ETHC</span>
          <span className="value">{parseFloat(balances.ethc).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
