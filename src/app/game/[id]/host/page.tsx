'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { QrCode, Info } from 'lucide-react'
import QRCode from 'react-qr-code'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export default function HostGamePage() {
  const params = useParams()
  const gameId = params.id as string
  
  const [gamePin, setGamePin] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Fetch game data to get PIN
    async function fetchGameData() {
      try {
        const response = await fetch(`/api/game/${gameId}`)
        const data = await response.json()
        
        if (data.game) {
          setGamePin(data.game.pin)
        }
      } catch (error) {
        console.error('Error fetching game data:', error)
      }
    }

    fetchGameData()
  }, [gameId])

  const joinUrl = typeof window !== 'undefined' && gamePin 
    ? `${window.location.origin}/join?pin=${gamePin}` 
    : ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4">
      {/* Header with QR Button */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-white flex items-center gap-3">
              <span className="text-5xl">👑</span>
              Host Dashboard
            </h1>
            <p className="text-white/60 mt-2">Game ID: {gameId}</p>
          </div>
          
          {/* QR Code Dialog Trigger */}
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white shadow-xl gap-2"
              >
                <QrCode className="w-5 h-5" />
                Show Join QR
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-md bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 border-white/20 text-white">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black text-center text-white">
                  Join Current Game
                </DialogTitle>
                <DialogDescription className="text-white/80 text-center">
                  New players can scan this QR code or enter the PIN below
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Game PIN */}
                <div className="text-center">
                  <p className="text-white/80 text-sm font-semibold mb-2 uppercase tracking-wide">
                    Game PIN
                  </p>
                  <div className="text-7xl font-black text-yellow-300 tracking-wider drop-shadow-lg">
                    {gamePin || '------'}
                  </div>
                </div>

                {/* QR Code */}
                {joinUrl && (
                  <div className="flex justify-center">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl">
                      <QRCode
                        value={joinUrl}
                        size={200}
                        level="H"
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    </div>
                  </div>
                )}

                {/* Helper Text */}
                <div className="text-center">
                  <p className="text-white/70 text-sm">
                    Players can join even while the game is running!
                  </p>
                </div>

                {/* Close Button */}
                <Button
                  onClick={() => setIsOpen(false)}
                  className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
                  size="lg"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Main Content Area */}
        <div className="grid gap-6">
          {/* Game Controls Placeholder */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl ring-1 ring-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Game Controls</h2>
            <p className="text-white/60 mb-6">
              This is where the host game controls will be displayed.
            </p>
            
            {/* Info Box */}
            <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-300 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-100 font-semibold mb-1">
                  Mid-Game Joins Enabled
                </p>
                <p className="text-blue-200/80 text-sm">
                  Click the "Show Join QR" button above to let new players join even after the game has started. 
                  They'll jump right into the action!
                </p>
              </div>
            </div>
          </div>

          {/* Player Stats Placeholder */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl ring-1 ring-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Player Statistics</h2>
            <p className="text-white/60">
              Active players and their scores will appear here.
            </p>
          </div>

          {/* Game State Placeholder */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl ring-1 ring-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Game State</h2>
            <p className="text-white/60">
              Current round information and game progress will be shown here.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
