// =======================
// STATE
// =======================
let allQuestions = [];
let testQuestions = [];
let history = [];
let wrongQuestions = [];
let favoriteQuestions = [];
let settings = { theme: 'light' };

let current = 0;
let score = 0;
let answered = false;
let remainingTime = 0;
let timerInterval;
let currentTest = null;

const QUESTIONS_IN_TEST = 40;
const TOTAL_TIME = 30 * 60;

// =======================
// SCREEN
// =======================
function showScreen(name) {
  document.querySelectorAll('[data-screen]')
    .forEach(s => s.style.display = 'none');

  const screen = document.querySelector(`[data-screen="${name}"]`);
  if (screen) screen.style.display = 'block';
}

// =======================
// LOAD DATA (ELECTRON)
// =======================
window.api.loadJSON('questions.json').then(d => allQuestions = d || []);
window.api.loadJSON('wrong.json').then(d => wrongQuestions = d || []);
window.api.loadJSON('favorites.json').then(d => favoriteQuestions = d || []);
window.api.loadJSON('history.json').then(d => {
  history = d || [];
  renderHistory();
});
window.api.loadJSON('settings.json').then(d => {
  settings = d || { theme: 'light' };
  if (settings.theme === 'dark') document.body.classList.add('dark');
});

// =======================
// THEME
// =======================
function toggleTheme() {
  document.body.classList.toggle('dark');
  settings.theme = document.body.classList.contains('dark') ? 'dark' : 'light';
  window.api.saveJSON('settings.json', settings);
}

// =======================
// FAVORITES ⭐
// =======================
function isFavorite(id) {
  return favoriteQuestions.some(q => q.id === id);
}

function toggleFavorite(question) {
  const index = favoriteQuestions.findIndex(q => q.id === question.id);

  if (index === -1) {
    favoriteQuestions.push(question);
  } else {
    favoriteQuestions.splice(index, 1);
  }

  window.api.saveJSON('favorites.json', favoriteQuestions);
  showQuestion(); // refresh ⭐ icon
}

// =======================
// START TEST
// =======================
function startTest() {
  if (allQuestions.length < QUESTIONS_IN_TEST) {
    alert('Nedostatok otázok');
    return;
  }

  resetTest();
  testQuestions = shuffle([...allQuestions]).slice(0, QUESTIONS_IN_TEST);
  initTest('random');
}

function startWrongTest() {
  if (wrongQuestions.length === 0) {
    alert('Žiadne zlé otázky');
    return;
  }

  resetTest();
  testQuestions = shuffle([...wrongQuestions]);
  initTest('wrong');
}

function startFavoritesTest() {
  if (favoriteQuestions.length === 0) {
    alert('Nemáš žiadne obľúbené otázky ⭐');
    return;
  }

  resetTest();
  testQuestions = shuffle([...favoriteQuestions]);
  initTest('favorites');
}

// =======================
// INIT TEST
// =======================
function initTest(type) {
  remainingTime = TOTAL_TIME;

  currentTest = {
    id: Date.now(),
    type,
    start: new Date().toLocaleString(),
    answers: [],
    score: 0,
    total: 0,
    percent: 0
  };

  showScreen('test');
  startTimer();
  showQuestion();
}

// =======================
// TIMER
// =======================
function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    remainingTime--;

    document.getElementById('timer').innerText =
      `Čas: ${Math.floor(remainingTime / 60)}:${String(remainingTime % 60).padStart(2, '0')}`;

    if (remainingTime <= 0) endTest();
  }, 1000);
}

// =======================
// QUESTIONS
// =======================
function showQuestion() {
  answered = false;
  const q = testQuestions[current];

  const fav = isFavorite(q.id) ? '⭐' : '☆';

  document.getElementById('question').innerHTML = `
    ${current + 1}. ${q.q}
    <button class="fav-btn" onclick='toggleFavorite(${JSON.stringify(q)})'>${fav}</button>
  `;

  const answers = document.getElementById('answers');
  answers.innerHTML = '';

  ['a', 'b', 'c'].forEach(letter => {
    const div = document.createElement('div');
    div.className = 'answer';
    div.innerText = q[letter];
    div.onclick = () => checkAnswer(letter, div);
    answers.appendChild(div);
  });

  document.getElementById('progress').innerText =
    `Otázka ${current + 1}/${testQuestions.length}`;
}

function checkAnswer(letter, el) {
  if (answered) return;
  answered = true;

  const q = testQuestions[current];

  currentTest.answers.push({
    id: q.id,
    question: q.q,
    answers: { a: q.a, b: q.b, c: q.c },
    selected: letter,
    correct: q.correct
  });

  if (letter === q.correct) {
    el.classList.add('correct');
    score++;
  } else {
    el.classList.add('wrong');

    if (!wrongQuestions.find(x => x.id === q.id)) {
      wrongQuestions.push(q);
      window.api.saveJSON('wrong.json', wrongQuestions);
    }
  }
}

// =======================
// NAVIGATION
// =======================
function nextQuestion() {
  if (!answered) {
    alert('Najprv odpovedz alebo preskoč');
    return;
  }

  current++;
  current < testQuestions.length ? showQuestion() : endTest();
}

function skipQuestion() {
  answered = true;
  current++;
  current < testQuestions.length ? showQuestion() : endTest();
}

