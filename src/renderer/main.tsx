import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './styles/global.css'
import { SENTRY_DSN, APP_VERSION } from '../shared/constants'

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    release: APP_VERSION,
    beforeSend(event) {
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) {
            ex.value = ex.value.replace(/0x[a-fA-F0-9]{40,}/g, '[REDACTED]')
            ex.value = ex.value.replace(/https?:\/\/[^\s"')]+/g, '[RPC_URL]')
          }
        }
      }
      return event
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p>Something went wrong. Please restart the app.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
