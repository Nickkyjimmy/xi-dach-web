'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRCodeGenerator } from '@/components/game/qrcode-generator'
import { useEffect, useState } from 'react'
import { Banknote, Trophy, RefreshCw } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'

export default function PlayerGamePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const gameId = params.id as string
  const supabase = createClient()
  
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [player, setPlayer] = useState<any>(null)
  const [game, setGame] = useState<any>(null)
  const [currentRound, setCurrentRound] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const urlId = searchParams.get('id')
    const localId = typeof window !== 'undefined' ? localStorage.getItem('playerId') : null
    const finalId = urlId || localId
    setPlayerId(finalId)
  }, [searchParams])

  const fetchPlayerData = async () => {
    try {
      // 1. Fetch Game state
      const { data: gameData } = await supabase
        .from('Game')
        .select('*')
        .eq('id', gameId)
        .single()
      
      if (gameData) setGame(gameData)

      // 2. Fetch Latest Round Results
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

      // 3. Fetch My Specific Player Info (for balance)
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
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!playerId) return 
    
    // Initial load
    fetchPlayerData()

    // Realtime channel for this game
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
  }, [gameId, playerId])

  const myResult = currentRound?.results?.find((r: any) => r.playerId === playerId)
  const isScanned = !!myResult

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 flex flex-col items-center">
      
      <div className="w-full max-w-sm mt-8 space-y-6">
          <div className="text-center">
             <h1 className="text-3xl font-black text-white">Player Zone</h1>
             <div className="flex items-center justify-center gap-2 mt-1">
                 <Badge variant="outline" className="text-purple-300 border-purple-500/50">
                    Round {game?.currentRound || 1}
                 </Badge>
                 {game?.status === 'FINISHED' && (
                    <Badge className="bg-red-500">GAME OVER</Badge>
                 )}
             </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3">
              <Card className="bg-white/10 border-none backdrop-blur-md">
                  <CardContent className="p-3 flex flex-col items-center">
                      <Banknote className="w-4 h-4 text-green-400 mb-1" />
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Balance</span>
                      <span className={`text-xl font-mono font-black ${player?.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {player?.balance || 0}
                      </span>
                  </CardContent>
              </Card>
              <Card className="bg-white/10 border-none backdrop-blur-md">
                  <CardContent className="p-3 flex flex-col items-center text-center">
                      <Trophy className="w-4 h-4 text-yellow-400 mb-1" />
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Status</span>
                      <div className="mt-1">
                        {isScanned ? (
                            <Badge className="bg-green-600 text-[10px] uppercase">{myResult.result}</Badge>
                        ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-700 text-[10px] uppercase">Waiting...</Badge>
                        )}
                      </div>
                  </CardContent>
              </Card>
          </div>

          <Card className="bg-white shadow-2xl border-4 border-purple-500/30 overflow-hidden">
              <CardHeader className="bg-purple-50 text-center pb-2 border-b border-purple-100">
                  <CardTitle className="text-purple-900 flex items-center justify-center gap-2">
                      {player?.name || 'Your QR'}
                  </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center pt-6 pb-8 space-y-6">
                  {playerId ? (
                      <>
                        <div className={`p-2 rounded-xl border-2 border-dashed transition-all duration-500 ${isScanned ? 'bg-green-50 border-green-200' : 'bg-white border-purple-200'}`}>
                             <QRCodeGenerator 
                                value={playerId}
                                size={220}
                             />
                        </div>
                        
                        <div className="w-full space-y-3">
                            {isScanned ? (
                                <div className="bg-green-100 p-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-green-600 p-2 rounded-full">
                                        <Trophy className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-green-800 font-bold text-sm">Scanned Successfully!</p>
                                        <p className="text-green-600 text-[10px] font-medium uppercase">Result: {myResult.result}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-3">
                                    <div className="animate-spin duration-[3000ms]">
                                        <RefreshCw className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-slate-600 font-bold text-sm">Waiting for Host...</p>
                                        <p className="text-slate-400 text-[10px] uppercase">Get your cards ready!</p>
                                    </div>
                                </div>
                            )}
                        </div>
                      </>
                  ) : (
                      <div className="text-center py-10">
                          <p className="text-red-500 font-bold">No Player ID found</p>
                          <p className="text-slate-400 text-sm mt-2">Join via the main menu first</p>
                      </div>
                  )}
              </CardContent>
          </Card>

          <footer className="text-center text-white/40 text-[11px] font-medium uppercase tracking-widest">
              Show scan to Host • Game ID: {gameId.slice(0, 8)}...
          </footer>
      </div>
    </div>
  )
}
