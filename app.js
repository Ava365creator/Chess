// Minimal chess UI using chess.js for rules and chessboard.js for the board
const game = new Chess();
let board = null;

function onDragStart(source, piece, position, orientation) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false;

  // only pick up pieces for the side to move
  if ((game.turn() === 'w' && piece.search(/^b/) !== -1) ||
      (game.turn() === 'b' && piece.search(/^w/) !== -1)) {
    return false;
  }
}

function onDrop(source, target) {
  // see if the move is legal
  const move = game.move({from: source, to: target, promotion: 'q'});

  // illegal move
  if (move === null) return 'snapback';

  updateStatus();
}

function onSnapEnd() {
  board.position(game.fen());
}

function updateStatus() {
  let status = '';

  const moveColor = (game.turn() === 'w') ? 'White' : 'Black';

  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.';
  }

  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position.';
  }

  // game still on
  else {
    status = moveColor + ' to move';

    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check';
    }
  }

  document.getElementById('status').textContent = status;
  document.getElementById('fen').value = game.fen();
}

function startNewGame() {
  game.reset();
  board.start();
  updateStatus();
}

function undoMove() {
  game.undo();
  board.position(game.fen());
  updateStatus();
}

document.addEventListener('DOMContentLoaded', () => {
  const config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  };

  board = Chessboard('board', config);

  document.getElementById('newBtn').addEventListener('click', startNewGame);
  document.getElementById('undoBtn').addEventListener('click', undoMove);

  updateStatus();
});
