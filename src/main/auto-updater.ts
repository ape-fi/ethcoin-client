import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'

export function setupAutoUpdater(getWindow: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  let pendingUpdate: { version: string; releaseNotes?: string } | null = null

  autoUpdater.on('update-available', (info) => {
    const update = { version: info.version, releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined }
    pendingUpdate = update
    const win = getWindow()
    if (win && !win.webContents.isLoading()) {
      win.webContents.send('update:available', update)
    } else if (win) {
      win.webContents.once('did-finish-load', () => {
        win.webContents.send('update:available', update)
      })
    }
  })

  autoUpdater.on('download-progress', (progress) => {
    const win = getWindow()
    if (win) {
      win.webContents.send('update:download-progress', {
        percent: Math.round(progress.percent)
      })
    }
  })

  autoUpdater.on('update-downloaded', () => {
    const win = getWindow()
    if (win) {
      win.webContents.send('update:downloaded')
    }
  })

  autoUpdater.on('error', () => {
    // Silently ignore update errors — not critical
  })

  // Check for updates after a short delay, then every 2 hours
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 5000)
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 2 * 60 * 60 * 1000)
}

export function downloadUpdate(): void {
  autoUpdater.downloadUpdate().catch(() => {})
}

export function installUpdate(app: import('electron').App): void {
  (app as any).isQuitting = true
  autoUpdater.quitAndInstall()
}
