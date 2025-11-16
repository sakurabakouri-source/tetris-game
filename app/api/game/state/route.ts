import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await auth()
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { board, score, level, lines, paused } = await request.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 既存のゲーム状態を削除（1ユーザー1ゲーム状態のみ保存）
    await prisma.gameState.deleteMany({
      where: { userId: user.id }
    })

    // 新しいゲーム状態を保存
    const gameState = await prisma.gameState.create({
      data: {
        userId: user.id,
        board: JSON.stringify(board),
        score,
        level,
        lines,
        paused,
      }
    })

    return NextResponse.json(
      { message: 'Game state saved successfully', stateId: gameState.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Save game state error:', error)
    return NextResponse.json(
      { error: 'Failed to save game state' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const gameState = await prisma.gameState.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' }
    })

    if (!gameState) {
      return NextResponse.json(
        { message: 'No saved game state' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      board: JSON.parse(gameState.board),
      score: gameState.score,
      level: gameState.level,
      lines: gameState.lines,
      paused: gameState.paused,
      updatedAt: gameState.updatedAt,
    })
  } catch (error) {
    console.error('Get game state error:', error)
    return NextResponse.json(
      { error: 'Failed to get game state' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    await prisma.gameState.deleteMany({
      where: { userId: user.id }
    })

    return NextResponse.json(
      { message: 'Game state deleted successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Delete game state error:', error)
    return NextResponse.json(
      { error: 'Failed to delete game state' },
      { status: 500 }
    )
  }
}