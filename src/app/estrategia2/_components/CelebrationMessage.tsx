'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface CelebrationMessageProps {
  show: boolean
  message: string
  onComplete?: () => void
}

/**
 * Componente de Mensagem de Celebração
 * Exibe uma mensagem animada ao centro da tela com efeito de spring
 * Usado após cadastramento de novos relacionamentos
 */
export default function CelebrationMessage({ 
  show, 
  message, 
  onComplete 
}: CelebrationMessageProps) {
  return (
    <AnimatePresence>
      {show && message && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          transition={{ 
            type: 'spring', 
            stiffness: 300, 
            damping: 20,
            duration: 0.5 
          }}
          onAnimationComplete={() => {
            // Chamar callback após animação completar se houver
            if (onComplete) {
              setTimeout(() => onComplete(), 3500) // Duração total com tempo de exibição
            }
          }}
          className="fixed inset-0 z-[10001] flex items-center justify-center pointer-events-none"
        >
          <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white px-8 py-6 rounded-2xl shadow-2xl border-4 border-white/30 backdrop-blur-sm">
            <p className="text-2xl md:text-3xl font-bold text-center tracking-wide">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
