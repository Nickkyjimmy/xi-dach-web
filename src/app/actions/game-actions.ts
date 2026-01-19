'use server'

import { prisma } from "@/lib/prisma"
import { generateUniquePin } from "@/utils/game"
import { redirect } from "next/navigation"

export async function createGame() {
    try {
        // TODO: Get actual user ID from Supabase auth
        const hostId = "temp-host-id" 

        console.log('[createGame] Generating PIN...')
        const pin = await generateUniquePin()
        console.log('[createGame] Generated PIN:', pin)
        
        console.log('[createGame] Creating game in database...')
        const game = await prisma.game.create({
            data: {
                pin,
                hostId,
                status: 'LOBBY',
            }
        })
        console.log('[createGame] Game created successfully:', game.id)

        redirect(`/lobby/${game.id}`)
    } catch (error) {
        console.error('[createGame] Error:', error)
        throw error
    }
}

export async function joinGameWithNickname(pin: string, nickname: string) {
    try {
        console.log('[joinGame] Looking for game with PIN:', pin)
        
        const game = await prisma.game.findUnique({
            where: { pin }
        })

        if (!game) {
            console.log('[joinGame] Game not found for PIN:', pin)
            return { error: 'Invalid PIN. Game not found.' }
        }

        // Check game status
        if (game.status === 'FINISHED') {
            console.log('[joinGame] Game has ended:', game.id)
            return { error: 'Game has ended.' }
        }

        // Allow joining if LOBBY or ACTIVE
        if (game.status !== 'LOBBY' && game.status !== 'ACTIVE') {
            console.log('[joinGame] Invalid game status:', game.status)
            return { error: 'Cannot join this game.' }
        }

        console.log('[joinGame] Creating player:', nickname, 'for game status:', game.status)
        
        // Set initial player status based on game status
        const initialPlayerStatus = game.status === 'ACTIVE' ? 'PLAYING' : 'WAITING'
        
        const player = await prisma.player.create({
            data: {
                name: nickname,
                gameId: game.id,
                isHost: false,
                balance: 0,
                status: initialPlayerStatus
            }
        })
        
        console.log('[joinGame] Player created:', player.id, 'with status:', initialPlayerStatus)
        
        // Determine redirect URL based on game status
        const redirectUrl = game.status === 'ACTIVE' 
            ? `/game/${game.id}/player`   // Game already started -> go to player view
            : `/game/${game.id}/waiting`  // Game in lobby -> go to waiting room
        
        console.log('[joinGame] Redirecting to:', redirectUrl)
        
        return {
            success: true,
            playerId: player.id,
            gameId: game.id,
            redirectUrl: redirectUrl
        }
    } catch (error) {
        console.error('[joinGame] Error:', error)
        return { error: 'Failed to join game. Please try again.' }
    }
}

export async function startGame(gameId: string) {
    const game = await prisma.game.update({
        where: { id: gameId },
        data: { status: 'ACTIVE' },
        include: {
            players: true
        }
    })

    if (game.players.length < 2) {
        throw new Error('Need at least 2 players to start the game')
    }

    // Update all players to PLAYING status
    await prisma.player.updateMany({
        where: { gameId },
        data: { status: 'PLAYING' }
    })

    redirect(`/game/${gameId}/host`)
}
