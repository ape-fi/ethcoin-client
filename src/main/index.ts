import * as Sentry from '@sentry/electron/main'
import { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, powerMonitor } from 'electron'
import path from 'path'
import { WalletManager } from './wallet-manager'
import { registerIpcHandlers } from './ipc'
import { setupAutoUpdater, downloadUpdate, installUpdate } from './auto-updater'
import { SENTRY_DSN, APP_VERSION } from '../shared/constants'

const iconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'icon.png')
  : path.join(__dirname, '../../resources/icon.png')

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    release: APP_VERSION,
    beforeSend(event) {
      // Strip any potentially sensitive data from error messages
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) {
            // Remove anything that looks like a private key, address, or RPC URL
            ex.value = ex.value.replace(/0x[a-fA-F0-9]{40,}/g, '[REDACTED]')
            ex.value = ex.value.replace(/https?:\/\/[^\s"')]+/g, '[RPC_URL]')
          }
        }
      }
      return event
    }
  })
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Hide to tray instead of quitting when window is closed
  mainWindow.on('close', (e) => {
    if (!(app as any).isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  tray = new Tray(icon)
  tray.setToolTip('Ethcoin Miner')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: 'Quit', click: () => { (app as any).isQuitting = true; app.quit() } }
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
}


app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.setIcon(iconPath)
  }
  const dataDir = app.getPath('userData')
  const walletManager = new WalletManager(dataDir)

  registerIpcHandlers(walletManager, dataDir, () => mainWindow)

  ipcMain.handle('update:download', () => { downloadUpdate() })
  ipcMain.handle('update:install', () => { installUpdate(app) })
  ipcMain.handle('shell:open-external', (_event, url: string) => shell.openExternal(url))

  createWindow()
  createTray()
  setupAutoUpdater(() => mainWindow)

  // Recover after system wake — notify renderer to refresh connections
  powerMonitor.on('resume', () => {
    mainWindow?.webContents.send('system:wake')
  })
})

app.on('before-quit', () => {
  (app as any).isQuitting = true
})

app.on('window-all-closed', () => {
  // Don't quit — keep running in tray
})

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
})
