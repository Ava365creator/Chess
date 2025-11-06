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
    // chess.js not available: create a minimal mock that prevents errors
    throw new Error('chess.js not found. Ensure the chess.js script is loaded before app.js.');
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
