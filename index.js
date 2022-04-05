const express = require('express');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io')
const port = 3000;

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {});

const wordLength = 5;

function countsOf(word) {
  const counts = {};
  for (const letter of word) {
    if (counts[letter]) {
      counts[letter] += 1;
    } else {
      counts[letter] = 1;
    }
  }
  return counts;
}

function indexesOf(word, letter) {
  const result = [];
  for (let i = 0; i < word.length; i++) {
    if (word[i] == letter) result.push(i);
  }
  return result;
}

function isntInCorrectSpot(guess, word, letter) {
  for (const i of indexesOf(word, letter)) {
    if (guess[i] !== letter) return true;
  }
  return false;
}

function checkGuess(guess, actualWord) {
  // This isn't correct yet, but good enough
  const result = [];
  const counts = countsOf(actualWord);
  for (let i = 0; i < wordLength; i++) {
    const letter = guess[i];
    if (letter === actualWord[i]) {
      result.push({ letter, mark: 'correct' });
    } else if (counts[letter] && isntInCorrectSpot(guess, actualWord, letter)) {
      result.push({ letter, mark: 'wrong-place' })
      counts[letter] -= 1;
    } else {
      result.push({ letter, mark: 'wrong' })
    }
  }
  return result;
}

const games = {};

const waitingPlayers = [];

async function makePairing(socket) {
  if (waitingPlayers.length > 0) {
    const otherPlayer = waitingPlayers.shift();
    const word = chooseWord();
    games[socket.id] = { player: otherPlayer, word };
    games[otherPlayer.id] = { player: socket, word };
    socket.emit('game-start');
    otherPlayer.emit('game-start');
  } else {
    waitingPlayers.push(socket);
  }
}

function chooseWord() {
  return 'guess'
}

io.on('connection', async (socket) => {
  console.log('connected to ', socket.id);

  socket.on('request-pairing', () => {
    if (games[socket.id] || waitingPlayers.includes(socket)) return;

    socket.emit('making-pairing')
    makePairing(socket);
  })

  socket.on('guess', (guess) => {
    if (games[socket.id]) {
      const checked = checkGuess(guess, games[socket.id].word);
      console.log(`check guess ${guess}:`, checked);
      socket.emit('made-guess', checked);
      if (guess === games[socket.id].word) {
        socket.emit('winner', true);
        games[socket.id].player.emit('winner', false)
        delete games[games[socket.id].player.id];
        delete games[socket.id];
      } else {
        games[socket.id].player.emit('made-guess', checked);
      }
    }
  })
  socket.conn.on('close', () => {
    if (waitingPlayers.includes(socket)) {
      waitingPlayers.splice(waitingPlayers.indexOf(socket), 1);
    }
  })
})

app.use(express.static(path.join(__dirname, 'public')));

httpServer.listen(3000);
