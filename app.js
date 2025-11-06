// Simplified dependency-free chess UI
// Click a piece to select, click destination to move. No rule enforcement (optional later).

const UNICODE = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟'
};

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1';

function fenToBoard(fen) {
  const board = Array.from({length:8}, () => Array(8).fill('.'));
  const parts = fen.split(' ');
  const rows = parts[0].split('/');
  for (let r = 0; r < 8; r++) {
    const row = rows[r];
    let file = 0;
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        file += Number(ch);
      } else {
        board[r][file] = ch;
        file++;
      }
    }
  }
  return board;
}

function boardToFen(board, turn='w', halfmove=0, fullmove=1) {
  let rows = [];
  for (let r = 0; r < 8; r++) {
    let empty = 0;
    let out = '';
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p === '.' ) empty++;
      else { if (empty>0){ out += empty; empty=0; } out += p; }
    }
    if (empty>0) out += empty;
    rows.push(out);
  }
  return rows.join('/') + ' ' + turn + ' - - ' + halfmove + ' ' + fullmove;
}

class SimpleChess {
  constructor() {
    this.reset();
  }
  reset() { this.board = fenToBoard(START_FEN); this.turn = 'w'; this.history = []; this.halfmove = 0; this.fullmove = 1; }
  move(from, to) {
    const [fr, ff] = from; const [tr, tf] = to;
    const piece = this.board[fr][ff];
    if (piece === '.') return null;
    // naive move: copy board, move piece
    const prevFen = boardToFen(this.board, this.turn, this.halfmove, this.fullmove);
    this.history.push(prevFen);
    this.board[tr][tf] = piece;
    this.board[fr][ff] = '.';
    // update counters
    if (this.turn === 'b') this.fullmove++;
    this.turn = this.turn === 'w' ? 'b' : 'w';
    return {from, to};
  }
  undo() {
    if (this.history.length === 0) return;
    const fen = this.history.pop();
    const parts = fen.split(' ');
    this.board = fenToBoard(fen);
    this.turn = parts[1] || 'w';
    this.halfmove = Number(parts[4] || 0);
    this.fullmove = Number(parts[5] || 1);
  }
  fen() { return boardToFen(this.board, this.turn, this.halfmove, this.fullmove); }
}

// UI
const game = new SimpleChess();
let selected = null;

function render() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'board-grid';
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = document.createElement('div');
      sq.className = 'square ' + (((r+f)%2===0)?'light':'dark');
      sq.dataset.r = r; sq.dataset.f = f;
      const p = game.board[r][f];
      sq.textContent = p === '.' ? '' : (UNICODE[p] || p);
      if (selected && selected[0]===(r) && selected[1]===(f)) sq.classList.add('selected');
      sq.addEventListener('click', onSquareClick);
      wrap.appendChild(sq);
    }
  }
  boardEl.appendChild(wrap);
  document.getElementById('fen').value = game.fen();
  document.getElementById('status').textContent = (game.turn==='w'?'White':'Black') + ' to move (no rule enforcement)';
}

function onSquareClick(e) {
  const r = Number(this.dataset.r); const f = Number(this.dataset.f);
  if (!selected) {
    if (game.board[r][f] === '.') return; // click empty square first does nothing
    selected = [r,f];
    render();
    return;
  }
  // attempt move
  const from = selected; const to = [r,f];
  game.move(from,to);
  selected = null;
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('newBtn').addEventListener('click', () => { game.reset(); selected=null; render(); });
  document.getElementById('undoBtn').addEventListener('click', () => { game.undo(); selected=null; render(); });
  render();
});
// Improved chess UI with defensive init and FEN/status help
// Uses chess.js for rules and chessboard.js for the board when available.
let game = null;
let board = null;

function safe(fn) {
  try { fn(); }
  catch (e) {
    console.error(e);
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Error: ' + (e && e.message ? e.message : e);
  }
}

