// ゲーム設定
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 30;
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];

// ゲーム状態
let canvas, ctx;
let gameLoop;
let gameRunning = false;
let gamePaused = false;
let score = 0;
let level = 1;
let fallSpeed = 1000;

// ゲームボード (0: 空, 1-6: 色のインデックス)
let board = [];

// 現在のブロック
let currentBlock = {
    x: 0,
    y: 0,
    shape: [],
    color: 0
};

// ブロックの形状 (2x2)
const BLOCK_SHAPES = [
    [[1, 1], [1, 1]], // 正方形
    [[1, 1], [0, 0]], // 横長
    [[1, 0], [1, 0]], // 縦長
    [[1, 1], [1, 0]], // L字型
    [[1, 1], [0, 1]]  // 逆L字型
];

// 初期化
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // ボードの初期化
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

    // イベントリスナー
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    document.addEventListener('keydown', handleKeyPress);

    // 初期描画
    drawBoard();
}

// ゲーム開始
function startGame() {
    if (gameRunning) return;

    // 既存のゲームループをクリア
    if (gameLoop) {
        clearInterval(gameLoop);
    }

    gameRunning = true;
    gamePaused = false;
    score = 0;
    level = 1;
    fallSpeed = 1000;
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

    updateScore();
    hideGameOver();
    spawnBlock();
    gameLoop = setInterval(update, fallSpeed);
}

// ゲーム再開
function restartGame() {
    startGame();
}

// 新しいブロックを生成
function spawnBlock() {
    const shapeIndex = Math.floor(Math.random() * BLOCK_SHAPES.length);
    const colorIndex = Math.floor(Math.random() * COLORS.length) + 1;

    currentBlock = {
        x: Math.floor(COLS / 2) - 1,
        y: 0,
        shape: BLOCK_SHAPES[shapeIndex],
        color: colorIndex
    };

    // ゲームオーバー判定
    if (checkCollision(currentBlock.x, currentBlock.y, currentBlock.shape)) {
        gameOver();
    }
}

// 衝突判定
function checkCollision(x, y, shape) {
    for (let row = 0; row < shape.length; row++) {
        for (let col = 0; col < shape[row].length; col++) {
            if (shape[row][col]) {
                const newX = x + col;
                const newY = y + row;

                // 範囲外チェック
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }

                // ボードとの衝突チェック
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

// ブロックを固定
function lockBlock() {
    for (let row = 0; row < currentBlock.shape.length; row++) {
        for (let col = 0; col < currentBlock.shape[row].length; col++) {
            if (currentBlock.shape[row][col]) {
                const x = currentBlock.x + col;
                const y = currentBlock.y + row;
                if (y >= 0) {
                    board[y][x] = currentBlock.color;
                }
            }
        }
    }
}

// ブロックを移動
function moveBlock(dx, dy) {
    if (!gameRunning || gamePaused) return;

    const newX = currentBlock.x + dx;
    const newY = currentBlock.y + dy;

    if (!checkCollision(newX, newY, currentBlock.shape)) {
        currentBlock.x = newX;
        currentBlock.y = newY;
        return true;
    }
    return false;
}

// ブロックを回転
function rotateBlock() {
    if (!gameRunning || gamePaused) return;

    const rotated = currentBlock.shape[0].map((_, i) =>
        currentBlock.shape.map(row => row[i]).reverse()
    );

    if (!checkCollision(currentBlock.x, currentBlock.y, rotated)) {
        currentBlock.shape = rotated;
    }
}

// ゲーム更新
function update() {
    if (!gameRunning || gamePaused) return;

    if (!moveBlock(0, 1)) {
        lockBlock();
        checkAndClearBlocks();
        spawnBlock();
    }

    drawBoard();
}

// ブロック消去チェック (EN2が実装)
function checkAndClearBlocks() {
    let blocksCleared = false;
    let clearedCount = 0;

    // 横方向のチェック
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS - 2; col++) {
            const color = board[row][col];
            if (color > 0 &&
                board[row][col + 1] === color &&
                board[row][col + 2] === color) {
                // 3つ以上連続している範囲を特定
                let endCol = col + 2;
                while (endCol < COLS && board[row][endCol] === color) {
                    endCol++;
                }
                // 消去
                for (let c = col; c < endCol; c++) {
                    board[row][c] = 0;
                    clearedCount++;
                }
                blocksCleared = true;
                col = endCol - 1;
            }
        }
    }

    // 縦方向のチェック
    for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS - 2; row++) {
            const color = board[row][col];
            if (color > 0 &&
                board[row + 1][col] === color &&
                board[row + 2][col] === color) {
                // 3つ以上連続している範囲を特定
                let endRow = row + 2;
                while (endRow < ROWS && board[endRow][col] === color) {
                    endRow++;
                }
                // 消去
                for (let r = row; r < endRow; r++) {
                    board[r][col] = 0;
                    clearedCount++;
                }
                blocksCleared = true;
                row = endRow - 1;
            }
        }
    }

    if (blocksCleared) {
        // スコア加算
        score += clearedCount * 10 * level;
        updateScore();

        // レベルアップ
        if (score >= level * 500) {
            level++;
            fallSpeed = Math.max(200, 1000 - (level - 1) * 100);
            clearInterval(gameLoop);
            gameLoop = setInterval(update, fallSpeed);
            updateScore();
        }

        // ブロックを落下させる
        applyGravity();

        // 連鎖チェック
        setTimeout(() => checkAndClearBlocks(), 100);
    }
}

