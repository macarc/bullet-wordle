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
let currentGuess = '';

let myTurn = false;
let playingGame = false;

let keyboardGuesses = {};

let times = {
  thisPlayer: 60,
  otherPlayer: 60,
};

socket.on('game-start', (meFirst) => {
  myTurn = meFirst;
  console.log('Game start!')
  times = {
    thisPlayer: 60,
    otherPlayer: 60
  }
  playingGame = true;
  guesses = [];
  gameView();
  render();
});

socket.on('made-guess', ({ guess, yourTime, otherTime }) => {
  currentGuess = '';
  myTurn = !myTurn;
  times.thisPlayer = roundToOneDecimalPlace(yourTime);
  times.otherPlayer = roundToOneDecimalPlace(otherTime);
  guesses.push(guess);
  console.log('guess -> ', guess);
  updateKeyboardGuesses(guess);
  render();
});

socket.on('making-pairing', () => {
  show('loading');
})

socket.on('reject-word', () => {
  show('length-warning');
});

socket.on('winner', ({ youWon, word }) => {
  if (youWon) alert(`You won! The word was ${word}.`)
  else alert(`You lost. The word was ${word}.`)
  playingGame = false;
  hide('your-turn');
  hide('other-turn');
})

function precedence(guessMark) {
  switch (guessMark) {
    case 'wrong': return 0;
    case 'wrong-place': return 1;
    case 'correct': return 2;
    default: return 0;
  }
}

function updateKeyboardGuesses(guess) {
  for (const letter of guess) {
    keyboardGuesses[letter.letter] = Math.max(keyboardGuesses[letter.letter] || 0, precedence(letter.mark));
  }
}

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
  if (myTurn) renderCurrentGuess(table);
  renderKeyboard();
}

function renderKeyboard() {
  const precedencesAsMarks = ['wrong', 'wrong-place', 'correct'];

  for (const letter of Object.keys(keyboardGuesses)) {
    document.getElementById(letter).setAttribute('class', precedencesAsMarks[keyboardGuesses[letter]]);
  }
}

function renderGuess(guess, table) {
  const tr = document.createElement('tr');
  guess.forEach(letter => renderLetter(letter, tr));
  table.appendChild(tr);
}

function renderCurrentGuess(table) {
  const tr = document.createElement('tr');
  for (let i = 0; i < 5; i++) {
    renderLetter({ mark: 'wrong', letter: i < currentGuess.length ? currentGuess[i] : '' }, tr);
  }
  table.appendChild(tr);
}

function renderLetter(letter, tr) {
  const td = document.createElement('td');
  td.setAttribute('class', letter.mark);
  td.innerHTML = letter.letter;
  tr.appendChild(td);
}

function makeGuess() {
  if (currentGuess.length != 5) {
    show('length-warning');
  } else if (myTurn) {
    hide('length-warning');
    socket.emit('guess', currentGuess);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelector('#new-game').addEventListener('click', () => {
    socket.emit('request-pairing');
  });
  window.addEventListener('keydown', (key) => {
    if (playingGame && myTurn) {
      if (key.key === "Enter") {
        makeGuess()
      } else if (key.key === "Backspace") {
        currentGuess = currentGuess.slice(0, currentGuess.length - 1);
      } else if (key.key.length === 1 && ((key.key >= 'a' && key.key <= 'z') || (key.key >= 'A' && key.key <= 'Z'))) {
        if (currentGuess.length < 5) currentGuess += key.key.toLowerCase();
      }
      render();
    }
  });
  document.querySelectorAll('.keyboard-row').forEach(row => {
    [...row.children].forEach(button => {
      button.addEventListener('click', () => {
        if (playingGame && myTurn) {
          const key = button.innerHTML.toLowerCase();
          if (key.length === 1) {
            if (currentGuess.length < 5) currentGuess += key;
          } else if (key === "delete") {
            currentGuess = currentGuess.slice(0, currentGuess.length - 1);
          } else if (key === "go") {
            makeGuess();
          }
          render();
        }
      })
    })
  })
  window.setInterval(() => {
    if (!playingGame) return;

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
