import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './review.css'
import './milestone2.css'
import './milestone3.css'
import './milestone4.css'
import './spiderGraph.css'
import './clarity.css'
import './relationshipGraph'
import './indicatorDetail'
import App from './App'
import { installMilestone4Enhancements } from './milestone4'
import { installIndicatorNavigation } from './indicatorNavigation'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

installMilestone4Enhancements()
installIndicatorNavigation()
