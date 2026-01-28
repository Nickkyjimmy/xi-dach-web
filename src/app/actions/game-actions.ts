'use server'

import { prisma } from "@/lib/prisma"
import { generateUniquePin } from "@/utils/game"
import { redirect } from "next/navigation"
import { TransactionType } from "@prisma/client"

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

export async function startGameWithBet(gameId: string, bettingValue: number) {
    // 1. Update Game: ACTIVE, bettingValue, currentRound = 1
    await prisma.game.update({
        where: { id: gameId },
        data: { 
            status: 'ACTIVE',
            bettingValue,
            currentRound: 1
        }
    })

    // 2. Create Round 1
    await prisma.round.create({
        data: {
            gameId,
            roundNumber: 1
        }
    })

    // 3. Update Players status
    await prisma.player.updateMany({
        where: { gameId },
        data: { status: 'PLAYING' }
    })
    
    return { success: true }
}

export async function submitScanResult(gameId: string, playerId: string, result: 'WIN' | 'DRAW' | 'X2') {
    // Get current round
    const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { 
            rounds: { 
                orderBy: { roundNumber: 'desc' }, 
                take: 1 
            } 
        }
    })
    
    if (!game || !game.rounds[0]) throw new Error("No active round")
    const roundId = game.rounds[0].id
    
    // Upsert result
    await prisma.roundResult.upsert({
        where: { roundId_playerId: { roundId, playerId } },
        create: { roundId, playerId, result },
        update: { result }
    })
    
    return { success: true }
}

export async function finishRound(gameId: string) {
    const game = await prisma.game.findUnique({
        where: { id: gameId }, 
        include: {
            rounds: { 
                orderBy: { roundNumber: 'desc' }, 
                take: 1, 
                include: { 
                    results: true,
                    transactions: true 
                } 
            },
            players: true
        }
    })
    
    if (!game || !game.rounds[0]) throw new Error("Invalid state")
    const currentRound = game.rounds[0]

    // Idempotency check: If transactions exist, round is already finished
    if (currentRound.transactions.length > 0) {
        return { success: true, message: "Round already finished" }
    }

    const currentRoundResults = currentRound.results
    const bet = game.bettingValue
    
    const processedPlayerIds = new Set(currentRoundResults.map(r => r.playerId))
    
    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
        for (const player of game.players) {
            if (player.isHost) continue
            
            let amount = 0
            let type: TransactionType = TransactionType.LOSE
            
            if (processedPlayerIds.has(player.id)) {
                const res = currentRoundResults.find(r => r.playerId === player.id)
                if (res?.result === 'WIN') {
                    amount = bet
                    type = TransactionType.WIN
                } else if (res?.result === 'DRAW') {
                    amount = 0
                    type = TransactionType.XI_BANG // Using closest equivalent or just placeholder
                } else if (res?.result === 'X2') {
                    amount = bet * 2
                    type = TransactionType.XI_DACH // Using closest equivalent
                } else if (res?.result === 'LOSE') {
                    // Start of explicit lose handling
                    amount = -bet
                    type = TransactionType.LOSE
                }
            } else {
                // Auto lose if not scanned
                amount = -bet
                type = TransactionType.LOSE
            }
            
            // Update Player Balance
            await tx.player.update({
                 where: { id: player.id },
                 data: { balance: { increment: amount } }
            })
            
            // Create Transaction Record
            await tx.transaction.create({
                data: {
                    gameId,
                    playerId: player.id,
                    amount,
                    type,
                    roundId: currentRound.id
                }
            })
        }
    })
    
    return { success: true }
}

export async function nextRound(gameId: string) {
    await prisma.$transaction(async (tx) => {
        const game = await tx.game.update({
            where: { id: gameId },
            data: { currentRound: { increment: 1 } }
        })
        
        await tx.round.create({
            data: {
                gameId,
                roundNumber: game.currentRound,
            }
        })
    })
    
    return { success: true }
}

export async function endGame(gameId: string) {
    await prisma.game.update({
        where: { id: gameId },
        data: { status: 'FINISHED' }
    })
    
    redirect('/')
}

export async function devSetupHost() {
    // 1. Create Game
    const pin = await generateUniquePin()
    const game = await prisma.game.create({
        data: {
            pin,
            hostId: "dev-host",
            status: 'ACTIVE',
            bettingValue: 100,
            currentRound: 1
        }
    })
    
    // 2. Create Round 1
    await prisma.round.create({
        data: {
            gameId: game.id,
            roundNumber: 1
        }
    })

    redirect(`/game/${game.id}/host`)
}

export async function devSetupPlayer() {
    // Find any active game or create one
    let game = await prisma.game.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }
    })
    
    if (!game) {
       const pin = await generateUniquePin()
       game = await prisma.game.create({
            data: {
                pin,
                hostId: "dev-host",
                status: 'ACTIVE',
                bettingValue: 100,
                currentRound: 1
            }
        })
        await prisma.round.create({
            data: { gameId: game.id, roundNumber: 1 }
        })
    }
    
    const randomName = "Player_" + Math.floor(Math.random() * 1000)
    
    const player = await prisma.player.create({
        data: {
            name: randomName,
            gameId: game.id,
            isHost: false,
            balance: 0,
            status: 'PLAYING'
        }
    })
    
    redirect(`/game/${game.id}/player?id=${player.id}`)
}

export async function simulateTestPlayer(gameId: string) {
    const player = await prisma.player.create({
        data: {
            name: "Test Bot " + Math.floor(Math.random() * 100),
            gameId: gameId,
            isHost: false,
            balance: 0,
            status: 'PLAYING'
        }
    })

    const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { rounds: { orderBy: { roundNumber: 'desc' }, take: 1 } }
    })

    if (game?.rounds[0]) {
        await prisma.roundResult.create({
            data: {
                roundId: game.rounds[0].id,
                playerId: player.id,
                result: 'WIN'
            }
        })
    }

    return { success: true, name: player.name }
}
