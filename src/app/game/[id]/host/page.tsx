'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { QrCode, Banknote, Trophy, Users, ChevronRight, RefreshCw, Skull, LogOut } from 'lucide-react'
import { QRCodeGenerator } from '@/components/game/qrcode-generator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { startGameWithBet, submitScanResult, finishRound, nextRound, simulateTestPlayer, endGame } from '@/app/actions/game-actions'
import { QRScanner } from '@/components/game/qr-scanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { PageLoader, Spinner } from '@/components/ui/spinner'
import { motion } from 'framer-motion'
import { slideUp, staggerContainer, staggerItem } from '@/lib/animations'
import { toast } from 'sonner'

interface Player {
  id: string
  name: string
  isHost: boolean
  balance: number
}

interface RoundResult {
  playerId: string
  result: string
}

interface Transaction {
  playerId: string
  amount: number
}

interface Round {
  results: RoundResult[]
  transactions: Transaction[]
}

interface Game {
  id: string
  pin: string
  status: string
  currentRound: number
  bettingValue: number
}

export default function HostGamePage() {
  const params = useParams()
  const gameId = params.id as string
  const supabaseRef = useRef(createClient())

  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentRound, setCurrentRound] = useState<Round | null>(null)

  const [bettingValue, setBettingValue] = useState<number>(100)
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanType, setScanType] = useState<'WIN' | 'DRAW' | 'X2'>('WIN')
  const [isLoading, setIsLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  const fetchGameData = useCallback(async () => {
    const supabase = supabaseRef.current
    try {
      const { data: gameData, error: gameError } = await supabase
        .from('Game')
        .select('*')
        .eq('id', gameId)
        .single()

      if (gameError || !gameData) throw gameError

      const { data: playerData, error: playersError } = await supabase
        .from('Player')
        .select('*')
        .eq('gameId', gameId)
        .order('createdAt', { ascending: true })

      if (playersError) throw playersError

      const { data: roundData, error: roundError } = await supabase
        .from('Round')
        .select(`
            *,
            results:RoundResult(*),
            transactions:Transaction(*)
        `)
        .eq('gameId', gameId)
        .order('roundNumber', { ascending: false })
        .limit(1)

      if (roundError) throw roundError

      setGame(gameData)
      setPlayers(playerData || [])
      setCurrentRound(roundData?.[0] || null)

    } catch (error) {
      console.error('Error fetching game data via Supabase:', error)
      toast.error('Failed to load game data')
    } finally {
      setPageLoading(false)
    }
  }, [gameId])

  useEffect(() => {
    const supabase = supabaseRef.current
    fetchGameData()

    const channel = supabase
      .channel(`game-updates-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', filter: `gameId=eq.${gameId}` },
        () => {
          fetchGameData()
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Game', filter: `id=eq.${gameId}` },
        () => fetchGameData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId, fetchGameData])

  const joinUrl = typeof window !== 'undefined' && game?.pin
    ? `${window.location.origin}/join?pin=${game.pin}`
    : ''

  const handleStartGame = async () => {
    setIsLoading(true)
    try {
      await startGameWithBet(gameId, Number(bettingValue))
      toast.success('Game started!')
      setTimeout(fetchGameData, 500)
    } catch {
      toast.error('Failed to start game')
    } finally {
      setIsLoading(false)
    }
  }

  const openScanner = (type: 'WIN' | 'DRAW' | 'X2') => {
    setScanType(type)
    setShowScanner(true)
  }

  const handleScan = async (decodedText: string) => {
    try {
      let playerId = decodedText
      try {
        const parsed = JSON.parse(decodedText)
        if (parsed.playerId) playerId = parsed.playerId
      } catch {
        // Not JSON, use raw text
      }

      const player = players.find(p => p.id === playerId)
      if (!player) {
        toast.error('Player not found in this game')
        return
      }

      await submitScanResult(gameId, playerId, scanType)
      toast.success(`${player.name} - ${scanType}`)
      fetchGameData()
    } catch {
      toast.error('Scan failed')
    }
  }

  const handleFinishRound = async () => {
    if (!confirm("Are you sure you want to end this round? Unscanned players will lose.")) return
    setIsLoading(true)
    try {
      await finishRound(gameId)
      toast.success('Round finished!')
      await fetchGameData()
    } catch {
      toast.error('Error finishing round')
    } finally {
      setIsLoading(false)
    }
  }

  const handleNextRound = async () => {
    setIsLoading(true)
    try {
      await nextRound(gameId)
      toast.success('New round started!')
      await fetchGameData()
    } catch {
      toast.error('Error starting next round')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSimulatePlayer = async () => {
    setIsLoading(true)
    try {
      await simulateTestPlayer(gameId)
      toast.success('Bot player added')
      fetchGameData()
    } catch {
      toast.error('Simulation failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEndGame = async () => {
    if (!confirm("Are you sure you want to end the entire game?")) return
    setIsLoading(true)
    try {
      await endGame(gameId)
      toast.success('Game ended')
    } catch {
      toast.error('Error ending game')
    } finally {
      setIsLoading(false)
    }
  }

  const isRoundFinished = currentRound?.transactions && currentRound.transactions.length > 0
  const activeRoundResults = currentRound?.results || []

  if (pageLoading) return <PageLoader message="Loading host controls..." />
  if (!game) return <PageLoader message="Game not found..." />

  return (
    <div className="min-h-screen bg-game-gradient-subtle p-4 pb-20">

      {/* Scanner Overlay */}
      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          title={`Scanning for ${scanType}`}
        />
      )}

      {/* Header */}
      <motion.div
        variants={slideUp}
        initial="hidden"
        animate="visible"
        className="max-w-2xl mx-auto mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-black text-[var(--color-cream)] flex items-center gap-2">
            Host Controls
            <Badge className="bg-[var(--color-warning)] text-[var(--color-dark)] text-xs">ADMIN</Badge>
          </h1>
          <p className="text-[var(--color-cream)]/60 text-sm">
            PIN: <span className="font-mono font-bold tracking-widest">{game.pin}</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="bg-[var(--color-accent)]/20 border-[var(--color-accent)]/30 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/30 text-xs h-8"
            onClick={handleSimulatePlayer}
            disabled={isLoading}
          >
            Bot Join
          </Button>

          <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1 h-8 text-xs border-[var(--color-cream)]/20 text-[var(--color-cream)]">
                <QrCode className="w-3 h-3" /> QR
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-0 max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-[var(--color-cream)]">Join Game</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center p-4 space-y-4">
                <div className="text-3xl font-mono font-black text-[var(--color-accent)] tracking-[0.3em]">{game.pin}</div>
                {joinUrl && (
                  <div className="bg-[var(--color-cream)] p-3 rounded-xl shadow-md">
                    <QRCodeGenerator value={joinUrl} size={160} />
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <div className="max-w-2xl mx-auto space-y-4">

        {/* LOBBY STATE */}
        {game.status === 'LOBBY' && (
          <motion.div variants={slideUp} initial="hidden" animate="visible">
            <Card className="glass-card border-0 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-[var(--color-cream)] flex items-center gap-2 text-base">
                  <Banknote className="text-[var(--color-success)] w-5 h-5" /> Game Setup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-[var(--color-cream)]/60">Betting Value per Round</label>
                  <Input
                    type="number"
                    value={bettingValue}
                    onChange={(e) => setBettingValue(Number(e.target.value))}
                    className="bg-[var(--color-dark)]/60 border-[var(--color-accent)]/30 text-[var(--color-cream)] text-lg h-12"
                  />
                </div>

                <Button
                  className="w-full h-12 bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-[var(--color-dark)] font-bold text-sm"
                  onClick={handleStartGame}
                  disabled={isLoading}
                >
                  {isLoading ? <Spinner size="sm" className="text-[var(--color-dark)]" /> : 'Start Game'}
                </Button>

                <div className="pt-4 border-t border-[var(--color-cream)]/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-[var(--color-cream)]/60" />
                    <h3 className="text-[var(--color-cream)]/60 font-semibold text-sm">Players ({players.length})</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {players.map(p => (
                      <div key={p.id} className="bg-[var(--color-dark)]/50 p-2 rounded-lg flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-[var(--color-success)]"></div>
                        <span className="text-[var(--color-cream)] truncate">{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ACTIVE GAME STATE */}
        {game.status === 'ACTIVE' && (
          <>
            {/* Round Info */}
            <motion.div
              variants={slideUp}
              initial="hidden"
              animate="visible"
              className="glass-card p-5 rounded-2xl flex justify-between items-center"
            >
              <div>
                <p className="text-[var(--color-cream)]/50 text-xs uppercase font-bold tracking-wider">Round</p>
                <p className="text-3xl font-black text-[var(--color-cream)]">#{game.currentRound}</p>
              </div>
              <div className="text-right">
                <p className="text-[var(--color-cream)]/50 text-xs uppercase font-bold tracking-wider">Bet</p>
                <p className="text-3xl font-black text-[var(--color-success)]">${game.bettingValue}</p>
              </div>
            </motion.div>

            {/* Round Finished - LEADERBOARD */}
            {isRoundFinished ? (
              <motion.div variants={slideUp} initial="hidden" animate="visible">
                <Card className="glass-card border-0 shadow-lg overflow-hidden">
                  <CardHeader className="bg-[var(--color-warning)]/20 border-b border-[var(--color-warning)]/20 py-3">
                    <CardTitle className="text-[var(--color-cream)] flex items-center gap-2 text-lg">
                      <Trophy className="w-5 h-5 text-[var(--color-warning)]" /> Round Finished!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="divide-y divide-[var(--color-cream)]/10"
                    >
                      {players
                        .sort((a, b) => b.balance - a.balance)
                        .map((p, idx) => {
                          const transaction = currentRound?.transactions?.find((t) => t.playerId === p.id);
                          const roundAmount = transaction?.amount || 0;

                          return (
                            <motion.div
                              key={p.id}
                              variants={staggerItem}
                              className="p-3 flex items-center justify-between hover:bg-[var(--color-dark-secondary)]/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <span className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold flex-shrink-0 ${idx === 0 ? 'bg-[var(--color-warning)] text-[var(--color-dark)]' :
                                  idx === 1 ? 'bg-[var(--color-accent)] text-[var(--color-dark)]' :
                                    idx === 2 ? 'bg-[var(--color-accent-dark)] text-[var(--color-cream)]' : 'bg-[var(--color-dark-secondary)] text-[var(--color-cream)]/50'
                                  }`}>
                                  {idx + 1}
                                </span>
                                <div className="flex flex-col">
                                  <span className="font-bold text-sm text-[var(--color-cream)] leading-tight">{p.name}</span>
                                  {transaction && (
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${roundAmount > 0 ? 'text-[var(--color-success-light)]' : roundAmount < 0 ? 'text-[var(--color-error-light)]' : 'text-[var(--color-cream)]/50'}`}>
                                      {roundAmount > 0 ? 'Won' : roundAmount < 0 ? 'Lost' : 'Draw'}: {roundAmount > 0 ? '+' : ''}{roundAmount}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-[var(--color-cream)]/40 uppercase font-bold mb-0.5">Total</p>
                                <span className={`font-mono font-bold text-lg ${p.balance >= 0 ? 'text-[var(--color-success-light)]' : 'text-[var(--color-error-light)]'}`}>
                                  {p.balance > 0 ? '+' : ''}{p.balance}
                                </span>
                              </div>
                            </motion.div>
                          );
                        })}
                    </motion.div>

                    <div className="p-4 bg-[var(--color-dark)]/30 space-y-2">
                      <Button
                        className="w-full h-12 bg-[var(--pastel-sky)] hover:bg-[var(--pastel-sky)]/90 text-[var(--color-dark)] font-bold text-sm"
                        onClick={handleNextRound}
                        disabled={isLoading}
                      >
                        {isLoading ? <Spinner size="sm" className="text-[var(--color-dark)]" /> : (
                          <>Next Round <ChevronRight className="ml-1 w-4 h-4" /></>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full h-10 border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/20 text-sm"
                        onClick={handleEndGame}
                        disabled={isLoading}
                      >
                        <LogOut className="mr-1 w-3 h-3" /> End Game Session
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              /* Active Round Controls */
              <motion.div variants={slideUp} initial="hidden" animate="visible" className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    onClick={() => openScanner('WIN')}
                    className="h-24 text-base font-black bg-[var(--color-success)] hover:bg-[var(--color-success)]/90 text-[var(--color-dark)] rounded-xl flex-col gap-1"
                  >
                    <Trophy className="w-6 h-6" />
                    WIN
                    <span className="text-xs font-normal opacity-80">+${game.bettingValue}</span>
                  </Button>

                  <Button
                    onClick={() => openScanner('DRAW')}
                    className="h-24 text-base font-black bg-[var(--color-dark-secondary)] hover:bg-[var(--color-dark-secondary)]/90 text-[var(--color-cream)] rounded-xl flex-col gap-1"
                  >
                    <RefreshCw className="w-6 h-6" />
                    DRAW
                    <span className="text-xs font-normal opacity-80">+0</span>
                  </Button>

                  <Button
                    onClick={() => openScanner('X2')}
                    className="h-24 text-base font-black bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-dark)] rounded-xl flex-col gap-1"
                  >
                    <span className="text-xl">x2</span>
                    <span className="text-xs font-normal opacity-80">+${game.bettingValue * 2}</span>
                  </Button>
                </div>

                {/* Scanned Players List */}
                <Card className="glass-card border-0">
                  <CardHeader className="py-2">
                    <CardTitle className="text-[var(--color-cream)] text-xs uppercase tracking-wider flex justify-between">
                      <span>Round Status</span>
                      <span>{activeRoundResults.length} / {players.filter(p => !p.isHost).length} Scanned</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid gap-1.5">
                      {players.map(p => {
                        if (p.isHost) return null
                        const result = activeRoundResults.find((r) => r.playerId === p.id)?.result

                        return (
                          <div key={p.id} className={`p-2.5 rounded-lg border flex justify-between items-center text-sm ${result ? 'bg-[var(--color-dark-secondary)]/70 border-[var(--color-accent)]/20' : 'bg-[var(--color-dark)]/30 border-[var(--color-cream)]/10 opacity-50'
                            }`}>
                            <div className="font-medium text-[var(--color-cream)]">{p.name}</div>
                            <div>
                              {result === 'WIN' && <Badge className="bg-[var(--color-success)] text-[var(--color-dark)] text-xs">WIN</Badge>}
                              {result === 'DRAW' && <Badge className="bg-[var(--color-dark-secondary)] text-[var(--color-cream)] text-xs">DRAW</Badge>}
                              {result === 'X2' && <Badge className="bg-[var(--color-accent)] text-[var(--color-dark)] text-xs">X2</Badge>}
                              {!result && <Badge variant="outline" className="text-[var(--color-cream)]/40 border-[var(--color-cream)]/20 text-xs">Waiting...</Badge>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                <div className="pt-2 border-t border-[var(--color-cream)]/10">
                  <Button
                    variant="destructive"
                    className="w-full h-14 flex items-center justify-center gap-2 text-base font-bold bg-[var(--color-error)] hover:bg-[var(--color-error)]/90"
                    onClick={handleFinishRound}
                    disabled={isLoading}
                  >
                    {isLoading ? <Spinner size="sm" className="text-[var(--color-cream)]" /> : (
                      <><Skull className="w-5 h-5" /> END ROUND & SUM UP</>
                    )}
                  </Button>
                  <p className="text-center text-[var(--color-cream)]/40 text-xs mt-2">Unscanned players will automatically LOSE</p>
                </div>
              </motion.div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
