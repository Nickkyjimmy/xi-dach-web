'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { startGame } from '@/app/actions/game-actions'
import { PageLoader, Spinner } from '@/components/ui/spinner'
import { staggerContainer, staggerItem, slideUp } from '@/lib/animations'
import { AlertCircle, Users } from 'lucide-react'

interface Player {
  id: string
  name: string
  isHost: boolean
  balance: number
  status: string
}

interface Game {
  id: string
  pin: string
  status: string
  createdAt: string
}

export default function HostLobbyPage() {
  const params = useParams()
  const gameId = params.id as string

  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const response = await fetch(`/api/game/${gameId}`)
        const data = await response.json()

        if (data.error) {
          setError('Game not found')
          setLoading(false)
          return
        }

        setGame(data.game)
        setPlayers(data.players)
        setLoading(false)
      } catch {
        setError('Failed to load game')
        setLoading(false)
      }
    }

    fetchInitialData()

    const channel = supabase
      .channel('lobby-players')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Player',
          filter: `gameId=eq.${gameId}`
        },
        (payload) => {
          const newPlayer = payload.new as Player
          setPlayers((prev) => [...prev, newPlayer])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, supabase])

  const handleStartGame = async () => {
    if (players.length < 2) return

    setIsStarting(true)
    try {
      await startGame(gameId)
    } catch {
      setError('Failed to start game')
      setIsStarting(false)
    }
  }

  if (loading) {
    return <PageLoader message="Loading lobby..." />
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-game-gradient flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-6 text-center max-w-sm w-full">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-[var(--color-error)]" />
          <p className="text-[var(--color-cream)] font-semibold">{error || 'Game not found'}</p>
        </div>
      </div>
    )
  }

  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?pin=${game.pin}`

  return (
    <div className="min-h-screen bg-game-gradient-subtle p-4 pb-28">
      <div className="max-w-2xl mx-auto">
        {/* Header with PIN */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          animate="visible"
          className="text-center mb-8 pt-4"
        >
          <p className="text-sm font-semibold text-[var(--color-cream)]/60 uppercase tracking-wider mb-2">Game PIN</p>
          <div className="text-4xl md:text-5xl font-black tracking-wider text-[var(--color-accent)]">
            {game.pin}
          </div>
          <p className="mt-3 text-sm text-[var(--color-cream)]/60">
            Scan the QR code or enter the PIN to join!
          </p>
        </motion.div>

        {/* QR Code Section */}
        <motion.div
          variants={slideUp}
          initial="hidden"
          animate="visible"
          className="flex justify-center mb-8"
        >
          <div className="bg-[var(--color-cream)] p-4 rounded-2xl shadow-lg">
            <QRCode
              value={joinUrl}
              size={180}
              level="H"
              bgColor="#DFD0B8"
              fgColor="#222831"
            />
          </div>
        </motion.div>

        {/* Players Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="w-4 h-4 text-[var(--color-cream)]/60" />
            <h2 className="text-xl font-bold text-[var(--color-cream)]">
              Players ({players.length})
            </h2>
          </div>

          {players.length === 0 ? (
            <div className="glass-card rounded-xl p-6 text-center">
              <p className="text-[var(--color-cream)]/60 text-sm">
                Waiting for players to join...
              </p>
            </div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
            >
              <AnimatePresence>
                {players.map((player) => (
                  <motion.div
                    key={player.id}
                    variants={staggerItem}
                    layout
                    className="glass-card rounded-xl p-4 text-center"
                  >
                    <div className="w-12 h-12 mx-auto mb-2 bg-[var(--color-accent)]/30 rounded-full flex items-center justify-center text-lg font-bold text-[var(--color-accent)]">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="font-semibold text-sm text-[var(--color-cream)] truncate">{player.name}</div>
                    {player.isHost && (
                      <div className="mt-2 inline-block bg-[var(--color-warning)]/20 text-[var(--color-warning)] text-xs font-bold px-2 py-0.5 rounded-full">
                        HOST
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {/* Skeleton placeholder for loading more players */}
        {players.length > 0 && players.length < 4 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 opacity-30">
            {[...Array(Math.min(3, 4 - players.length))].map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 text-center animate-pulse">
                <div className="w-12 h-12 mx-auto mb-2 bg-[var(--color-dark-secondary)]/50 rounded-full" />
                <div className="h-4 bg-[var(--color-dark-secondary)]/50 rounded w-16 mx-auto" />
              </div>
            ))}
          </div>
        )}

        {/* Start Button - Fixed at Bottom */}
        <motion.div
          className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[var(--color-dark)] to-transparent"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="max-w-md mx-auto">
            <button
              onClick={handleStartGame}
              disabled={players.length < 2 || isStarting}
              className={`
                w-full h-14 rounded-xl text-base font-bold
                transition-all duration-200 shadow-lg
                ${players.length >= 2 && !isStarting
                  ? 'bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-[var(--color-dark)] hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-[var(--color-dark-secondary)] text-[var(--color-cream)]/40 cursor-not-allowed'
                }
              `}
            >
              {isStarting ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner size="sm" className="text-[var(--color-dark)]" />
                  Starting...
                </span>
              ) : players.length < 2 ? (
                `Need ${2 - players.length} more player${2 - players.length === 1 ? '' : 's'}`
              ) : (
                `Start Game with ${players.length} Players`
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
