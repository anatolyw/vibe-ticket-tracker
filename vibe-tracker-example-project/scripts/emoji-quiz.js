#!/usr/bin/env node

const readline = require('readline');

const flags = [
  { name: 'albania', flag: '🇦🇱' },
  { name: 'andorra', flag: '🇦🇩' },
  { name: 'austria', flag: '🇦🇹' },
  { name: 'belarus', flag: '🇧🇾' },
  { name: 'belgium', flag: '🇧🇪' },
  { name: 'bosnia and herzegovina', flag: '🇧🇦' },
  { name: 'bulgaria', flag: '🇧🇬' },
  { name: 'croatia', flag: '🇭🇷' },
  { name: 'cyprus', flag: '🇨🇾' },
  { name: 'czech republic', flag: '🇨🇿' },
  { name: 'czechia', flag: '🇨🇿' },
  { name: 'denmark', flag: '🇩🇰' },
  { name: 'estonia', flag: '🇪🇪' },
  { name: 'finland', flag: '🇫🇮' },
  { name: 'france', flag: '🇫🇷' },
  { name: 'germany', flag: '🇩🇪' },
  { name: 'greece', flag: '🇬🇷' },
  { name: 'hungary', flag: '🇭🇺' },
  { name: 'iceland', flag: '🇮🇸' },
  { name: 'ireland', flag: '🇮🇪' },
  { name: 'italy', flag: '🇮🇹' },
  { name: 'kosovo', flag: '🇽🇰' },
  { name: 'latvia', flag: '🇱🇻' },
  { name: 'liechtenstein', flag: '🇱🇮' },
  { name: 'lithuania', flag: '🇱🇹' },
  { name: 'luxembourg', flag: '🇱🇺' },
  { name: 'malta', flag: '🇲🇹' },
  { name: 'moldova', flag: '🇲🇩' },
  { name: 'monaco', flag: '🇲🇨' },
  { name: 'montenegro', flag: '🇲🇪' },
  { name: 'netherlands', flag: '🇳🇱' },
  { name: 'north macedonia', flag: '🇲🇰' },
  { name: 'norway', flag: '🇳🇴' },
  { name: 'poland', flag: '🇵🇱' },
  { name: 'portugal', flag: '🇵🇹' },
  { name: 'romania', flag: '🇷🇴' },
  { name: 'russia', flag: '🇷🇺' },
  { name: 'san marino', flag: '🇸🇲' },
  { name: 'serbia', flag: '🇷🇸' },
  { name: 'slovakia', flag: '🇸🇰' },
  { name: 'slovenia', flag: '🇸🇮' },
  { name: 'spain', flag: '🇪🇸' },
  { name: 'sweden', flag: '🇸🇪' },
  { name: 'switzerland', flag: '🇨🇭' },
  { name: 'ukraine', flag: '🇺🇦' },
  { name: 'united kingdom', flag: '🇬🇧' },
  { name: 'vatican city', flag: '🇻🇦' },
];

const readlineInterface = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let correctCount = 0;
let wrongCount = 0;
let currentFlag = null;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  bold: '\x1b[1m',
  gold: '\x1b[38;5;220m',
};

function getRandomFlag() {
  const index = Math.floor(Math.random() * flags.length);
  return flags[index];
}

function showFlag() {
  currentFlag = getRandomFlag();
  process.stdout.write(`\n${colors.bold}Which country?${colors.reset} ${currentFlag.flag} `);
}

function printCorrect() {
  process.stdout.write(`\n${colors.green}Correct!${colors.reset} ${colors.bold}${currentFlag.flag} ${currentFlag.name}${colors.reset}\n\n`);
  correctCount++;
  showFlag();
}

function printWrong() {
  process.stdout.write(`\n${colors.red}Wrong!${colors.reset} ${colors.bold}${currentFlag.flag} ${currentFlag.name}${colors.reset}\n\n`);
  wrongCount++;
  showFlag();
}

function printStats() {
  const total = correctCount + wrongCount;
  process.stdout.write(`\n${colors.bold}--- Statistics ---${colors.reset}\n`);
  process.stdout.write(`  Total:   ${total}\n`);
  process.stdout.write(`  Correct: ${correctCount}\n`);
  process.stdout.write(`  Wrong:   ${wrongCount}\n`);
  if (total > 0) {
    const pct = Math.round((correctCount / total) * 100);
    process.stdout.write(`  Score:   ${pct}%\n`);
  }
  process.stdout.write('------------------\n\n');
  showFlag();
}

function checkAnswer(input) {
  if (input === '/stats') {
    printStats();
    return;
  }

  const answer = input.trim().toLowerCase();
  if (!answer) return;

  if (answer === currentFlag.name.toLowerCase()) {
    printCorrect();
  } else {
    printWrong();
  }
}

console.log(`Type ${colors.gold}/stats${colors.reset} anytime to see live statistics with score percentage.`);
console.log(`or press ${colors.gold}Ctrl+C${colors.reset} to exit.`);

showFlag();

readlineInterface.on('line', (line) => {
  checkAnswer(line);
});

process.on('SIGINT', () => {
  console.log('');
  console.log('');
  const total = correctCount + wrongCount;
  console.log('--- Final Statistics ---');
  console.log(`  Total:   ${total}`);
  console.log(`  Correct: ${correctCount}`);
  console.log(`  Wrong:   ${wrongCount}`);
  if (total > 0) {
    const pct = Math.round((correctCount / total) * 100);
    console.log(`  Score:   ${pct}%`);
  }
  console.log('------------------------');
  readlineInterface.close();
});
