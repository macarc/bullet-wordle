# Using the words from https://github.com/dwyl/english-words
# Thank you, dwyl!

cat words.txt | grep -E '^([a-z]|[A-Z]){5}$' | tr '[:upper:]' '[:lower:]' > 5-letter-words.txt
