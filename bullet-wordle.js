import { io } from "socket.io-client";

function show(id) {
  document.getElementById(id).style.display = "block";
}
function hide(id) {
  document.getElementById(id).style.display = "none";
}

function roundToOneDecimalPlace(number) {
  return Math.max(Math.round(number * 10) / 10, 0);
}

const maxTime = 60;

const socket = io();

socket.on("connect", () => {
  console.log("Connected!");
});

let guesses = [];
let currentGuess = "";

let myTurn = false;
let playingGame = false;

let keyboardGuesses = {};

let times = {
  thisPlayer: maxTime,
  otherPlayer: maxTime,
};

socket.on("game-start", (meFirst) => {
  myTurn = meFirst;
  console.log("Game start!");
  times = {
    thisPlayer: maxTime,
    otherPlayer: maxTime,
  };
  playingGame = true;
  guesses = [];
  gameView();
  render();
});

socket.on("made-guess", ({ guess, yourTime, otherTime }) => {
  currentGuess = "";
  myTurn = !myTurn;
  times.thisPlayer = roundToOneDecimalPlace(yourTime);
  times.otherPlayer = roundToOneDecimalPlace(otherTime);
  guesses.push(guess);
  console.log("guess -> ", guess);
  updateKeyboardGuesses(guess);
  render();
});

socket.on("making-pairing", () => {
  show("loading");
});

socket.on("reject-word", () => {
  show("length-warning");
});

socket.on("winner", ({ youWon, word, reason }) => {
  renderGameTerminationText(youWon, reason, word);
  playingGame = false;
  myTurn = false;
  hide("your-turn");
  hide("other-turn");
  show("new-game");
  show("game-finish");
});

function precedence(guessMark) {
  switch (guessMark) {
    case "wrong":
      return 0;
    case "wrong-place":
      return 1;
    case "correct":
      return 2;
    default:
      return 0;
  }
}

function updateKeyboardGuesses(guess) {
  for (const letter of guess) {
    keyboardGuesses[letter.letter] = Math.max(
      keyboardGuesses[letter.letter] || 0,
      precedence(letter.mark)
    );
  }
}

function gameView() {
  hide("new-game");
  hide("loading");
  hide("game-finish");
  hide("your-turn");
  hide("other-turn");
  show("game-board");
  document.querySelector("#new-game").style.display = "none";
  document.querySelector("#loading").style.display = "none";
  document.querySelector("#game-board").style.display = "block";
}

function renderGameTerminationText(thisPlayerWon, reason, word) {
  const p = document.getElementById("game-finish");
  p.innerText = thisPlayerWon ? "You won! " : "You lost. ";
  switch (reason) {
    case "won":
      p.innerText += thisPlayerWon
        ? "You guessed the word correctly."
        : "The other player guessed the word first.";
      break;
    case "time":
      p.innerText += thisPlayerWon
        ? "The other player ran out of time. The word was '" + word + "'."
        : "You ran out of time. The word was '" + word + "'.";
      break;
    case "left":
      p.innerText += thisPlayerWon
        ? "The other player left the game. The word was '" + word + "'."
        : "You left the game. The word was '" + word + "'.";
      break;
  }
}

function render() {
  if (myTurn) {
    show("your-turn");
    hide("other-turn");
  } else {
    hide("your-turn");
    show("other-turn");
  }
  const table = document.querySelector("table");
  table.innerHTML = "";
  guesses.forEach((guess) => renderGuess(guess, table));
  if (myTurn) renderCurrentGuess(table);
  renderKeyboard();
}

function renderKeyboard() {
  const precedencesAsMarks = ["wrong", "wrong-place", "correct"];

  for (const letter of Object.keys(keyboardGuesses)) {
    document
      .getElementById(letter)
      .setAttribute("class", precedencesAsMarks[keyboardGuesses[letter]]);
  }
}

function renderGuess(guess, table) {
  const tr = document.createElement("tr");
  guess.forEach((letter) => renderLetter(letter, tr));
  table.appendChild(tr);
}

function renderCurrentGuess(table) {
  const tr = document.createElement("tr");
  for (let i = 0; i < 5; i++) {
    renderLetter(
      { mark: "wrong", letter: i < currentGuess.length ? currentGuess[i] : "" },
      tr
    );
  }
  table.appendChild(tr);
}

function renderLetter(letter, tr) {
  const td = document.createElement("td");
  td.setAttribute("class", letter.mark);
  td.innerHTML = letter.letter;
  tr.appendChild(td);
}

function makeGuess() {
  if (currentGuess.length != 5) {
    show("length-warning");
  } else if (myTurn) {
    hide("length-warning");
    socket.emit("guess", currentGuess);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelector("#new-game").addEventListener("click", () => {
    socket.emit("request-pairing");
  });
  window.addEventListener("keydown", (key) => {
    if (playingGame && myTurn) {
      if (key.key === "Enter") {
        makeGuess();
      } else if (key.key === "Backspace") {
        currentGuess = currentGuess.slice(0, currentGuess.length - 1);
      } else if (
        key.key.length === 1 &&
        ((key.key >= "a" && key.key <= "z") ||
          (key.key >= "A" && key.key <= "Z"))
      ) {
        if (currentGuess.length < 5) currentGuess += key.key.toLowerCase();
      }
      render();
    }
  });
  document.querySelectorAll(".keyboard-row").forEach((row) => {
    [...row.children].forEach((button) => {
      button.addEventListener("click", () => {
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
      });
    });
  });
  window.setInterval(() => {
    if (playingGame) {
      if (myTurn) {
        times.thisPlayer = roundToOneDecimalPlace(times.thisPlayer - 0.1);
        if (times.thisPlayer <= 0) socket.emit("game-timeout");
      } else {
        times.otherPlayer = roundToOneDecimalPlace(times.otherPlayer - 0.1);
      }
      document.querySelector("#your-time").innerHTML =
        times.thisPlayer % 1 === 0
          ? times.thisPlayer + ".0s"
          : times.thisPlayer + "s";
      document.querySelector("#other-time").innerHTML =
        times.otherPlayer % 1 === 0
          ? times.otherPlayer + ".0s"
          : times.otherPlayer + "s";

      // - 0.4rem is to account for padding...sigh
      document.querySelector("#your-time").style.width =
        "calc(" + (times.thisPlayer / maxTime) * 100 + "% - 0.4rem)";
      document.querySelector("#other-time").style.width =
        "calc(" + (times.otherPlayer / maxTime) * 100 + "% - 0.4rem)";
    }
  }, 100);
});
