const express = require("express");
const path = require("path");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { pickableWords, validWords } = require("./words");
const { checkGuess } = require("./wordle");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {});

const games = {};

const waitingPlayers = [];

async function makePairing(socket) {
  if (waitingPlayers.length > 0) {
    const otherPlayer = waitingPlayers.shift();
    const word = chooseWord();
    games[socket.id] = {
      otherPlayer,
      word,
      turn: socket.id,
      time: 60,
      lastMove: new Date(),
    };
    games[otherPlayer.id] = {
      otherPlayer: socket,
      word,
      turn: socket.id,
      time: 60,
      lastMove: null,
    };
    socket.emit("game-start", true);
    otherPlayer.emit("game-start", false);
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

function winner(player, reason) {
  const word = games[player.id].word;
  player.emit("winner", { youWon: true, word, reason });
  games[player.id].otherPlayer.emit("winner", { youWon: false, word, reason });
  delete games[games[player.id].otherPlayer.id];
  delete games[player.id];
}

io.on("connection", async (socket) => {
  console.log("connected to ", socket.id);

  socket.on("request-pairing", () => {
    if (games[socket.id] || waitingPlayers.includes(socket)) return;

    socket.emit("making-pairing");
    makePairing(socket);
  });

  socket.on("guess", (guess) => {
    guess = guess.toLowerCase();
    if (games[socket.id] && games[socket.id].turn === socket.id) {
      if (guess.length !== 5 || !isValidWord(guess)) {
        socket.emit("reject-word");
        return;
      }

      games[socket.id].time -= (new Date() - games[socket.id].lastMove) / 1000;
      if (games[socket.id].time <= 0) {
        games[socket.id].time = 0;
        winner(socket, "time");
      }
      games[socket.id].lastMove = null;
      games[games[socket.id].otherPlayer.id].lastMove = new Date();

      swapTurn(socket);

      const checked = checkGuess(guess, games[socket.id].word);
      socket.emit("made-guess", {
        guess: checked,
        yourTime: games[socket.id].time,
        otherTime: games[games[socket.id].otherPlayer.id].time,
      });
      games[socket.id].otherPlayer.emit("made-guess", {
        guess: checked,
        yourTime: games[games[socket.id].otherPlayer.id].time,
        otherTime: games[socket.id].time,
      });

      if (guess === games[socket.id].word) {
        winner(socket, "won");
      }
    }
  });

  socket.on("game-timeout", () => {
    if (games[socket.id]) winner(games[socket.id].otherPlayer, "time");
  });

  socket.conn.on("close", () => {
    if (games[socket.id]) {
      console.log("socket", socket.id, "closed");
      console.log("socket", games[socket.id].otherPlayer.id, "wins");
      winner(games[socket.id].otherPlayer, "left");
    }
    if (waitingPlayers.includes(socket)) {
      waitingPlayers.splice(waitingPlayers.indexOf(socket), 1);
    }
  });
});

app.use(express.static(path.join(__dirname, "public")));

httpServer.listen(process.env.PORT || 3000);
