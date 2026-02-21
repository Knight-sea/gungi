// コマの種類と移動ルール定義（dr: 行の移動, dc: 列の移動）
// ※ 先手(黒)から見た動き。後手(白)は移動方向が反転します。
const PIECE_TYPES = {
    '帥': { slide: false, moves: [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]] },
    '兵': { slide: false, moves: [[-1,0]] },
    '忍': { slide: false, moves: [[-1,0], [1,0], [0,-1], [0,1]] },
    '中': { slide: false, moves: [[-1,-1], [-1,1], [1,-1], [1,1]] },
    '砦': { slide: true,  moves: [[-1,0], [1,0], [0,-1], [0,1]] }, // どこまでも進める
    '筒': { slide: true,  moves: [[-1,0], [1,0]] }
};

// 9x9の初期盤面データ (nullは空マス)
// 先手(黒)は下側(row 6~8)、後手(白)は上側(row 0~2)
let board = Array.from({ length: 9 }, () => Array(9).fill(null));

// 初期配置を手動でセット
function setupBoard() {
    // 後手（白）
    board[0][4] = { type: '帥', player: 'white' };
    board[0][0] = { type: '砦', player: 'white' };
    board[0][8] = { type: '砦', player: 'white' };
    board[1][2] = { type: '筒', player: 'white' };
    board[1][6] = { type: '筒', player: 'white' };
    board[0][3] = { type: '忍', player: 'white' };
    board[0][5] = { type: '忍', player: 'white' };
    for (let i = 0; i < 9; i++) board[2][i] = { type: '兵', player: 'white' };

    // 先手（黒）
    board[8][4] = { type: '帥', player: 'black' };
    board[8][0] = { type: '砦', player: 'black' };
    board[8][8] = { type: '砦', player: 'black' };
    board[7][2] = { type: '筒', player: 'black' };
    board[7][6] = { type: '筒', player: 'black' };
    board[8][3] = { type: '忍', player: 'black' };
    board[8][5] = { type: '忍', player: 'black' };
    for (let i = 0; i < 9; i++) board[6][i] = { type: '兵', player: 'black' };
}

let currentPlayer = 'black'; // 'black' or 'white'
let selectedCell = null;     // {r, c}
let validMoves = [];         // 移動可能なマスの配列 [{r, c}]

const boardElement = document.getElementById('board');
const currentPlayerSpan = document.getElementById('current-player');

// 盤面を描画する関数
function renderBoard() {
    boardElement.innerHTML = '';
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('cell');
            cellDiv.dataset.r = r;
            cellDiv.dataset.c = c;

            // ハイライトの適用
            if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
                cellDiv.classList.add('selected');
            }
            if (validMoves.some(move => move.r === r && move.c === c)) {
                cellDiv.classList.add('valid-move');
            }

            // コマの描画
            const piece = board[r][c];
            if (piece) {
                const pieceDiv = document.createElement('div');
                pieceDiv.classList.add('piece', piece.player);
                pieceDiv.textContent = piece.type;
                cellDiv.appendChild(pieceDiv);
            }

            // クリックイベント
            cellDiv.addEventListener('click', () => handleCellClick(r, c));
            boardElement.appendChild(cellDiv);
        }
    }
}

// マスクリック時の処理
function handleCellClick(r, c) {
    const clickedPiece = board[r][c];
    const isClickingValidMove = validMoves.some(move => move.r === r && move.c === c);

    if (isClickingValidMove) {
        // コマを移動させる
        const pieceToMove = board[selectedCell.r][selectedCell.c];
        board[r][c] = pieceToMove; // 移動先に上書き（相手のコマがあれば取る）
        board[selectedCell.r][selectedCell.c] = null; // 元の場所を空にする
        
        // ターン切り替え
        currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        updateTurnDisplay();
        
        // 選択解除
        selectedCell = null;
        validMoves = [];
        renderBoard();
        return;
    }

    // 自分のコマを選択した場合
    if (clickedPiece && clickedPiece.player === currentPlayer) {
        if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
            // 同じコマをクリックしたら選択解除
            selectedCell = null;
            validMoves = [];
        } else {
            // 新しくコマを選択
            selectedCell = { r, c };
            calculateValidMoves(r, c, clickedPiece);
        }
        renderBoard();
    }
}

// 選択したコマの移動可能マスを計算
function calculateValidMoves(r, c, piece) {
    validMoves = [];
    const rule = PIECE_TYPES[piece.type];
    // 先手は上方向(-1)、後手は下方向(+1)に進むため、移動ベクトルを反転させる
    const directionMultiplier = piece.player === 'black' ? 1 : -1;

    for (const move of rule.moves) {
        let dr = move[0] * directionMultiplier;
        let dc = move[1] * directionMultiplier;
        
        let nr = r + dr;
        let nc = c + dc;

        if (rule.slide) {
            // 飛車のように何マスでも進めるコマ
            while (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                const targetPiece = board[nr][nc];
                if (!targetPiece) {
                    validMoves.push({ r: nr, c: nc }); // 空マスなら進める
                } else {
                    if (targetPiece.player !== piece.player) {
                        validMoves.push({ r: nr, c: nc }); // 相手のコマなら取れる（そこでストップ）
                    }
                    break; // 味方のコマがある、または相手のコマを取ったらそれ以上は進めない
                }
                nr += dr;
                nc += dc;
            }
        } else {
            // 王将や歩兵のように1歩ずつ進むコマ
            if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                const targetPiece = board[nr][nc];
                // 空きマスか、相手のコマなら移動可能
                if (!targetPiece || targetPiece.player !== piece.player) {
                    validMoves.push({ r: nr, c: nc });
                }
            }
        }
    }
}

// ターン表示の更新
function updateTurnDisplay() {
    if (currentPlayer === 'black') {
        currentPlayerSpan.textContent = '先手（黒）';
        currentPlayerSpan.className = 'black-turn';
    } else {
        currentPlayerSpan.textContent = '後手（白）';
        currentPlayerSpan.className = 'white-turn';
    }
}

// 説明書モーダルの制御
const manualBtn = document.getElementById('manual-btn');
const manualModal = document.getElementById('manual-modal');
const closeBtn = document.getElementById('close-btn');

manualBtn.addEventListener('click', () => manualModal.classList.remove('hidden'));
closeBtn.addEventListener('click', () => manualModal.classList.add('hidden'));
manualModal.addEventListener('click', (e) => {
    if (e.target === manualModal) manualModal.classList.add('hidden');
});

// 初期化実行
setupBoard();
renderBoard();