import { useState, useEffect } from 'react'

export default function UpdateBanner() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const unsub1 = window.ethcoinAPI.onUpdateAvailable((info) => {
      setUpdateVersion(info.version)
    })
    const unsub2 = window.ethcoinAPI.onUpdateDownloadProgress((p) => {
      setProgress(p.percent)
    })
    const unsub3 = window.ethcoinAPI.onUpdateDownloaded(() => {
      setDownloading(false)
      setReady(true)
    })
    return () => { unsub1(); unsub2(); unsub3() }
  }, [])

  if (dismissed || !updateVersion) return null

  const handleDownload = () => {
    setDownloading(true)
    window.ethcoinAPI.downloadUpdate()
  }

  const handleInstall = () => {
    window.ethcoinAPI.installUpdate()
  }

  return (
    <div className="update-banner">
      <span>
        {ready
          ? `v${updateVersion} is ready — `
          : downloading
            ? `Downloading v${updateVersion}... ${progress}%`
            : `v${updateVersion} is available — `}
      </span>
      {ready ? (
        <button className="update-btn" onClick={handleInstall}>Restart to update</button>
      ) : !downloading ? (
        <button className="update-btn" onClick={handleDownload}>Download</button>
      ) : null}
      <button className="update-dismiss" onClick={() => setDismissed(true)}>&times;</button>
    </div>
  )
}
