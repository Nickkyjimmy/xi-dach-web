'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { startGame } from '@/app/actions/game-actions'

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
  
  const supabase = createClient()
  
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const response = await fetch(`/api/game/${gameId}`)
        const data = await response.json()
        
        setGame(data.game)
        setPlayers(data.players)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching game data:', error)
        setLoading(false)
      }
    }
    
    fetchInitialData()
    
    // Subscribe to real-time player updates
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
    } catch (error) {
      console.error('Error starting game:', error)
      setIsStarting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500">
        <div className="text-white text-2xl font-bold animate-pulse">Loading...</div>
      </div>
    )
  }
  
  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500">
        <div className="text-white text-2xl font-bold">Game not found</div>
      </div>
    )
  }
  
  const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?pin=${game.pin}`
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with PIN */}
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold mb-4 opacity-90">Game PIN</h1>
          <div className="text-8xl md:text-9xl font-black tracking-wider text-yellow-300 drop-shadow-2xl">
            {game.pin}
          </div>
          <p className="mt-6 text-xl opacity-90">
            Scan the QR code or enter the PIN to join!
          </p>
        </div>
        
        {/* QR Code Section */}
        <div className="flex justify-center mb-12">
          <div className="bg-white p-6 rounded-3xl shadow-2xl">
            <QRCode
              value={joinUrl}
              size={256}
              level="H"
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>
        </div>
        
        {/* Players Grid */}
        <div className="mb-32">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Players ({players.length})
          </h2>
          
          {players.length === 0 ? (
            <div className="text-center text-xl opacity-75">
              Waiting for players to join...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <AnimatePresence>
                {players.map((player, index) => (
                  <motion.div
                    key={player.id}
                    initial={{ scale: 0, opacity: 0, rotate: -180 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 260,
                      damping: 20,
                      delay: index * 0.1
                    }}
                    className="bg-white/20 backdrop-blur-md rounded-2xl p-6 text-center shadow-lg hover:shadow-2xl hover:scale-105 transition-all"
                  >
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="font-bold text-lg truncate">{player.name}</div>
                    {player.isHost && (
                      <div className="mt-2 inline-block bg-yellow-400 text-purple-900 text-xs font-bold px-3 py-1 rounded-full">
                        HOST
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
        
        {/* Start Button - Fixed at Bottom */}
        <motion.div 
          className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/50 to-transparent"
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleStartGame}
              disabled={players.length < 2 || isStarting}
              className={`
                w-full py-6 px-8 rounded-2xl text-2xl font-black
                transition-all duration-300 shadow-2xl
                ${players.length >= 2 && !isStarting
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500 hover:from-green-500 hover:to-emerald-600 hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-500 cursor-not-allowed opacity-50'
                }
              `}
            >
              {isStarting ? (
                'Starting...'
              ) : players.length < 2 ? (
                `Need ${2 - players.length} more player${2 - players.length === 1 ? '' : 's'}`
              ) : (
                `Start Game with ${players.length} Players! 🚀`
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
