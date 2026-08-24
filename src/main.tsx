import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './review.css'
import './milestone2.css'
import './milestone3.css'
import './milestone4.css'
import './clarity.css'
import './ruleDetailClarity.css'
import './controlTabs.css'
import App from './App'
import { installMilestone4Enhancements } from './milestone4'
import { installControlClarity } from './controlClarity'
import { installContentClarity } from './contentClarity'
import { installRuleDetailClarity } from './ruleDetailClarity'
import { installControlTabClarity } from './controlTabClarity'
import { installControlTabs } from './controlTabs'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

installMilestone4Enhancements()
installControlTabs()
installControlClarity()
installContentClarity()
installRuleDetailClarity()
installControlTabClarity()
