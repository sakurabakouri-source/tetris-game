'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  createEmptyBoard,
  getRandomTetromino,
  rotateTetromino,
  isValidMove,
  mergeTetromino,
  clearLines,
  calculateScore,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  type Tetromino,
  type Position,
} from '@/lib/tetris'

export default function GamePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  const [board, setBoard] = useState(createEmptyBoard())
  const [currentTetromino, setCurrentTetromino] = useState<Tetromino | null>(null)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lines, setLines] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [nextTetromino, setNextTetromino] = useState<Tetromino | null>(null)
  
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const touchStartRef = useRef<{ x: number, y: number } | null>(null)

  // 認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const session = await response.json()
        
        if (!session || !session.user) {
          router.push('/login')
        } else {
          setIsAuthenticated(true)
        }
      } catch (error) {
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [router])

  // 新しいテトロミノを生成
  const spawnTetromino = useCallback(() => {
    const tetromino = nextTetromino || getRandomTetromino()
    const newPosition = { x: Math.floor(BOARD_WIDTH / 2) - 1, y: 0 }
    
    if (!isValidMove(board, tetromino, newPosition)) {
      setGameOver(true)
      saveScore()
      return
    }
    
    setCurrentTetromino(tetromino)
    setPosition(newPosition)
    setNextTetromino(getRandomTetromino())
  }, [board, nextTetromino])

  // ゲーム開始
  useEffect(() => {
    if (!currentTetromino && !gameOver && isAuthenticated) {
      spawnTetromino()
    }
  }, [currentTetromino, gameOver, spawnTetromino, isAuthenticated])

  // テトロミノを下に移動
  const moveDown = useCallback(() => {
    if (!currentTetromino || isPaused || gameOver) return

    const newPosition = { ...position, y: position.y + 1 }
    
    if (isValidMove(board, currentTetromino, newPosition)) {
      setPosition(newPosition)
    } else {
      // テトロミノを固定
      const newBoard = mergeTetromino(board, currentTetromino, position)
      const { board: clearedBoard, linesCleared } = clearLines(newBoard)
      
      setBoard(clearedBoard)
      setLines(prev => prev + linesCleared)
      setScore(prev => prev + calculateScore(linesCleared, level))
      
      if (linesCleared > 0 && lines + linesCleared >= level * 10) {
        setLevel(prev => prev + 1)
      }
      
      setCurrentTetromino(null)
    }
  }, [currentTetromino, position, board, isPaused, gameOver, level, lines])

  // ゲームループ
  useEffect(() => {
    if (gameOver || isPaused || !isAuthenticated) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
      return
    }

    const speed = Math.max(100, 1000 - (level - 1) * 100)
    gameLoopRef.current = setInterval(moveDown, speed)

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [moveDown, gameOver, isPaused, level, isAuthenticated])

  // 左右移動
  const moveHorizontal = useCallback((direction: number) => {
    if (!currentTetromino || isPaused || gameOver) return

    const newPosition = { ...position, x: position.x + direction }
    
    if (isValidMove(board, currentTetromino, newPosition)) {
      setPosition(newPosition)
    }
  }, [currentTetromino, position, board, isPaused, gameOver])

  // 回転
  const rotate = useCallback(() => {
    if (!currentTetromino || isPaused || gameOver) return

    const rotated = {
      ...currentTetromino,
      shape: rotateTetromino(currentTetromino.shape),
    }
    
    if (isValidMove(board, rotated, position)) {
      setCurrentTetromino(rotated)
    }
  }, [currentTetromino, position, board, isPaused, gameOver])

  // ハードドロップ
  const hardDrop = useCallback(() => {
    if (!currentTetromino || isPaused || gameOver) return

    let newPosition = { ...position }
    
    while (isValidMove(board, currentTetromino, { ...newPosition, y: newPosition.y + 1 })) {
      newPosition.y++
    }
    
    setPosition(newPosition)
    setTimeout(moveDown, 0)
  }, [currentTetromino, position, board, isPaused, gameOver, moveDown])

  // キーボード操作
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameOver) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          moveHorizontal(-1)
          break
        case 'ArrowRight':
          e.preventDefault()
          moveHorizontal(1)
          break
        case 'ArrowDown':
          e.preventDefault()
          moveDown()
          break
        case 'ArrowUp':
          e.preventDefault()
          rotate()
          break
        case ' ':
          e.preventDefault()
          hardDrop()
          break
        case 'p':
        case 'P':
          setIsPaused(prev => !prev)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [moveHorizontal, moveDown, rotate, hardDrop, gameOver])

  // タッチ操作
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > 30) {
        moveHorizontal(deltaX > 0 ? 1 : -1)
      }
    } else {
      if (deltaY > 30) {
        moveDown()
      } else if (deltaY < -30) {
        rotate()
      }
    }

    touchStartRef.current = null
  }

  // スコア保存
  const saveScore = async () => {
    try {
      await fetch('/api/game/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, level, lines }),
      })
    } catch (error) {
      console.error('Failed to save score:', error)
    }
  }

  // ゲームリセット
  const resetGame = () => {
    setBoard(createEmptyBoard())
    setCurrentTetromino(null)
    setPosition({ x: 0, y: 0 })
    setScore(0)
    setLevel(1)
    setLines(0)
    setGameOver(false)
    setIsPaused(false)
    setNextTetromino(null)
  }

  // ボードをレンダリング
  const renderBoard = () => {
    const displayBoard = board.map(row => [...row])
    
    if (currentTetromino) {
      currentTetromino.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell && position.y + y >= 0) {
            displayBoard[position.y + y][position.x + x] = 2
          }
        })
      })
    }

    return displayBoard
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">読み込み中...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const displayBoard = renderBoard()

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">🎮 テトリス</h1>
        
        <div className="flex flex-col lg:flex-row gap-8 justify-center items-start">
          {/* ゲームボード */}
          <div className="flex flex-col items-center">
            <div
              className="bg-gray-800 p-2 rounded-lg shadow-2xl"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="grid gap-[1px] bg-gray-700">
                {displayBoard.map((row, y) => (
                  <div key={y} className="flex gap-[1px]">
                    {row.map((cell, x) => (
                      <div
                        key={x}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-sm"
                        style={{
                          backgroundColor:
                            cell === 2
                              ? currentTetromino?.color
                              : cell === 1
                              ? '#4a5568'
                              : '#1a202c',
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* モバイル操作ボタン */}
            <div className="mt-4 lg:hidden">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => moveHorizontal(-1)}
                  className="bg-blue-600 px-6 py-4 rounded-lg text-xl font-bold"
                >
                  ←
                </button>
                <button
                  onClick={rotate}
                  className="bg-purple-600 px-6 py-4 rounded-lg text-xl font-bold"
                >
                  ↻
                </button>
                <button
                  onClick={() => moveHorizontal(1)}
                  className="bg-blue-600 px-6 py-4 rounded-lg text-xl font-bold"
                >
                  →
                </button>
                <button
                  onClick={moveDown}
                  className="bg-green-600 px-6 py-4 rounded-lg text-xl font-bold"
                >
                  ↓
                </button>
                <button
                  onClick={hardDrop}
                  className="bg-red-600 px-6 py-4 rounded-lg text-xl font-bold"
                >
                  DROP
                </button>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="bg-yellow-600 px-6 py-4 rounded-lg text-xl font-bold"
                >
                  {isPaused ? '▶' : '⏸'}
                </button>
              </div>
            </div>
          </div>

          {/* サイドパネル */}
          <div className="space-y-6">
            {/* スコア */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-2xl font-bold mb-4">スコア</h2>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-yellow-400">{score}</p>
                <p>レベル: {level}</p>
                <p>ライン: {lines}</p>
              </div>
            </div>

            {/* 次のブロック */}
            {nextTetromino && (
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4">次のブロック</h2>
                <div className="flex justify-center">
                  <div className="grid gap-[2px]">
                    {nextTetromino.shape.map((row, y) => (
                      <div key={y} className="flex gap-[2px]">
                        {row.map((cell, x) => (
                          <div
                            key={x}
                            className="w-6 h-6 rounded-sm"
                            style={{
                              backgroundColor: cell ? nextTetromino.color : '#1a202c',
                            }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 操作説明 */}
            <div className="bg-gray-800 p-6 rounded-lg hidden lg:block">
              <h2 className="text-xl font-bold mb-4">操作方法</h2>
              <ul className="space-y-2 text-sm">
                <li>← →: 左右移動</li>
                <li>↑: 回転</li>
                <li>↓: 下に移動</li>
                <li>スペース: ハードドロップ</li>
                <li>P: 一時停止</li>
              </ul>
            </div>

            {/* ボタン */}
            <div className="space-y-3">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="w-full bg-yellow-600 hover:bg-yellow-700 px-6 py-3 rounded-lg font-bold"
                disabled={gameOver}
              >
                {isPaused ? '再開' : '一時停止'}
              </button>
              <button
                onClick={resetGame}
                className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold"
              >
                新しいゲーム
              </button>
              <button
                onClick={() => router.push('/leaderboard')}
                className="w-full bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold"
              >
                ランキング
              </button>
            </div>
          </div>
        </div>

        {/* ゲームオーバー */}
        {gameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg text-center max-w-md">
              <h2 className="text-3xl font-bold mb-4">ゲームオーバー!</h2>
              <p className="text-xl mb-2">スコア: {score}</p>
              <p className="mb-6">レベル: {level} | ライン: {lines}</p>
              <button
                onClick={resetGame}
                className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-bold"
              >
                もう一度プレイ
              </button>
            </div>
          </div>
        )}

        {/* 一時停止 */}
        {isPaused && !gameOver && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg text-center">
              <h2 className="text-3xl font-bold mb-4">一時停止中</h2>
              <button
                onClick={() => setIsPaused(false)}
                className="bg-green-600 hover:bg-green-700 px-8 py-3 rounded-lg font-bold"
              >
                再開
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}