// 重力を適用（ブロックを下に落とす）
function applyGravity() {
    for (let col = 0; col < COLS; col++) {
        // 下から処理
        let writePos = ROWS - 1;
        for (let row = ROWS - 1; row >= 0; row--) {
            if (board[row][col] !== 0) {
                board[writePos][col] = board[row][col];
                if (writePos !== row) {
                    board[row][col] = 0;
                }
                writePos--;
            }
        }
    }
}

// ボード描画
function drawBoard() {
    // 背景
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // グリッド
    ctx.strokeStyle = '#16213e';
    ctx.lineWidth = 1;
    for (let row = 0; row <= ROWS; row++) {
        ctx.beginPath();
        ctx.moveTo(0, row * BLOCK_SIZE);
        ctx.lineTo(COLS * BLOCK_SIZE, row * BLOCK_SIZE);
        ctx.stroke();
    }
    for (let col = 0; col <= COLS; col++) {
        ctx.beginPath();
        ctx.moveTo(col * BLOCK_SIZE, 0);
        ctx.lineTo(col * BLOCK_SIZE, ROWS * BLOCK_SIZE);
        ctx.stroke();
    }

    // ボード上のブロック
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                drawBlock(col, row, COLORS[board[row][col] - 1]);
            }
        }
    }

    // 現在のブロック
    if (gameRunning) {
        for (let row = 0; row < currentBlock.shape.length; row++) {
            for (let col = 0; col < currentBlock.shape[row].length; col++) {
                if (currentBlock.shape[row][col]) {
                    drawBlock(
                        currentBlock.x + col,
                        currentBlock.y + row,
                        COLORS[currentBlock.color - 1]
                    );
                }
            }
        }
    }
}

// 個別ブロック描画
function drawBlock(x, y, color) {
    const px = x * BLOCK_SIZE;
    const py = y * BLOCK_SIZE;

    // ブロック本体
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

    // ハイライト
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE / 3);

    // シャドウ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(px + 2, py + BLOCK_SIZE - BLOCK_SIZE / 3 - 2, BLOCK_SIZE - 4, BLOCK_SIZE / 3);
}

// キー入力処理
function handleKeyPress(e) {
    if (!gameRunning) return;

    switch(e.key) {
        case 'ArrowLeft':
            moveBlock(-1, 0);
            drawBoard();
            e.preventDefault();
            break;
        case 'ArrowRight':
            moveBlock(1, 0);
            drawBoard();
            e.preventDefault();
            break;
        case 'ArrowDown':
            if (moveBlock(0, 1)) {
                score += 1;
                updateScore();
            }
            drawBoard();
            e.preventDefault();
            break;
        case ' ':
            rotateBlock();
            drawBoard();
            e.preventDefault();
            break;
        case 'p':
        case 'P':
            togglePause();
            e.preventDefault();
            break;
    }
}

// ポーズ切り替え
function togglePause() {
    if (!gameRunning) return;
    gamePaused = !gamePaused;

    // ポーズ状態を視覚的に表示
    if (gamePaused) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSE', canvas.width / 2, canvas.height / 2);
    } else {
        drawBoard();
    }
}

// スコア更新
function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
}

// ゲームオーバー
function gameOver() {
    gameRunning = false;
    clearInterval(gameLoop);

    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').classList.remove('hidden');
}

// ゲームオーバー画面を隠す
function hideGameOver() {
    document.getElementById('gameOver').classList.add('hidden');
}

// ページ読み込み時に初期化
window.addEventListener('load', init);
