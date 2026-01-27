import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createGame, devSetupHost, devSetupPlayer } from "./actions/game-actions"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      
      {/* Hero Section */}
      <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-20 h-20 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-2xl mx-auto mb-6 shadow-xl shadow-purple-900/20 flex items-center justify-center transform rotate-3 hover:rotate-6 transition-transform">
          <span className="text-4xl">🂡</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-2 drop-shadow-md">
          Xì Dách VN
        </h1>
        <p className="text-slate-400 font-medium">Classic Vietnamese Blackjack</p>
      </div>

      <div className="w-full max-w-md space-y-6">
        
        {/* Player Zone */}
        <Card className="border-0 bg-white/5 backdrop-blur-lg shadow-2xl ring-1 ring-white/10">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold text-white">Join Game</CardTitle>
            <CardDescription className="text-slate-400">Enter the PIN to start playing</CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/join" method="get" className="space-y-4">
              <Input 
                name="pin"
                type="text" 
                placeholder="000 000" 
                className="text-center text-3xl h-16 tracking-[0.5em] font-mono font-bold bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-700 focus-visible:ring-purple-500 rounded-xl"
                maxLength={6}
                required
              />
              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Enter
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Host Zone */}
        <div className="text-center">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-950 px-2 text-slate-500 font-medium tracking-wider">or host a game</span>
                </div>
            </div>
            
            <form action={createGame} className="mt-6">
                <Button 
                    variant="outline" 
                    type="submit"
                    className="h-11 px-8 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white bg-transparent rounded-full font-medium transition-colors"
                >
                    Create a New Room
                </Button>
            </form>
        </div>

      </div>
      
      <footer className="mt-16 text-center">
        <div className="flex justify-center gap-4 mb-8">
            <form action={devSetupHost}>
                <Button variant="ghost" className="text-xs text-yellow-600 border border-yellow-900/30 hover:bg-yellow-900/20">
                    🛠️ Dev: Instant Host
                </Button>
            </form>

            <form action={devSetupPlayer}>
                 <Button variant="ghost" className="text-xs text-blue-500 border border-blue-900/30 hover:bg-blue-900/20">
                    🛠️ Dev: Instant Player
                </Button>
            </form>
        </div>
        <p className="text-slate-600 text-sm">© 2024 Xì Dách VN. Ready to deal?</p>
      </footer>
    </div>
  )
}
