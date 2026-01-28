'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { createGame, devSetupHost, devSetupPlayer } from "./actions/game-actions"
import { useState } from "react"
import { Spinner } from "@/components/ui/spinner"

export default function Home() {
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const handleCreateGame = async () => {
    setIsCreating(true)
    await createGame()
  }

  return (
    <div className="min-h-screen bg-game-gradient flex flex-col items-center justify-center p-4">

      {/* Hero Section */}
      <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-16 h-16 bg-[var(--color-accent)] rounded-2xl mx-auto mb-4 shadow-lg flex items-center justify-center transform rotate-3 hover:rotate-6 transition-transform">
          <span className="text-3xl">&#127137;</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--color-cream)] mb-1">
          Xi Dach VN
        </h1>
        <p className="text-sm text-[var(--color-cream)]/60 font-medium">Classic Vietnamese Blackjack</p>
      </div>

      <div className="w-full max-w-sm space-y-5">

        {/* Player Zone */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader className="text-center pb-2 pt-5">
            <CardTitle className="text-xl font-bold text-[var(--color-cream)]">Join Game</CardTitle>
            <CardDescription className="text-[var(--color-cream)]/50 text-sm">Enter the PIN to start playing</CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <form
              action="/join"
              method="get"
              className="space-y-3"
              onSubmit={() => setIsJoining(true)}
            >
              <Input
                name="pin"
                type="text"
                placeholder="000000"
                className="text-center text-2xl h-14 tracking-[0.3em] font-mono font-bold bg-[var(--color-dark)]/60 border-[var(--color-accent)]/30 text-[var(--color-cream)] placeholder:text-[var(--color-cream)]/30 focus-visible:ring-[var(--color-accent)] rounded-xl"
                maxLength={6}
                required
              />
              <Button
                type="submit"
                disabled={isJoining}
                className="w-full h-12 text-sm font-bold bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-[var(--color-dark)] shadow-md rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
              >
                {isJoining ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" className="text-[var(--color-dark)]" />
                    Joining...
                  </span>
                ) : (
                  'Enter'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Host Zone */}
        <div className="text-center">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[var(--color-cream)]/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-transparent px-2 text-[var(--color-cream)]/40 font-medium tracking-wider">or host a game</span>
            </div>
          </div>

          <form action={handleCreateGame} className="mt-5">
            <Button
              variant="outline"
              type="submit"
              disabled={isCreating}
              className="h-10 px-6 border-[var(--color-accent)]/40 text-[var(--color-cream)]/80 hover:bg-[var(--color-accent)]/20 hover:text-[var(--color-cream)] hover:border-[var(--color-accent)] bg-transparent rounded-full text-sm font-medium transition-colors disabled:opacity-70"
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <Spinner size="sm" className="text-[var(--color-accent)]" />
                  Creating...
                </span>
              ) : (
                'Create a New Room'
              )}
            </Button>
          </form>
        </div>

      </div>

      <footer className="mt-12 text-center">
        <div className="flex justify-center gap-3 mb-6">
          <form action={devSetupHost}>
            <Button variant="ghost" size="sm" className="text-xs text-[var(--color-warning)] border border-[var(--color-warning)]/30 hover:bg-[var(--color-warning)]/20 h-8 px-3">
              Dev: Instant Host
            </Button>
          </form>

          <form action={devSetupPlayer}>
            <Button variant="ghost" size="sm" className="text-xs text-[var(--pastel-sky)] border border-[var(--pastel-sky)]/30 hover:bg-[var(--pastel-sky)]/20 h-8 px-3">
              Dev: Instant Player
            </Button>
          </form>
        </div>
        <p className="text-[var(--color-cream)]/30 text-xs">Xi Dach VN. Ready to deal?</p>
      </footer>
    </div>
  )
}
