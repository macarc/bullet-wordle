import { io } from 'socket.io-client';

function show(id) {
  document.getElementById(id).style.display = 'block';
}
function hide(id) {
  document.getElementById(id).style.display = 'none';
}

function roundToOneDecimalPlace(number) {
  return Math.max(Math.round(number * 10) / 10, 0);
}

const socket = io();

socket.on('connect', () => {
  console.log('Connected!')
});

let guesses = [];

let myTurn = false;

let times = {
  thisPlayer: 60,
  otherPlayer: 60,
}

socket.on('game-start', (meFirst) => {
  myTurn = meFirst;
  console.log('Game start!')
  times = {
    thisPlayer: 60,
    otherPlayer: 60
  }
  guesses = [];
  document.querySelector('#guess').removeAttribute('readonly');
  gameView();
  render();
});

socket.on('made-guess', ({ guess, yourTime, otherTime }) => {
  if (myTurn) document.querySelector('#guess').value = '';
  myTurn = !myTurn;
  times.thisPlayer = roundToOneDecimalPlace(yourTime);
  times.otherPlayer = roundToOneDecimalPlace(otherTime);
  guesses.push(guess);
  console.log('guess -> ', guess);
  render();
});

socket.on('making-pairing', () => {
  show('loading');
})

socket.on('reject-word', () => {
  show('length-warning');
});

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
  if (myTurn) {
    show('your-turn');
    hide('other-turn');
  } else {
    hide('your-turn');
    show('other-turn');
  }
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
    } else if (myTurn) {
      hide('length-warning');
      socket.emit('guess', document.querySelector('#guess').value);
    }
  })
  window.setInterval(() => {
    if (myTurn) {
      times.thisPlayer = roundToOneDecimalPlace(times.thisPlayer - 0.1);
      if (times.thisPlayer <= 0) socket.emit('game-timeout')
    } else {
      times.otherPlayer = roundToOneDecimalPlace(times.otherPlayer - 0.1);
    }
    document.querySelector('#your-time').innerHTML = times.thisPlayer % 1 === 0 ? times.thisPlayer + '.0' : times.thisPlayer;
    document.querySelector('#other-time').innerHTML = times.otherPlayer % 1 === 0 ? times.otherPlayer + '.0' : times.otherPlayer;
  }, 100)
});
