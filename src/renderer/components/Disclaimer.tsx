import { APP_VERSION, DISCLAIMER_TEXT } from '../../shared/constants'

interface Props {
  onAccept: () => void
}

export default function Disclaimer({ onAccept }: Props) {
  return (
    <div className="wallet-setup">
      <h1>Ethcoin Miner</h1>
      <span className="beta-badge">Beta v{APP_VERSION}</span>
      <div className="disclaimer-card">
        <h2 className="disclaimer-title">Beta Software — Use at Your Own Risk</h2>
        <p className="disclaimer-text">{DISCLAIMER_TEXT}</p>
        <button onClick={onAccept}>I understand and accept</button>
      </div>
    </div>
  )
}
