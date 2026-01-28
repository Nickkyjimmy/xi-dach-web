'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { joinGameWithNickname } from '@/app/actions/game-actions'
import { Spinner, PageLoader } from '@/components/ui/spinner'
import { slideUp, fadeIn } from '@/lib/animations'

function JoinPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pinFromUrl = searchParams.get('pin')

  const [step, setStep] = useState<'pin' | 'nickname'>(pinFromUrl ? 'nickname' : 'pin')
  const [pin, setPin] = useState(pinFromUrl || '')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (pin.length !== 6) {
      setError('PIN must be 6 digits')
      return
    }

    setStep('nickname')
  }

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!nickname.trim()) {
      setError('Please enter a nickname')
      setIsLoading(false)
      return
    }

    try {
      const result = await joinGameWithNickname(pin, nickname.trim())

      if (result.error) {
        setError(result.error)
        if (result.error.includes('not found')) {
          setStep('pin')
          setPin('')
        }
        setIsLoading(false)
        return
      }

      if (result.success && result.playerId && result.gameId && result.redirectUrl) {
        localStorage.setItem('playerId', result.playerId)
        localStorage.setItem('gameId', result.gameId)
        router.push(result.redirectUrl)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-game-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <motion.div
          className="text-center mb-6"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <div className="w-16 h-16 bg-[var(--color-accent)] rounded-full mx-auto mb-3 shadow-lg flex items-center justify-center">
            <span className="text-3xl">&#127918;</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--color-cream)] mb-1">Join Game</h1>
          <p className="text-sm text-[var(--color-cream)]/60">Let&apos;s get you in the game!</p>
        </motion.div>

        {/* Multi-step Form */}
        <AnimatePresence mode="wait">
          {step === 'pin' ? (
            <motion.div
              key="pin-step"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="glass-card rounded-2xl p-6 shadow-lg"
            >
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div>
                  <label className="block text-[var(--color-cream)] font-semibold mb-2 text-sm">
                    Enter Game PIN
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      setPin(value)
                      setError('')
                    }}
                    placeholder="000000"
                    className="text-center text-2xl h-14 tracking-[0.3em] font-mono font-bold bg-[var(--color-dark)]/60 border-[var(--color-accent)]/30 text-[var(--color-cream)] placeholder:text-[var(--color-cream)]/30 focus-visible:ring-[var(--color-accent)] rounded-xl"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <motion.div
                    variants={slideUp}
                    initial="hidden"
                    animate="visible"
                    className="bg-[var(--color-error)]/20 border border-[var(--color-error)]/30 rounded-xl p-3 text-sm text-center"
                  >
                    <span className="text-[var(--color-error-light)]">{error}</span>
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={pin.length !== 6}
                  className="w-full h-12 text-sm font-bold bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[var(--color-dark)] shadow-md rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                >
                  Next
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="nickname-step"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="glass-card rounded-2xl p-6 shadow-lg"
            >
              <form onSubmit={handleNicknameSubmit} className="space-y-4">
                <div>
                  <label className="block text-[var(--color-cream)] font-semibold mb-2 text-sm">
                    Enter Your Nickname
                  </label>
                  <Input
                    type="text"
                    value={nickname}
                    onChange={(e) => {
                      setNickname(e.target.value.slice(0, 20))
                      setError('')
                    }}
                    placeholder="Your Name"
                    className="text-center text-xl h-12 font-semibold bg-[var(--color-dark)]/60 border-[var(--color-accent)]/30 text-[var(--color-cream)] placeholder:text-[var(--color-cream)]/30 focus-visible:ring-[var(--color-accent)] rounded-xl"
                    maxLength={20}
                    required
                    autoFocus
                  />
                  <p className="text-[var(--color-cream)]/50 text-xs mt-2 text-center">
                    Game PIN: <span className="font-mono font-bold">{pin}</span>
                  </p>
                </div>

                {error && (
                  <motion.div
                    variants={slideUp}
                    initial="hidden"
                    animate="visible"
                    className="bg-[var(--color-error)]/20 border border-[var(--color-error)]/30 rounded-xl p-3 text-sm text-center"
                  >
                    <span className="text-[var(--color-error-light)]">{error}</span>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <Button
                    type="submit"
                    disabled={!nickname.trim() || isLoading}
                    className="w-full h-12 text-sm font-bold bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-[var(--color-dark)] shadow-md rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="sm" className="text-[var(--color-dark)]" />
                        Joining...
                      </span>
                    ) : (
                      'Join Game'
                    )}
                  </Button>

                  <Button
                    type="button"
                    onClick={() => {
                      setStep('pin')
                      setPin('')
                      setError('')
                    }}
                    variant="outline"
                    className="w-full h-10 text-sm font-medium bg-transparent hover:bg-[var(--color-dark-secondary)] border-[var(--color-accent)]/30 text-[var(--color-cream)]/70 rounded-xl"
                  >
                    Change PIN
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<PageLoader message="Loading join page..." />}>
      <JoinPageContent />
    </Suspense>
  )
}
