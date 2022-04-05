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

module.exports.checkGuess = function (guess, actualWord) {
  // This isn't correct yet, but good enough
  const result = [];
  const counts = countsOf(actualWord);
  for (let i = 0; i < wordLength; i++) {
    const letter = guess[i];
    if (letter === actualWord[i]) {
      result.push({ letter, mark: "correct" });
    } else if (counts[letter] && isntInCorrectSpot(guess, actualWord, letter)) {
      result.push({ letter, mark: "wrong-place" });
      counts[letter] -= 1;
    } else {
      result.push({ letter, mark: "wrong" });
    }
  }
  return result;
};

function test(word, guess, answer) {
  const res = module.exports.checkGuess(guess, word);
  for (const i in res) {
    if (res[i].mark === "correct" && answer[i] != ".")
      console.error(i, guess, word, answer, res);
    if (res[i].mark === "wrong-place" && answer[i] != "?")
      console.error(i, guess, word, answer, res);
    if (res[i].mark === "wrong" && answer[i] != "!")
      console.error(i, guess, word, answer, res);
  }
}

module.exports.test = function () {
  test("hello", "palsy", "!!.!!");
  test("hello", "lleeo", "???!.");
  test("aabbc", "abcba", ".??.?");
  test("abbbb", "abbab", "...!.");
  test("llaea", "blbbl", "!.!!?");
};
