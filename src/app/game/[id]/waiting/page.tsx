'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/ui/spinner'
import { slideUp, scaleIn } from '@/lib/animations'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function WaitingRoomPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.id as string

  const [playerName, setPlayerName] = useState('')
  const [gamePin, setGamePin] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    const playerId = localStorage.getItem('playerId')
    const storedGameId = localStorage.getItem('gameId')

    if (!playerId || storedGameId !== gameId) {
      router.push(`/join?pin=${gamePin || ''}`)
      return
    }

    async function fetchData() {
      try {
        const response = await fetch(`/api/game/${gameId}`)
        const data = await response.json()

        if (data.error) {
          setError('Game not found')
          setTimeout(() => router.push('/join'), 2000)
          return
        }

        setGamePin(data.game.pin)

        if (data.game.status === 'ACTIVE') {
          router.push(`/game/${gameId}/player`)
          return
        }

        const player = data.players.find((p: { id: string }) => p.id === playerId)
        if (player) {
          setPlayerName(player.name)
        }
        setIsLoading(false)
      } catch {
        setError('Failed to load game data')
        setIsLoading(false)
      }
    }

    fetchData()

    const channel = supabase
      .channel('game-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Game',
          filter: `id=eq.${gameId}`
        },
        (payload) => {
          const newStatus = (payload.new as { status: string }).status
          if (newStatus === 'ACTIVE') {
            router.push(`/game/${gameId}/player`)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsListening(true)
        } else if (status === 'CHANNEL_ERROR') {
          setError('Connection error. Please refresh.')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, router, supabase, gamePin])

  if (isLoading) {
    return <PageLoader message="Loading waiting room..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-game-gradient flex items-center justify-center p-4">
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="glass-card rounded-2xl p-6 text-center max-w-sm w-full"
        >
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--color-error)]" />
          <p className="text-[var(--color-cream)] font-semibold">{error}</p>
          <p className="text-[var(--color-cream)]/50 text-sm mt-2">Redirecting...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-game-gradient flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center">
        {/* Success Icon */}
        <motion.div
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          className="mb-6"
        >
          <div className="w-20 h-20 mx-auto mb-4 bg-[var(--color-success)]/20 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle className="w-10 h-10 text-[var(--color-success)]" />
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <h1 className="text-3xl font-black text-[var(--color-cream)]">
            You&apos;re In!
          </h1>

          {playerName && (
            <div className="inline-block bg-[var(--color-dark-secondary)]/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
              <p className="text-base font-semibold text-[var(--color-cream)]">
                Welcome, <span className="text-[var(--color-accent)]">{playerName}</span>!
              </p>
            </div>
          )}

          <div className="mt-6 space-y-3">
            <div className="glass-card rounded-2xl p-5 shadow-md">
              <p className="text-base font-semibold text-[var(--color-cream)] mb-1">
                See your name on the host screen?
              </p>
              <p className="text-[var(--color-cream)]/60 text-sm">
                You should appear in the lobby!
              </p>

              {gamePin && (
                <div className="mt-4 pt-4 border-t border-[var(--color-cream)]/10">
                  <p className="text-[var(--color-cream)]/50 text-xs mb-1">Game PIN</p>
                  <p className="text-2xl font-mono font-black text-[var(--color-accent)] tracking-wider">
                    {gamePin}
                  </p>
                </div>
              )}
            </div>

            {/* Waiting Animation */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-center gap-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-[var(--color-accent)] rounded-full"
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.2,
                        delay: i * 0.15
                      }}
                    />
                  ))}
                </div>
                <p className="text-[var(--color-cream)] font-medium text-sm">
                  Waiting for host to start...
                </p>
              </div>

              {isListening && (
                <p className="text-[var(--color-cream)]/40 text-xs mt-2">
                  Live connection active
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Tip */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          animate="visible"
          className="mt-8 text-[var(--color-cream)]/50 text-xs"
        >
          <p>Keep this tab open! The game will start automatically.</p>
        </motion.div>
      </div>
    </div>
  )
}
