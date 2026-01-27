import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log('[API] Fetching game:', id)
    
    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        players: {
          orderBy: {
            createdAt: 'asc'
          }
        },
        rounds: {
          orderBy: { roundNumber: 'desc' },
          take: 1,
          include: {
            results: true,
            transactions: true
          }
        }
      }
    })
    
    if (!game) {
      console.log('[API] Game not found:', id)
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      game: {
        id: game.id,
        pin: game.pin,
        status: game.status,
        bettingValue: game.bettingValue,
        currentRound: game.currentRound,
        updatedAt: new Date().toISOString()
      },
      players: game.players,
      currentRound: game.rounds[0] || null
    })
  } catch (error) {
    console.error('Error fetching game:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
