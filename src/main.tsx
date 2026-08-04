import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './review.css'
import './milestone2.css'
import './milestone3.css'
import './milestone4.css'
import App from './App'
import { installMilestone4Enhancements } from './milestone4'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

installMilestone4Enhancements()
