'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { joinGameWithNickname } from '@/app/actions/game-actions'

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
        // If game not found, go back to PIN step
        if (result.error.includes('not found')) {
          setStep('pin')
          setPin('')
        }
        setIsLoading(false)
        return
      }

      if (result.success && result.playerId && result.gameId && result.redirectUrl) {
        // Save to localStorage for persistence
        localStorage.setItem('playerId', result.playerId)
        localStorage.setItem('gameId', result.gameId)
        
        // Redirect to appropriate page based on game status
        router.push(result.redirectUrl)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full mx-auto mb-4 shadow-2xl flex items-center justify-center">
            <span className="text-5xl">🎮</span>
          </div>
          <h1 className="text-4xl font-black text-white mb-2">Join Game</h1>
          <p className="text-white/80">Let's get you in the game!</p>
        </motion.div>

        {/* Multi-step Form */}
        <AnimatePresence mode="wait">
          {step === 'pin' ? (
            <motion.div
              key="pin-step"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl ring-1 ring-white/20"
            >
              <form onSubmit={handlePinSubmit} className="space-y-6">
                <div>
                  <label className="block text-white font-bold mb-3 text-sm uppercase tracking-wide">
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
                    className="text-center text-4xl h-20 tracking-[0.5em] font-mono font-bold bg-white/20 border-white/30 text-white placeholder:text-white/40 focus-visible:ring-white/50 rounded-2xl"
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-100 text-sm text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={pin.length !== 6}
                  className="w-full h-14 text-lg font-bold bg-white text-purple-600 hover:bg-white/90 shadow-xl rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  Next →
                </Button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="nickname-step"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl ring-1 ring-white/20"
            >
              <form onSubmit={handleNicknameSubmit} className="space-y-6">
                <div>
                  <label className="block text-white font-bold mb-3 text-sm uppercase tracking-wide">
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
                    className="text-center text-2xl h-16 font-bold bg-white/20 border-white/30 text-white placeholder:text-white/40 focus-visible:ring-white/50 rounded-2xl"
                    maxLength={20}
                    required
                    autoFocus
                  />
                  <p className="text-white/60 text-xs mt-2 text-center">
                    Game PIN: <span className="font-mono font-bold">{pin}</span>
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-100 text-sm text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={!nickname.trim() || isLoading}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 text-white shadow-xl rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isLoading ? 'Joining...' : 'Join Game! 🚀'}
                  </Button>
                  
                  <Button
                    type="button"
                    onClick={() => {
                      setStep('pin')
                      setPin('')
                      setError('')
                    }}
                    variant="outline"
                    className="w-full h-12 font-semibold bg-white/10 hover:bg-white/20 border-white/30 text-white rounded-2xl"
                  >
                    ← Change PIN
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
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center">
        <div className="text-white text-2xl font-bold">Loading...</div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  )
}
