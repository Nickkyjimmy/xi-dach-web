'use client'

import { useParams } from 'next/navigation'

export default function PlayerGamePage() {
  const params = useParams()
  const gameId = params.id as string

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl font-black text-white mb-4">
          🎮 Player View
        </h1>
        <p className="text-white/80 text-xl mb-8">
          Game ID: {gameId}
        </p>
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 max-w-2xl">
          <p className="text-white text-2xl font-bold mb-4">
            Game is starting...
          </p>
          <p className="text-white/60">
            This is where the game interface will be displayed.
          </p>
        </div>
      </div>
    </div>
  )
}
