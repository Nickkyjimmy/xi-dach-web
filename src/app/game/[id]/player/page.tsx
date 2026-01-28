'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRCodeGenerator } from '@/components/game/qrcode-generator'
import { useEffect, useState, useCallback, useRef } from 'react'
import { Banknote, Trophy, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PageLoader } from '@/components/ui/spinner'
import { motion } from 'framer-motion'
import { slideUp, scaleIn } from '@/lib/animations'

export default function PlayerGamePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const gameId = params.id as string
  const supabaseRef = useRef(createClient())

  const [playerId, setPlayerId] = useState<string | null>(null)
  const [player, setPlayer] = useState<{ name: string; balance: number } | null>(null)
  const [game, setGame] = useState<{ currentRound: number; status: string } | null>(null)
  const [currentRound, setCurrentRound] = useState<{ results: Array<{ playerId: string; result: string }> } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const urlId = searchParams.get('id')
    const localId = typeof window !== 'undefined' ? localStorage.getItem('playerId') : null
    const finalId = urlId || localId

    if (!finalId) {
      setError('No player ID found. Please join via the main menu.')
      setIsLoading(false)
      return
    }

    setPlayerId(finalId)
  }, [searchParams])

  const fetchPlayerData = useCallback(async () => {
    const supabase = supabaseRef.current
    try {
      const { data: gameData } = await supabase
        .from('Game')
        .select('*')
        .eq('id', gameId)
        .single()

      if (gameData) setGame(gameData)

      const { data: roundData } = await supabase
        .from('Round')
        .select(`
            *,
            results:RoundResult(*)
        `)
        .eq('gameId', gameId)
        .order('roundNumber', { ascending: false })
        .limit(1)

      if (roundData?.[0]) setCurrentRound(roundData[0])

      if (playerId) {
        const { data: me } = await supabase
          .from('Player')
          .select('*')
          .eq('id', playerId)
          .single()

        if (me) setPlayer(me)
      }
    } catch (err) {
      console.error("Failed to fetch player data via Supabase", err)
      setError('Failed to load game data')
    } finally {
      setIsLoading(false)
    }
  }, [gameId, playerId])

  useEffect(() => {
    if (!playerId) return

    const supabase = supabaseRef.current
    fetchPlayerData()

    const channel = supabase
      .channel(`player-updates-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', filter: `gameId=eq.${gameId}` },
        () => fetchPlayerData()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Game', filter: `id=eq.${gameId}` },
        () => fetchPlayerData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, playerId, fetchPlayerData])

  const myResult = currentRound?.results?.find((r) => r.playerId === playerId)
  const isScanned = !!myResult

  if (isLoading) {
    return <PageLoader message="Loading game..." />
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
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-sm text-[var(--color-accent)] font-medium hover:underline"
          >
            Go to Home
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-game-gradient p-4 flex flex-col items-center">
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="w-full max-w-sm mt-6 space-y-4"
      >
        <div className="text-center">
          <h1 className="text-2xl font-black text-[var(--color-cream)]">Player Zone</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Badge variant="outline" className="text-[var(--color-accent)] border-[var(--color-accent)]/50 text-xs">
              Round {game?.currentRound || 1}
            </Badge>
            {game?.status === 'FINISHED' && (
              <Badge className="bg-[var(--color-error)] text-[var(--color-cream)] text-xs">GAME OVER</Badge>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="glass-card border-0">
            <CardContent className="p-3 flex flex-col items-center">
              <Banknote className="w-4 h-4 text-[var(--color-success)] mb-1" />
              <span className="text-[10px] text-[var(--color-cream)]/50 uppercase font-bold">Balance</span>
              <span className={`text-xl font-mono font-black ${(player?.balance || 0) >= 0 ? 'text-[var(--color-success-light)]' : 'text-[var(--color-error-light)]'}`}>
                {player?.balance || 0}
              </span>
            </CardContent>
          </Card>
          <Card className="glass-card border-0">
            <CardContent className="p-3 flex flex-col items-center text-center">
              <Trophy className="w-4 h-4 text-[var(--color-warning)] mb-1" />
              <span className="text-[10px] text-[var(--color-cream)]/50 uppercase font-bold">Status</span>
              <div className="mt-1">
                {isScanned ? (
                  <Badge className="bg-[var(--color-success)] text-[var(--color-dark)] text-[10px] uppercase">{myResult.result}</Badge>
                ) : (
                  <Badge variant="outline" className="text-[var(--color-cream)]/50 border-[var(--color-cream)]/20 text-[10px] uppercase">Waiting...</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Card */}
        <Card className="glass-card border-2 border-[var(--color-accent)]/20 overflow-hidden shadow-lg">
          <CardHeader className="bg-[var(--color-accent)]/10 text-center pb-2 border-b border-[var(--color-accent)]/10">
            <CardTitle className="text-[var(--color-cream)] flex items-center justify-center gap-2 text-base">
              {player?.name || 'Your QR'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-5 pb-6 space-y-4">
            {playerId ? (
              <>
                <div className={`p-3 rounded-xl border-2 border-dashed transition-all duration-300 ${isScanned ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30' : 'bg-[var(--color-cream)] border-[var(--color-accent)]/20'}`}>
                  <QRCodeGenerator
                    value={playerId}
                    size={180}
                  />
                </div>

                <div className="w-full space-y-2">
                  {isScanned ? (
                    <motion.div
                      variants={scaleIn}
                      initial="hidden"
                      animate="visible"
                      className="bg-[var(--color-success)]/20 p-3 rounded-xl flex items-center gap-3"
                    >
                      <div className="bg-[var(--color-success)] p-2 rounded-full">
                        <CheckCircle className="w-4 h-4 text-[var(--color-dark)]" />
                      </div>
                      <div>
                        <p className="text-[var(--color-success-light)] font-bold text-sm">Scanned Successfully!</p>
                        <p className="text-[var(--color-success-light)]/70 text-[10px] font-medium uppercase">Result: {myResult.result}</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-[var(--color-dark-secondary)]/50 p-3 rounded-xl flex items-center gap-3">
                      <div className="animate-spin duration-[3000ms]">
                        <RefreshCw className="w-4 h-4 text-[var(--color-cream)]/40" />
                      </div>
                      <div>
                        <p className="text-[var(--color-cream)]/70 font-semibold text-sm">Waiting for Host...</p>
                        <p className="text-[var(--color-cream)]/40 text-[10px] uppercase">Get your cards ready!</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-[var(--color-error)]" />
                <p className="text-[var(--color-error)] font-bold text-sm">No Player ID found</p>
                <p className="text-[var(--color-cream)]/50 text-xs mt-1">Join via the main menu first</p>
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="text-center text-[var(--color-cream)]/40 text-[10px] font-medium uppercase tracking-widest pt-2">
          Show QR to Host • Game ID: {gameId.slice(0, 8)}...
        </footer>
      </motion.div>
    </div>
  )
}
