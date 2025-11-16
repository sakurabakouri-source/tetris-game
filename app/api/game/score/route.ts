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

    const { score, level, lines } = await request.json()

    if (typeof score !== 'number' || typeof level !== 'number' || typeof lines !== 'number') {
      return NextResponse.json(
        { error: 'Invalid data' },
        { status: 400 }
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

    const newScore = await prisma.score.create({
      data: {
        userId: user.id,
        score,
        level,
        lines,
      }
    })

    return NextResponse.json(
      { message: 'Score saved successfully', scoreId: newScore.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Save score error:', error)
    return NextResponse.json(
      { error: 'Failed to save score' },
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

    const scores = await prisma.score.findMany({
      where: { userId: user.id },
      orderBy: { score: 'desc' },
      take: 10,
      select: {
        id: true,
        score: true,
        level: true,
        lines: true,
        createdAt: true,
      }
    })

    return NextResponse.json(scores)
  } catch (error) {
    console.error('Get scores error:', error)
    return NextResponse.json(
      { error: 'Failed to get scores' },
      { status: 500 }
    )
  }
}