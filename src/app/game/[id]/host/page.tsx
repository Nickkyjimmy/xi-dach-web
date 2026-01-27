'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { QrCode, Info, Banknote, Trophy, Users, ChevronRight, RefreshCw, Skull, LogOut } from 'lucide-react'
import { QRCodeGenerator } from '@/components/game/qrcode-generator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { startGameWithBet, submitScanResult, finishRound, nextRound, simulateTestPlayer, endGame } from '@/app/actions/game-actions'
import { QRScanner } from '@/components/game/qr-scanner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { createClient } from '@/lib/supabase/client'

export default function HostGamePage() {
  const params = useParams()
  const gameId = params.id as string
  const supabase = createClient()
  
  const [game, setGame] = useState<any>(null)
  const [players, setPlayers] = useState<any[]>([])
  const [currentRound, setCurrentRound] = useState<any>(null)
  
  const [bettingValue, setBettingValue] = useState<number>(100)
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scanType, setScanType] = useState<'WIN' | 'DRAW' | 'X2'>('WIN')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch Game Data directly from Supabase (Bypass Vercel API for 0 execution cost)
  const fetchGameData = async () => {
    try {
      // 1. Fetch Game
      const { data: gameData, error: gameError } = await supabase
        .from('Game')
        .select('*')
        .eq('id', gameId)
        .single()
      
      if (gameError || !gameData) throw gameError

      // 2. Fetch Players
      const { data: playerData, error: playersError } = await supabase
        .from('Player')
        .select('*')
        .eq('gameId', gameId)
        .order('createdAt', { ascending: true })

      if (playersError) throw playersError

      // 3. Fetch Latest Round with Results and Transactions
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
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchGameData()

    // Optimized Realtime Subscription
    // Instead of polling every 2s, we only refresh when something actually changes in the DB
    const channel = supabase
      .channel(`game-updates-${gameId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', filter: `gameId=eq.${gameId}` }, 
        () => {
          console.log('[Realtime] Change detected, refreshing...')
          fetchGameData()
        }
      )
      // Special case for Game table updates (like status change)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'Game', filter: `id=eq.${gameId}` },
        () => fetchGameData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [gameId])

  const joinUrl = typeof window !== 'undefined' && game?.pin 
    ? `${window.location.origin}/join?pin=${game.pin}` 
    : ''

  // Actions
  const handleStartGame = async () => {
    setIsLoading(true)
    try {
        await startGameWithBet(gameId, Number(bettingValue))
        // Optimistic update will happen on next poll or we can force fetch
        // give it a sec to propagate
        setTimeout(fetchGameData, 500)
    } catch (err) {
        alert("Failed to start game")
    } finally {
        setIsLoading(false)
    }
  }

  const openScanner = (type: 'WIN' | 'DRAW' | 'X2') => {
      setScanType(type)
      setShowScanner(true)
  }

  const handleScan = async (decodedText: string) => {
      // Assuming decodedText is playerId or contains it
      try {
          // Parse if JSON
          let playerId = decodedText
          try {
              const parsed = JSON.parse(decodedText)
              if (parsed.playerId) playerId = parsed.playerId
          } catch (e) {
              // Not JSON, use raw text
          }

          // Verify player belongs to game
          const player = players.find(p => p.id === playerId)
          if (!player) {
              console.log("Player not found in this game:", playerId)
              // Optional: Show error toast
              return
          }

          await submitScanResult(gameId, playerId, scanType)
          // Play sound?
          // Don't close scanner, allow multi scan
          // Force fetch to show updated list
          fetchGameData()
      } catch (err) {
          console.error("Scan submit error", err)
      }
  }

  const handleFinishRound = async () => {
      if (!confirm("Are you sure you want to end this round? Unscanned players will lose.")) return
      setIsLoading(true)
      try {
          await finishRound(gameId)
          await fetchGameData()
      } catch (err) {
          alert("Error finishing round")
      } finally {
          setIsLoading(false)
      }
  }

  const handleNextRound = async () => {
       setIsLoading(true)
       try {
           await nextRound(gameId)
           await fetchGameData()
       } catch (err) {
           alert("Error starting next round")
       } finally {
           setIsLoading(false)
       }
  }

  const handleSimulatePlayer = async () => {
      setIsLoading(true)
      try {
          await simulateTestPlayer(gameId)
          fetchGameData()
      } catch (err) {
          console.error("Simulation failed", err)
      } finally {
          setIsLoading(false)
      }
  }

  const handleEndGame = async () => {
      if (!confirm("Are you sure you want to end the entire game? This will return everyone to the home page.")) return
      setIsLoading(true)
      try {
          await endGame(gameId)
      } catch (err) {
          alert("Error ending game")
      } finally {
          setIsLoading(false)
      }
  }

  // Derived State
  // Round is finished if it has transactions
  const isRoundFinished = currentRound?.transactions && currentRound.transactions.length > 0
  const activeRoundResults = currentRound?.results || []

  // Renders
  if (!game) return <div className="text-white p-10">Loading...</div>

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 pb-20">
      
      {/* Scanner Overlay */}
      {showScanner && (
          <QRScanner 
            onScan={handleScan} 
            onClose={() => setShowScanner(false)} 
            title={`Scanning for ${scanType}`}
          />
      )}

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              XiDach Host <Badge variant="outline" className="text-yellow-400 border-yellow-400">ADMIN</Badge>
            </h1>
            <p className="text-slate-400 text-sm">PIN: <span className="text-white font-mono font-bold tracking-widest">{game.pin}</span></p>
          </div>
          
          <div className="flex gap-2">
            <Button 
                size="sm" 
                variant="outline" 
                className="bg-purple-900/40 border-purple-500/30 text-purple-300 hover:bg-purple-800/40"
                onClick={handleSimulatePlayer}
                disabled={isLoading}
            >
                Bot Join & Win
            </Button>

            <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2">
                  <QrCode className="w-4 h-4" /> Join QR
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 text-white border-slate-700">
                 <DialogHeader>
                     <DialogTitle>Join Game</DialogTitle>
                 </DialogHeader>
                 <div className="flex flex-col items-center p-4 space-y-4">
                     <div className="text-4xl font-mono font-black text-yellow-400 tracking-[0.5em]">{game.pin}</div>
                     {joinUrl && (
                      <div className="bg-white p-2 rounded-xl">
                          <QRCodeGenerator value={joinUrl} size={200} />
                      </div>
                     )}
                 </div>
              </DialogContent>
            </Dialog>
          </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
          
          {/* LOBBY STATE */}
          {game.status === 'LOBBY' && (
              <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2">
                          <Banknote className="text-green-400" /> Game Setup
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="space-y-2">
                          <label className="text-sm text-slate-400">Betting Value per Round</label>
                          <div className="flex gap-4">
                              <Input 
                                type="number" 
                                value={bettingValue} 
                                onChange={(e) => setBettingValue(Number(e.target.value))}
                                className="bg-slate-900 border-slate-600 text-white text-lg"
                              />
                          </div>
                      </div>
                      
                      <div className="pt-4">
                          <Button 
                            size="lg" 
                            className="w-full bg-green-600 hover:bg-green-700 font-bold text-lg"
                            onClick={handleStartGame}
                            disabled={isLoading}
                          >
                             Start Game
                          </Button>
                      </div>

                      <div className="mt-8">
                          <h3 className="text-slate-400 font-bold mb-2">Players in Lobby ({players.length})</h3>
                          <div className="grid grid-cols-2 gap-2">
                              {players.map(p => (
                                  <div key={p.id} className="bg-slate-900 p-3 rounded-lg flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                      {p.name}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </CardContent>
              </Card>
          )}

          {/* ACTIVE GAME STATE */}
          {game.status === 'ACTIVE' && (
              <>
                {/* Round Info */}
                <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-6 rounded-2xl shadow-xl flex justify-between items-center text-white">
                    <div>
                        <p className="text-indigo-200 text-sm uppercase font-bold tracking-wider">Current Round</p>
                        <p className="text-4xl font-black">#{game.currentRound}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-indigo-200 text-sm uppercase font-bold tracking-wider">Betting Value</p>
                        <p className="text-4xl font-black text-green-400">${game.bettingValue}</p>
                    </div>
                </div>

                {/* Round Finished - LEADERBOARD */}
                {isRoundFinished ? (
                   <Card className="bg-slate-800 border-none shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                       <CardHeader className="bg-yellow-500/10 border-b border-yellow-500/20">
                           <CardTitle className="text-yellow-400 flex items-center gap-2 text-2xl">
                               <Trophy className="w-6 h-6" /> Round Finished!
                           </CardTitle>
                       </CardHeader>
                       <CardContent className="p-0">
                           <div className="divide-y divide-slate-700">
                               {players
                                .sort((a, b) => b.balance - a.balance)
                                .map((p, idx) => {
                                   const transaction = currentRound?.transactions?.find((t: any) => t.playerId === p.id);
                                   const roundAmount = transaction?.amount || 0;
                                   
                                   return (
                                       <div key={p.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                           <div className="flex items-center gap-4">
                                               <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold flex-shrink-0 ${
                                                   idx === 0 ? 'bg-yellow-500 text-black' : 
                                                   idx === 1 ? 'bg-slate-300 text-black' : 
                                                   idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-400'
                                               }`}>
                                                   {idx + 1}
                                               </span>
                                               <div className="flex flex-col">
                                                   <span className="font-bold text-lg leading-tight">{p.name}</span>
                                                   {transaction && (
                                                       <span className={`text-[10px] font-black uppercase tracking-widest ${roundAmount > 0 ? 'text-green-400' : roundAmount < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                                           {roundAmount > 0 ? 'Won' : roundAmount < 0 ? 'Lost' : 'Draw'}: {roundAmount > 0 ? '+' : ''}{roundAmount}
                                                       </span>
                                                   )}
                                                </div>
                                           </div>
                                           <div className="text-right">
                                               <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mb-1">Total Points</p>
                                               <span className={`font-mono font-bold text-xl ${p.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                   {p.balance > 0 ? '+' : ''}{p.balance}
                                               </span>
                                           </div>
                                       </div>
                                   );
                                })}
                           </div>
                           
                           <div className="p-6 bg-slate-900/50 space-y-3">
                               <Button 
                                className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6 shadow-lg shadow-blue-900/20"
                                onClick={handleNextRound}
                                disabled={isLoading}
                               >
                                   Start Next Round <ChevronRight className="ml-2 w-5 h-5" />
                               </Button>

                               <Button 
                                variant="outline"
                                className="w-full border-slate-700 hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/50 py-6"
                                onClick={handleEndGame}
                                disabled={isLoading}
                               >
                                   <LogOut className="mr-2 w-4 h-4" /> End Game Session
                               </Button>
                           </div>
                       </CardContent>
                   </Card>
                ) : (
                    /* Active Round Controls */
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Button 
                                onClick={() => openScanner('WIN')}
                                className="h-32 text-2xl font-black bg-green-600 hover:bg-green-500 border-b-4 border-green-800 active:border-b-0 active:translate-y-1 transition-all rounded-xl"
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <Trophy className="w-8 h-8" />
                                    WIN
                                    <span className="text-sm font-normal opacity-80">+${game.bettingValue}</span>
                                </div>
                            </Button>
                            
                            <Button 
                                onClick={() => openScanner('DRAW')}
                                className="h-32 text-2xl font-black bg-slate-600 hover:bg-slate-500 border-b-4 border-slate-800 active:border-b-0 active:translate-y-1 transition-all rounded-xl"
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <RefreshCw className="w-8 h-8" />
                                    DRAW
                                    <span className="text-sm font-normal opacity-80">+0</span>
                                </div>
                            </Button>

                            <Button 
                                onClick={() => openScanner('X2')}
                                className="h-32 text-2xl font-black bg-purple-600 hover:bg-purple-500 border-b-4 border-purple-800 active:border-b-0 active:translate-y-1 transition-all rounded-xl"
                            >
                                <div className="flex flex-col items-center gap-2">
                                    <span className="text-3xl">x2</span>
                                    PRIZE
                                    <span className="text-sm font-normal opacity-80 text-center">+${game.bettingValue * 2}</span>
                                </div>
                            </Button>
                        </div>

                        {/* Scanned Players List */}
                        <Card className="bg-slate-800 border-slate-700">
                             <CardHeader>
                                 <CardTitle className="text-white text-sm uppercase tracking-wider flex justify-between">
                                     <span>Round Status</span>
                                     <span>{activeRoundResults.length} / {players.filter(p => !p.isHost).length} Scanned</span>
                                 </CardTitle>
                             </CardHeader>
                             <CardContent>
                                 <div className="grid gap-2">
                                     {players.map(p => {
                                         if (p.isHost) return null
                                         const result = activeRoundResults.find((r: any) => r.playerId === p.id)?.result
                                         
                                         return (
                                             <div key={p.id} className={`p-3 rounded-lg border flex justify-between items-center ${
                                                 result ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-900 border-slate-800 opacity-50'
                                             }`}>
                                                 <div className="font-medium">{p.name}</div>
                                                 <div>
                                                     {result === 'WIN' && <Badge className="bg-green-500">WIN</Badge>}
                                                     {result === 'DRAW' && <Badge className="bg-gray-500">DRAW</Badge>}
                                                     {result === 'X2' && <Badge className="bg-purple-500">X2 PRIZE</Badge>}
                                                     {!result && <Badge variant="outline" className="text-slate-500 border-slate-600">Waiting...</Badge>}
                                                 </div>
                                             </div>
                                         )
                                     })}
                                 </div>
                             </CardContent>
                        </Card>
                        
                        <div className="pt-4 border-t border-slate-800">
                            <Button 
                                variant="destructive" 
                                size="lg" 
                                className="w-full flex items-center justify-center gap-2 py-8 text-xl font-bold"
                                onClick={handleFinishRound}
                                disabled={isLoading}
                            >
                                <Skull className="w-6 h-6" /> END ROUND & SUM UP
                            </Button>
                            <p className="text-center text-slate-500 text-sm mt-3">Unscanned players will automatically LOSE</p>
                        </div>
                    </div>
                )}
              </>
          )}

      </div>
    </div>
  )
}
