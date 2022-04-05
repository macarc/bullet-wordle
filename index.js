const express = require('express');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io')
const { pickableWords, validWords } = require('./words');
const { checkGuess } = require('./wordle');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {});


const games = {};

const waitingPlayers = [];

async function makePairing(socket) {
  if (waitingPlayers.length > 0) {
    const otherPlayer = waitingPlayers.shift();
    const word = chooseWord();
    games[socket.id] = { otherPlayer, word, turn: socket.id, time: 60, lastMove: new Date() };
    games[otherPlayer.id] = { otherPlayer: socket, word, turn: socket.id, time: 60, lastMove: null };
    socket.emit('game-start', true);
    otherPlayer.emit('game-start', false);
  } else {
    waitingPlayers.push(socket);
  }
}

function chooseWord() {
  return pickableWords[Math.floor(Math.random() * pickableWords.length)];
}
function isValidWord(word) {
  return validWords.has(word);
}

function swapTurn(socket) {
  games[socket.id].turn = games[socket.id].otherPlayer.id;
  games[games[socket.id].otherPlayer.id].turn = games[socket.id].otherPlayer.id;
}

function winner(socket) {
  socket.emit('winner', true);
  games[socket.id].otherPlayer.emit('winner', false)
  delete games[games[socket.id].otherPlayer.id];
  delete games[socket.id];
}

io.on('connection', async (socket) => {
  console.log('connected to ', socket.id);

  socket.on('request-pairing', () => {
    if (games[socket.id] || waitingPlayers.includes(socket)) return;

    socket.emit('making-pairing')
    makePairing(socket);
  })

  socket.on('guess', (guess) => {
    guess = guess.toLowerCase();
    if (games[socket.id] && games[socket.id].turn === socket.id) {
      if (guess.length !== 5 || !isValidWord(guess)) {
        socket.emit('reject-word');
        return;
      }

      games[socket.id].time -= (new Date() - games[socket.id].lastMove) / 1000;
      if (games[socket.id].time <= 0) {
        games[socket.id].time = 0;
        winner(socket);
      }
      games[socket.id].lastMove = null;
      games[games[socket.id].otherPlayer.id].lastMove = new Date();

      swapTurn(socket);

      const checked = checkGuess(guess, games[socket.id].word);
      socket.emit('made-guess', {
        guess: checked,
        yourTime: games[socket.id].time,
        otherTime: games[games[socket.id].otherPlayer.id].time
      });
      games[socket.id].otherPlayer.emit('made-guess', {
        guess: checked,
        yourTime: games[games[socket.id].otherPlayer.id].time,
        otherTime: games[socket.id].time
      });

      if (guess === games[socket.id].word) {
        winner(socket);
      }
    }
  });

  socket.on('game-timeout', () => {
    if (games[socket.id]) winner(games[socket.id].otherPlayer);
  });

  socket.conn.on('close', () => {
    if (waitingPlayers.includes(socket)) {
      waitingPlayers.splice(waitingPlayers.indexOf(socket), 1);
    }
  })
})

app.use(express.static(path.join(__dirname, 'public')));

httpServer.listen(3000);