function initGame() {
  if (typeof Chess !== 'function') {
    // chess.js not available: create a minimal MockGame so controls still work.
    console.warn('chess.js not found — entering mock mode');
    const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    class MockGame {
      constructor() {
        this._history = [START_FEN];
        this._index = 0;
      }
      reset() { this._history = [START_FEN]; this._index = 0; }
      undo() { if (this._index > 0) this._index--; }
      move(/*move*/) { // accept any move and push a placeholder fen
        // push a copy of last fen with a move count incremented (very naive)
        const parts = this.fen().split(' ');
        let fullmove = Number(parts[5] || 1);
        fullmove = Math.min(9999, fullmove + 1);
        const newFen = parts[0] + ' ' + parts[1] + ' ' + (parts[2]||'-') + ' ' + (parts[3]||'-') + ' ' + (parts[4]||'0') + ' ' + fullmove;
        // discard any forward history
        this._history = this._history.slice(0, this._index + 1);
        this._history.push(newFen);
        this._index++;
        return {from: '??', to: '??'};
      }
      fen() { return this._history[this._index]; }
      turn() { return 'w'; }
      in_checkmate() { return false; }
      in_draw() { return false; }
      in_check() { return false; }
    }
    game = new MockGame();
    // show a small mock-mode note to the user in the status area
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Mock mode: chess.js not loaded — basic controls enabled';
    return;
  }

  game = new Chess();
}

function onDragStart(source, piece, position, orientation) {
  if (!game) return false;
  if (game.game_over()) return false;
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

function onDrop(source, target) {
  if (!game) return 'snapback';
  const move = game.move({from: source, to: target, promotion: 'q'});
  if (move === null) return 'snapback';
  updateStatus();
}

function onSnapEnd() {
  if (board && typeof board.position === 'function') {
    board.position(game.fen());
  }
}

function updateStatus() {
  if (!game) return;
  let status = '';
  const moveColor = (game.turn() === 'w') ? 'White' : 'Black';

  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.';
  } else if (game.in_draw()) {
    status = 'Game over, drawn position.';
  } else {
    status = moveColor + ' to move';
    if (game.in_check()) status += ', ' + moveColor + ' is in check';
  }

  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = status;

  const fenEl = document.getElementById('fen');
  if (fenEl) fenEl.value = game.fen();
}

function startNewGame() {
  if (!game) return;
  game.reset();
  if (board) {
    if (typeof board.start === 'function') board.start();
    else if (typeof board.position === 'function') board.position('start');
  }
  updateStatus();
}

function undoMove() {
  if (!game) return;
  game.undo();
  if (board && typeof board.position === 'function') board.position(game.fen());
  updateStatus();
}

function renderTextBoard(container, fen) {
  // Very small ASCII renderer for when chessboard.js isn't available
  try {
    const rows = fen.split(' ')[0].split('/');
    let html = '<pre style="font-family:monospace;line-height:1.1">';
    for (let r = 0; r < rows.length; r++) {
      let row = '';
      for (const ch of rows[r]) {
        if (/[1-8]/.test(ch)) {
          row += '.'.repeat(Number(ch));
        } else {
          row += ch;
        }
      }
      html += (8 - r) + ' ' + row + '\n';
    }
    html += '\n  a b c d e f g h';
    html += '</pre>';
    container.innerHTML = html;
  } catch (e) {
    container.textContent = 'Unable to render board.';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Attach controls even if board init fails
  const newBtn = document.getElementById('newBtn');
  const undoBtn = document.getElementById('undoBtn');

  if (newBtn) newBtn.addEventListener('click', () => safe(startNewGame));
  if (undoBtn) undoBtn.addEventListener('click', () => safe(undoMove));

  // Initialize chess game
  try {
    initGame();
  } catch (e) {
    console.error(e);
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Initialization error: ' + e.message;
    // still try to attach a minimal board view so buttons do something
    const boardEl = document.getElementById('board');
    if (boardEl) boardEl.textContent = 'Missing chess.js — board unavailable.';
    return;
  }

  // Try to initialize chessboard.js if available
  try {
    if (typeof Chessboard === 'function') {
      const config = {
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd
      };
      board = Chessboard('board', config);
    } else {
      // chessboard.js not available — render a text board
      const boardEl = document.getElementById('board');
      if (boardEl) renderTextBoard(boardEl, game.fen());
    }
  } catch (e) {
    console.error('Board init error', e);
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Board initialization failed: ' + (e.message || e);
    const boardEl = document.getElementById('board');
    if (boardEl) renderTextBoard(boardEl, game.fen());
  }

  updateStatus();
});
