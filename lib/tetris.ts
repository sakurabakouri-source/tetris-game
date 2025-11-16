export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

export interface Position {
  x: number
  y: number
}

export interface Tetromino {
  shape: number[][]
  color: string
  type: TetrominoType
}

export const TETROMINOS: Record<TetrominoType, Omit<Tetromino, 'type'>> = {
  I: {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: '#00f0f0',
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: '#f0f000',
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#a000f0',
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: '#00f000',
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: '#f00000',
  },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#0000f0',
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#f0a000',
  },
}

export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 20

export function createEmptyBoard(): number[][] {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))
}

export function getRandomTetromino(): Tetromino {
  const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
  const randomType = types[Math.floor(Math.random() * types.length)]
  return {
    ...TETROMINOS[randomType],
    type: randomType,
  }
}

export function rotateTetromino(shape: number[][]): number[][] {
  const rotated = shape[0].map((_, index) =>
    shape.map(row => row[index]).reverse()
  )
  return rotated
}

export function isValidMove(
  board: number[][],
  tetromino: Tetromino,
  position: Position
): boolean {
  for (let y = 0; y < tetromino.shape.length; y++) {
    for (let x = 0; x < tetromino.shape[y].length; x++) {
      if (tetromino.shape[y][x]) {
        const newX = position.x + x
        const newY = position.y + y

        if (
          newX < 0 ||
          newX >= BOARD_WIDTH ||
          newY >= BOARD_HEIGHT ||
          (newY >= 0 && board[newY][newX])
        ) {
          return false
        }
      }
    }
  }
  return true
}

export function mergeTetromino(
  board: number[][],
  tetromino: Tetromino,
  position: Position
): number[][] {
  const newBoard = board.map(row => [...row])
  
  for (let y = 0; y < tetromino.shape.length; y++) {
    for (let x = 0; x < tetromino.shape[y].length; x++) {
      if (tetromino.shape[y][x]) {
        const newY = position.y + y
        if (newY >= 0) {
          newBoard[newY][position.x + x] = 1
        }
      }
    }
  }
  
  return newBoard
}

export function clearLines(board: number[][]): { board: number[][], linesCleared: number } {
  const newBoard = board.filter(row => row.some(cell => cell === 0))
  const linesCleared = BOARD_HEIGHT - newBoard.length
  
  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array(BOARD_WIDTH).fill(0))
  }
  
  return { board: newBoard, linesCleared }
}

export function calculateScore(linesCleared: number, level: number): number {
  const baseScores = [0, 100, 300, 500, 800]
  return baseScores[linesCleared] * level
}