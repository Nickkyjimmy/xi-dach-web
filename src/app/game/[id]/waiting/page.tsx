'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

export default function WaitingRoomPage() {
  const params = useParams()
  const router = useRouter()
  const gameId = params.id as string
  
  const [playerName, setPlayerName] = useState('')
  const [gamePin, setGamePin] = useState('')
  const [isListening, setIsListening] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    // Get player info from localStorage
    const playerId = localStorage.getItem('playerId')
    const storedGameId = localStorage.getItem('gameId')
    
    if (!playerId || storedGameId !== gameId) {
      // If no player ID or wrong game, redirect to join
      router.push(`/join?pin=${gamePin || ''}`)
      return
    }

    // Fetch initial game and player data
    async function fetchData() {
      try {
        const response = await fetch(`/api/game/${gameId}`)
        const data = await response.json()
        
        if (data.error) {
          router.push('/join')
          return
        }

        setGamePin(data.game.pin)
        
        // Check if game already started
        if (data.game.status === 'ACTIVE') {
          router.push(`/game/${gameId}/player`)
          return
        }

        // Find player name
        const player = data.players.find((p: any) => p.id === playerId)
        if (player) {
          setPlayerName(player.name)
        }
      } catch (error) {
        console.error('Error fetching game data:', error)
      }
    }

    fetchData()
    setIsListening(true)

    // Subscribe to real-time game status changes
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
          const newStatus = (payload.new as any).status
          console.log('[WaitingRoom] Game status changed to:', newStatus)
          
          if (newStatus === 'ACTIVE') {
            // Game started! Redirect to player view
            router.push(`/game/${gameId}/player`)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, router, supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        {/* Success Animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="mb-8"
        >
          <div className="w-32 h-32 mx-auto mb-6 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl">
            <motion.span
              className="text-7xl"
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            >
              ✅
            </motion.span>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          <h1 className="text-5xl md:text-6xl font-black text-white mb-4">
            You're In!
          </h1>
          
          {playerName && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="inline-block bg-white/20 backdrop-blur-md px-6 py-3 rounded-full"
            >
              <p className="text-2xl font-bold text-white">
                Welcome, <span className="text-yellow-300">{playerName}</span>!
              </p>
            </motion.div>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 space-y-4"
          >
            <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl ring-1 ring-white/20">
              <p className="text-2xl font-semibold text-white mb-2">
                See your name on the host screen?
              </p>
              <p className="text-white/80 text-lg">
                You should appear in the lobby!
              </p>
              
              {gamePin && (
                <div className="mt-6 pt-6 border-t border-white/20">
                  <p className="text-white/60 text-sm mb-2">Game PIN</p>
                  <p className="text-4xl font-mono font-black text-yellow-300 tracking-wider">
                    {gamePin}
                  </p>
                </div>
              )}
            </div>

            {/* Waiting Animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-6"
            >
              <div className="flex items-center justify-center space-x-2">
                <div className="flex space-x-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-3 h-3 bg-white rounded-full"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        delay: i * 0.2
                      }}
                    />
                  ))}
                </div>
                <p className="text-white font-semibold ml-4">
                  Waiting for host to start...
                </p>
              </div>
              
              {isListening && (
                <p className="text-white/60 text-xs mt-3">
                  🔴 Live • Auto-starting when ready
                </p>
              )}
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Fun Tip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-12 text-white/60 text-sm"
        >
          <p>💡 Tip: Keep this tab open! The game will start automatically.</p>
        </motion.div>
      </div>
    </div>
  )
}
