// Simplified dependency-free chess UI
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
  reset() { 
    this.board = fenToBoard(START_FEN); 
    this.turn = 'w'; 
    this.history = []; 
    this.halfmove = 0; 
    this.fullmove = 1; 
  }
  
  move(from, to) {
    const [fr, ff] = from; 
    const [tr, tf] = to;
    const piece = this.board[fr][ff];
    if (piece === '.') return null;
    
    const prevFen = boardToFen(this.board, this.turn, this.halfmove, this.fullmove);
    this.history.push(prevFen);
    this.board[tr][tf] = piece;
    this.board[fr][ff] = '.';
    
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
  
  fen() { 
    return boardToFen(this.board, this.turn, this.halfmove, this.fullmove); 
  }
}

// UI
const game = new SimpleChess();
let selected = null;

function render() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';
  const wrap = document.createElement('div'); 
  wrap.className = 'board-grid';
  
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const sq = document.createElement('div');
      sq.className = 'square ' + (((r+f)%2===0)?'light':'dark');
      sq.dataset.r = r; 
      sq.dataset.f = f;
      const p = game.board[r][f];
      sq.textContent = p === '.' ? '' : (UNICODE[p] || p);
      
      if (selected && selected[0]===(r) && selected[1]===(f)) {
        sq.classList.add('selected');
      }
      
      sq.addEventListener('click', onSquareClick);
      wrap.appendChild(sq);
    }
  }
  
  boardEl.appendChild(wrap);
  document.getElementById('fen').value = game.fen();
  document.getElementById('status').textContent = (game.turn==='w'?'White':'Black') + ' to move';
}

function onSquareClick() {
  const r = Number(this.dataset.r); 
  const f = Number(this.dataset.f);
  
  if (!selected) {
    if (game.board[r][f] === '.') return;
    selected = [r,f];
    render();
    return;
  }
  
  const from = selected; 
  const to = [r,f];
  game.move(from,to);
  selected = null;
  render();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('newBtn').addEventListener('click', () => { 
    game.reset(); 
    selected=null; 
    render(); 
  });
  
  document.getElementById('undoBtn').addEventListener('click', () => { 
    game.undo(); 
    selected=null; 
    render(); 
  });
  
  render();
});