// =======================
// END TEST
// =======================
function endTest() {
  clearInterval(timerInterval);

  const percent = Math.round((score / testQuestions.length) * 100);

  currentTest.score = score;
  currentTest.total = testQuestions.length;
  currentTest.percent = percent;

  history.push(currentTest);
  window.api.saveJSON('history.json', history);

  renderHistory();
  showScreen('home');
}

function confirmEndTest() {
  if (confirm('Naozaj chceš ukončiť test?')) endTest();
}

// =======================
// HISTORY
// =======================
function renderHistory() {
  const ul = document.getElementById('historyList');
  if (!ul) return;

  ul.innerHTML = '';

  history.slice().reverse().forEach(test => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const info = document.createElement('span');
    info.innerText =
      `${test.start} – ${test.score}/${test.total} (${test.percent}%) [${test.type}]`;
    info.style.color = test.percent >= 50 ? 'green' : 'red';

    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn-secondary';
    viewBtn.innerText = 'Pozrieť';
    viewBtn.onclick = () => openReview(test);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.innerText = 'Zmazať';
    delBtn.onclick = () => deleteTest(test.id);

    li.append(info, viewBtn, delBtn);
    ul.appendChild(li);
  });
}

function deleteTest(id) {
  if (!confirm('Naozaj chceš zmazať tento test?')) return;
  history = history.filter(t => t.id !== id);
  window.api.saveJSON('history.json', history);
  renderHistory();
}

function clearHistory() {
  if (!confirm('Naozaj chceš zmazať CELÚ históriu?')) return;
  history = [];
  window.api.saveJSON('history.json', []);
  renderHistory();
}

// =======================
// REVIEW
// =======================
function openReview(test) {
  const box = document.getElementById('reviewContent');
  box.innerHTML = '';

  test.answers.forEach((a, i) => {
    const div = document.createElement('div');
    const ok = a.selected === a.correct;

    div.className = `card review-card ${ok ? 'review-correct' : 'review-wrong'}`;

    div.innerHTML = `
      <strong>${i + 1}. ${a.question}</strong><br><br>
      <div class="review-answer ${a.correct === 'a' ? 'correct' : a.selected === 'a' ? 'wrong' : ''}">A) ${a.answers.a}</div>
      <div class="review-answer ${a.correct === 'b' ? 'correct' : a.selected === 'b' ? 'wrong' : ''}">B) ${a.answers.b}</div>
      <div class="review-answer ${a.correct === 'c' ? 'correct' : a.selected === 'c' ? 'wrong' : ''}">C) ${a.answers.c}</div>
    `;

    box.appendChild(div);
  });

  showScreen('review');
}

// =======================
// RESET & UTILS
// =======================
function resetTest() {
  current = 0;
  score = 0;
  answered = false;
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function showFavorites() {
  const box = document.getElementById('favoritesList');
  box.innerHTML = '';

  if (favoriteQuestions.length === 0) {
    box.innerHTML = '<p>Nemáš žiadne obľúbené otázky ⭐</p>';
  }

  favoriteQuestions.forEach(q => {
    const div = document.createElement('div');
    div.className = 'card review-card review-correct';

    div.innerHTML = `
      <strong>${q.q}</strong><br><br>

      <div class="review-answer ${q.correct === 'a' ? 'correct' : ''}">A) ${q.a}</div>
      <div class="review-answer ${q.correct === 'b' ? 'correct' : ''}">B) ${q.b}</div>
      <div class="review-answer ${q.correct === 'c' ? 'correct' : ''}">C) ${q.c}</div>

      <button class="btn-danger" onclick="removeFavorite(${q.id})">Odstrániť ⭐</button>
    `;

    box.appendChild(div);
  });

  showScreen('favorites');
}

function showWrong() {
  const box = document.getElementById('wrongList');
  box.innerHTML = '';

  if (wrongQuestions.length === 0) {
    box.innerHTML = '<p>Nemáš žiadne zlé otázky 👍</p>';
  }

  wrongQuestions.forEach(q => {
    const div = document.createElement('div');
    div.className = 'card review-card review-wrong';

    div.innerHTML = `
      <strong>${q.q}</strong><br><br>

      <div class="review-answer ${q.correct === 'a' ? 'correct' : 'wrong'}">A) ${q.a}</div>
      <div class="review-answer ${q.correct === 'b' ? 'correct' : 'wrong'}">B) ${q.b}</div>
      <div class="review-answer ${q.correct === 'c' ? 'correct' : 'wrong'}">C) ${q.c}</div>

      <button class="btn-danger" onclick="removeWrong(${q.id})">Odstrániť</button>
    `;

    box.appendChild(div);
  });

  showScreen('wrong');
}

function removeFavorite(id) {
  if (!confirm('Naozaj chceš odstrániť túto otázku z obľúbených?')) return;

  favoriteQuestions = favoriteQuestions.filter(q => q.id !== id);
  window.api.saveJSON('favorites.json', favoriteQuestions);

  showFavorites(); // refresh obrazovky
}

function removeWrong(id) {
  if (!confirm('Naozaj chceš odstrániť túto otázku zo zlých otázok?')) return;

  wrongQuestions = wrongQuestions.filter(q => q.id !== id);
  window.api.saveJSON('wrong.json', wrongQuestions);

  showWrong(); // refresh obrazovky
}
