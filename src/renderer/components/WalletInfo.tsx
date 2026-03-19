import { useState } from 'react'
import type { Balances } from '../../shared/types'

interface Props {
  address: string
  balances: Balances
  onBalancesRefresh: () => void
}

type SendToken = 'ETH' | 'ETHC'

export default function WalletInfo({ address, balances, onBalancesRefresh }: Props) {
  const [copied, setCopied] = useState(false)
  const [sendToken, setSendToken] = useState<SendToken | null>(null)
  const [sendTo, setSendTo] = useState('')
  const [sendAmount, setSendAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendSuccess, setSendSuccess] = useState('')

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openSend = (token: SendToken) => {
    setSendToken(token)
    setSendTo('')
    setSendAmount('')
    setSendError('')
    setSendSuccess('')
  }

  const closeSend = () => {
    setSendToken(null)
    setSendTo('')
    setSendAmount('')
    setSendError('')
    setSendSuccess('')
  }

  const handleSend = async () => {
    if (!sendToken || !sendTo || !sendAmount) return
    setSending(true)
    setSendError('')
    setSendSuccess('')
    try {
      const result = sendToken === 'ETH'
        ? await window.ethcoinAPI.sendEth(sendTo, sendAmount)
        : await window.ethcoinAPI.sendEthc(sendTo, sendAmount)
      if (result.error) {
        setSendError(result.error)
      } else {
        setSendSuccess(`Sent! TX: ${result.txHash!.slice(0, 10)}...`)
        onBalancesRefresh()
      }
    } catch (err: any) {
      setSendError(err.message)
    } finally {
      setSending(false)
    }
  }

  const [maxEthLoading, setMaxEthLoading] = useState(false)

  const handleMax = async () => {
    if (sendToken === 'ETHC') {
      setSendAmount(balances.ethc)
    } else {
      setMaxEthLoading(true)
      const { max } = await window.ethcoinAPI.getMaxEth()
      setSendAmount(max)
      setMaxEthLoading(false)
    }
  }

  return (
    <div className="panel wallet-info">
      <h2>Wallet</h2>
      <div className="address-row">
        <span className="address clickable" onClick={copyAddress}>{address.slice(0, 6)}...{address.slice(-4)}</span>
        <span className="copy-hint">{copied ? 'Copied!' : 'Click to copy'}</span>
        <a
          className="etherscan-link"
          title="View on Etherscan"
          onClick={() => window.ethcoinAPI.openExternal(`https://etherscan.io/address/${address}`)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
      <div className="balances">
        <div className="balance">
          <span className="label">ETH (gas)</span>
          <div className="balance-right">
            <span className="value">{parseFloat(balances.eth).toFixed(4)}</span>
            <button className="btn-send" onClick={() => openSend('ETH')}>Send</button>
          </div>
        </div>
        <div className="balance">
          <span className="label">ETHC</span>
          <div className="balance-right">
            <span className="value">{parseFloat(balances.ethc).toFixed(2)}</span>
            <button className="btn-send" onClick={() => openSend('ETHC')}>Send</button>
          </div>
        </div>
      </div>

      {sendToken && (
        <div className="modal-overlay" onClick={closeSend}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Send {sendToken}</h2>
              <button className="modal-close" onClick={closeSend}>&times;</button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="Recipient address (0x...)"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                disabled={sending}
              />
              <div className="amount-input-row">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount"
                  value={sendAmount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '')
                    setSendAmount(v)
                  }}
                  disabled={sending}
                />
                <button
                  className="btn-max"
                  onClick={handleMax}
                  disabled={sending || maxEthLoading}
                >
                  {maxEthLoading ? '...' : 'Max'}
                </button>
              </div>
              {sendError && <p className="error">{sendError}</p>}
              {sendSuccess && <p className="success">{sendSuccess}</p>}
              <button
                onClick={handleSend}
                disabled={sending || !sendTo || !sendAmount}
              >
                {sending ? 'Sending...' : `Send ${sendToken}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
