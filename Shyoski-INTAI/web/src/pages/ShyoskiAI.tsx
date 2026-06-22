import { AIAuthProvider } from './ShyoskiINTAI/context/AIAuthContext'
import ShyoskiAIContent from './ShyoskiINTAI/index'

export default function ShyoskiAI() {
  return (
    <AIAuthProvider>
      <ShyoskiAIContent />
    </AIAuthProvider>
  )
}
