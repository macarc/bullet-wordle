import { io } from 'socket.io-client';

function show(id) {
  document.getElementById(id).style.display = 'block';
}
function hide(id) {
  document.getElementById(id).style.display = 'none';
}

const socket = io();

socket.on('connect', () => {
  console.log('Connected!')
});

let guesses = [];

socket.on('game-start', () => {
  console.log('Game start!')
  guesses = [];
  gameView();
  document.querySelector('#guess').removeAttribute('readonly');
});

socket.on('made-guess', (guess) => {
  guesses.push(guess);
  console.log('guess -> ', guess);
  render();
});

socket.on('making-pairing', () => {
  show('loading');
})

socket.on('winner', (iWon) => {
  if (iWon) alert('You won!')
  else alert('You lost.')
})

function gameView() {
  hide('new-game');
  hide('loading');
  show('game-board');
  document.querySelector('#new-game').style.display = 'none';
  document.querySelector('#loading').style.display = 'none';
  document.querySelector('#game-board').style.display = 'block';
}

function render() {
  const table = document.querySelector('table');
  table.innerHTML = '';
  guesses.forEach(guess => renderGuess(guess, table));
}

function renderGuess(guess, table) {
  const tr = document.createElement('tr');
  guess.forEach(letter => renderLetter(letter, tr));
  table.appendChild(tr);
}

function renderLetter(letter, tr) {
  const td = document.createElement('td');
  td.setAttribute('class', letter.mark);
  td.innerHTML = letter.letter;
  tr.appendChild(td);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#new-game').addEventListener('click', () => {
    socket.emit('request-pairing');
  });
  document.querySelector('#make-guess').addEventListener('click', () => {
    const guess = document.querySelector('#guess').value;
    if (guess.length != 5) {
      show('length-warning');
    } else {
      hide('length-warning');
      socket.emit('guess', document.querySelector('#guess').value);
      document.querySelector('#guess').value = '';
    }
  })
})
