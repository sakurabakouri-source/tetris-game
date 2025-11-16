import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // 各ユーザーの最高スコアを取得
    const topScores = await prisma.score.findMany({
      orderBy: { score: 'desc' },
      take: limit * 3, // 重複を考慮して多めに取得
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })

    // ユーザーごとに最高スコアのみを残す
    const uniqueScores = new Map()
    
    topScores.forEach(score => {
      if (!uniqueScores.has(score.userId) || uniqueScores.get(score.userId).score < score.score) {
        uniqueScores.set(score.userId, {
          id: score.id,
          score: score.score,
          level: score.level,
          lines: score.lines,
          userName: score.user.name || score.user.email?.split('@')[0] || 'Anonymous',
          createdAt: score.createdAt,
        })
      }
    })

    // スコア順にソートして上位を取得
    const leaderboard = Array.from(uniqueScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return NextResponse.json(leaderboard)
  } catch (error) {
    console.error('Get leaderboard error:', error)
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    )
  }
}