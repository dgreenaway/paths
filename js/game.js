/**
 * game.js
 * -------
 * Core Pathfinder game logic.
 * Depends on: puzzles.js (COLORS, PUZZLES)
 *
 * Dev mode: append ?dev to the URL to cycle through all puzzles.
 *   ?dev&i=3  → loads puzzle at index 3
 */

// ── Pick today's puzzle ──────────────────────────────────────────────────────
const params   = new URLSearchParams(window.location.search);
const DEV_MODE = params.has('dev');

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let PUZZLE_IDX;
let PUZZLE;

if (DEV_MODE) {
  PUZZLE_IDX = Math.max(0, Math.min(parseInt(params.get('i') || '0', 10), PUZZLES.length - 1));
  PUZZLE     = PUZZLES[PUZZLE_IDX];
} else {
  const today = todayString();
  PUZZLE_IDX  = PUZZLES.findIndex(p => p.date === today);
  PUZZLE      = PUZZLE_IDX >= 0 ? PUZZLES[PUZZLE_IDX] : null;
}

const SIZE     = PUZZLE ? PUZZLE.size     : 0;
const SEQ      = PUZZLE ? PUZZLE.sequence : [];
const SOLUTION = PUZZLE ? PUZZLE.solution : [];
const GRID     = PUZZLE ? PUZZLE.grid     : [];

// ── State ────────────────────────────────────────────────────────────────────
let path        = SOLUTION.length ? [SOLUTION[0].slice()] : [];
let errors      = 0;
let solved      = false;
let startTime   = null;
let timerInterval = null;
let hintTimeout = null;

// ── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'paths_data';

function loadData() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { results: {} }; }
  catch { return { results: {} }; }
}

function saveResult(timeStr) {
  if (!PUZZLE) return;
  const data = loadData();
  data.results[PUZZLE.date] = {
    id: PUZZLE.id, steps: path.length - 1, errors, time: timeStr,
    path: path.map(([r, c]) => [r, c]),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function shiftDate(str, days) {
  const d = new Date(str + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function getStreaks() {
  const data  = loadData();
  const today = todayString();

  let current = 0;
  let cursor  = data.results[today] ? today : shiftDate(today, -1);
  while (data.results[cursor]) { current++; cursor = shiftDate(cursor, -1); }

  const dates = Object.keys(data.results).sort();
  let best = 0, run = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) { run = 1; } else {
      const gap = (new Date(dates[i] + 'T00:00:00') - new Date(dates[i-1] + 'T00:00:00')) / 86400000;
      run = gap === 1 ? run + 1 : 1;
    }
    if (run > best) best = run;
  }

  return { current, best };
}

function checkAlreadyPlayed() {
  if (!PUZZLE) return false;
  const result = loadData().results[PUZZLE.date];
  if (!result) return false;
  path   = result.path;
  errors = result.errors;
  solved = true;
  document.getElementById('errors-val').textContent = errors;
  document.getElementById('timer-val').textContent  = result.time;
  document.getElementById('steps-val').textContent  = result.steps;
  return true;
}

// ── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (DEV_MODE) injectDevBar();

  if (!PUZZLE) {
    showNoPuzzle();
    return;
  }

  document.getElementById('puzzle-num').textContent = `Daily Puzzle #${String(PUZZLE.id).padStart(3, '0')}`;
  buildRuleStrip();
  buildGrid();

  if (checkAlreadyPlayed()) {
    renderPath();
    setMsg('Path complete! Well done.', 'success');
    document.querySelector('.btn-row').style.display = 'none';
    buildTomorrowMsg();
    document.getElementById('win-footer').classList.add('show');
  }
});

// ── Dev bar ──────────────────────────────────────────────────────────────────
function injectDevBar() {
  const bar = document.createElement('div');
  bar.id    = 'dev-bar';
  bar.innerHTML = `
    <span class="dev-label">DEV</span>
    <button class="dev-btn" id="dev-prev" onclick="devNav(-1)">&#8592; Prev</button>
    <span class="dev-info" id="dev-info">${PUZZLE_IDX + 1} / ${PUZZLES.length} &mdash; ${PUZZLE ? PUZZLE.date : '—'}</span>
    <button class="dev-btn" id="dev-next" onclick="devNav(1)">Next &#8594;</button>
  `;
  document.body.insertBefore(bar, document.body.firstChild);
  document.getElementById('dev-prev').disabled = (PUZZLE_IDX <= 0);
  document.getElementById('dev-next').disabled = (PUZZLE_IDX >= PUZZLES.length - 1);
}

function devNav(dir) {
  const next = PUZZLE_IDX + dir;
  if (next < 0 || next >= PUZZLES.length) return;
  const url = new URL(window.location.href);
  url.searchParams.set('dev', '');
  url.searchParams.set('i', String(next));
  window.location.href = url.toString();
}

// ── No-puzzle screen ─────────────────────────────────────────────────────────
function showNoPuzzle() {
  document.getElementById('puzzle-num').textContent = 'PATHFINDER';
  document.getElementById('grid').innerHTML =
    '<p class="no-puzzle-msg">No puzzle today — check back tomorrow!</p>';
  document.querySelector('.rule-strip')?.remove();
  document.querySelector('.info-bar')?.remove();
  document.querySelector('.btn-row')?.remove();
  document.getElementById('msg').textContent = '';
}

// ── Timer ────────────────────────────────────────────────────────────────────
function startTimer() {
  if (startTime) return;
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const s = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer-val').textContent =
      Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }, 500);
}

// ── Build UI ─────────────────────────────────────────────────────────────────
function buildRuleStrip() {
  const strip = document.getElementById('rule-strip');
  strip.innerHTML = '<span class="rule-label">order</span>';

  SEQ.forEach((ci, i) => {
    const dot = document.createElement('span');
    dot.className = 'rule-dot';
    dot.style.background  = COLORS[ci].bg;
    dot.style.boxShadow   = '0 0 0 2px ' + COLORS[ci].light + '66';
    strip.appendChild(dot);

    if (i < SEQ.length - 1) {
      const arr = document.createElement('span');
      arr.className   = 'rule-arrow';
      arr.textContent = '→';
      strip.appendChild(arr);
    }
  });

  const more = document.createElement('span');
  more.className   = 'rule-arrow';
  more.style.color = '#333';
  more.textContent = '→ …';
  strip.appendChild(more);
}

function buildGrid() {
  const el = document.getElementById('grid');
  el.style.gridTemplateColumns = `repeat(${SIZE}, 46px)`;
  el.style.gridTemplateRows    = `repeat(${SIZE}, 46px)`;
  el.innerHTML = '';

  const [sr, sc] = SOLUTION[0];
  const [er, ec] = SOLUTION[SOLUTION.length - 1];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const ci   = GRID[r][c];
      const tile = document.createElement('div');

      tile.className        = 'tile';
      tile.id               = `t${r}_${c}`;
      tile.style.background = COLORS[ci].bg;

      if (r === sr && c === sc) tile.textContent = 'S';
      if (r === er && c === ec) tile.textContent = 'E';

      tile.addEventListener('click', () => clickTile(r, c));
      el.appendChild(tile);
    }
  }

  renderPath();
}

function renderPath() {
  const [sr, sc] = SOLUTION[0];
  const [er, ec] = SOLUTION[SOLUTION.length - 1];

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const tile    = document.getElementById(`t${r}_${c}`);
      const stepIdx = path.findIndex(([pr, pc]) => pr === r && pc === c);
      const onPath  = stepIdx !== -1;

      tile.classList.toggle('on-path', onPath);
      tile.classList.remove('head');

      if (onPath) {
        const isStart = r === sr && c === sc;
        const isEnd   = r === er && c === ec;
        tile.textContent = isStart ? 'S' : isEnd ? 'E' : String(stepIdx);
      } else {
        const isEnd = r === er && c === ec;
        tile.textContent = isEnd ? 'E' : '';
      }
    }
  }

  // Highlight path head
  const [hr, hc] = path[path.length - 1];
  if (!solved) document.getElementById(`t${hr}_${hc}`).classList.add('head');

  document.getElementById('steps-val').textContent = Math.max(0, path.length - 1);
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function isAdjacent([r1, c1], [r2, c2]) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

function isOnPath(r, c) {
  return path.some(([pr, pc]) => pr === r && pc === c);
}

function expectedColor(stepIndex) {
  return SEQ[stepIndex % SEQ.length];
}

function setMsg(text, type = '') {
  const el    = document.getElementById('msg');
  el.textContent = text;
  el.className   = 'msg ' + type;
}

// ── Game actions ──────────────────────────────────────────────────────────────
function clickTile(r, c) {
  if (solved) return;
  startTimer();

  const head = path[path.length - 1];

  // Clicking the head tile does nothing (use undo instead)
  if (head[0] === r && head[1] === c) return;

  if (!isAdjacent(head, [r, c])) {
    setMsg('Tiles must be adjacent', 'error');
    return;
  }

  if (isOnPath(r, c)) {
    setMsg('Already visited — use Undo to backtrack', 'error');
    return;
  }

  const exp    = expectedColor(path.length);
  const actual = GRID[r][c];

  if (actual !== exp) {
    errors++;
    document.getElementById('errors-val').textContent = errors;
    const tile = document.getElementById(`t${r}_${c}`);
    tile.classList.add('wrong');
    setTimeout(() => tile.classList.remove('wrong'), 350);
    setMsg(`Wrong — expected ${COLORS[exp].name}`, 'error');
    return;
  }

  path.push([r, c]);
  renderPath();

  const [er, ec] = SOLUTION[SOLUTION.length - 1];
  if (r === er && c === ec) {
    winGame();
    return;
  }

  const next = expectedColor(path.length);
  setMsg(`Step ${path.length - 1} done — next colour: ${COLORS[next].name}`);
}

function undoStep() {
  if (path.length <= 1 || solved) return;
  path.pop();
  renderPath();
  const next = expectedColor(path.length);
  setMsg(`Undone — next: ${COLORS[next].name}`);
}

function resetPuzzle() {
  path   = [SOLUTION[0].slice()];
  solved = false;

  document.getElementById('modal-overlay').classList.remove('show');

  buildGrid();
  setMsg('Start at S — follow the colour order to reach E');
}

function showHint() {
  if (solved) return;

  if (path.length >= SOLUTION.length) {
    setMsg("You're already at the end!");
    return;
  }

  // Clear any existing hint glow
  if (hintTimeout) clearTimeout(hintTimeout);
  document.querySelectorAll('.tile').forEach(t => t.classList.remove('hinted'));

  const [nr, nc] = SOLUTION[path.length];
  const tile     = document.getElementById(`t${nr}_${nc}`);
  tile.classList.add('hinted');

  hintTimeout = setTimeout(() => tile.classList.remove('hinted'), 1500);
  setMsg(`Hint: move to the glowing tile (${COLORS[GRID[nr][nc]].name})`);
}

// ── Win ───────────────────────────────────────────────────────────────────────
function winGame() {
  solved = true;
  clearInterval(timerInterval);

  const s       = Math.floor((Date.now() - startTime) / 1000);
  const timeStr = Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);

  saveResult(timeStr);

  setMsg('Path complete! Well done.', 'success');

  document.getElementById('win-puzzle-num').textContent =
    `Puzzle #${String(PUZZLE.id).padStart(3, '0')}`;

  // Stats row
  const statsEl = document.getElementById('win-stat');
  statsEl.innerHTML = [
    [path.length - 1, 'Steps'],
    [errors,          'Errors'],
    [timeStr,         'Time'],
  ].map(([val, label]) => `
    <div class="win-stat-item">
      <span class="win-stat-val">${val}</span>
      <span class="win-stat-label">${label}</span>
    </div>`).join('');

  // Streak row
  const { current, best } = getStreaks();
  document.getElementById('win-streak').innerHTML = [
    [current, 'Streak'],
    [best,    'Best'],
  ].map(([val, label]) => `
    <div class="win-streak-item">
      <span class="win-streak-val">${val}</span>
      <span class="win-streak-label">${label}</span>
    </div>`).join('');

  buildWinGrid();
  buildShareString(timeStr);
  buildTomorrowMsg();

  document.querySelector('.btn-row').style.display = 'none';
  document.getElementById('modal-overlay').classList.add('show');
}

function buildWinGrid() {
  const el   = document.getElementById('win-grid');
  const cell = Math.min(32, Math.floor((Math.min(window.innerWidth, 480) - 80) / SIZE));
  el.style.gridTemplateColumns = `repeat(${SIZE}, ${cell}px)`;
  el.style.gridTemplateRows    = `repeat(${SIZE}, ${cell}px)`;
  el.innerHTML = '';

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const div    = document.createElement('div');
      const onPath = path.some(([pr, pc]) => pr === r && pc === c);
      div.className = 'win-cell ' + (onPath ? 'on-path' : 'off-path');
      if (onPath) div.style.background = COLORS[GRID[r][c]].bg;
      el.appendChild(div);
    }
  }
}

function buildTomorrowMsg() {
  const next = PUZZLES[PUZZLE_IDX + 1];
  let html;
  if (next) {
    const d   = new Date(next.date + 'T00:00:00');
    const day = d.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });
    html = `Come back <strong>${day}</strong> for Puzzle #${String(next.id).padStart(3, '0')}`;
  } else {
    html = 'You\'ve completed all available puzzles — check back soon!';
  }
  document.getElementById('win-tomorrow').innerHTML = html;
  document.getElementById('win-footer').innerHTML   = html;
}

function buildShareString(timeStr) {
  let str = `PATHS #${String(PUZZLE.id).padStart(3,'0')}\n`;
  str    += `${path.length - 1} steps · ${errors} errors · ${timeStr}\n`;

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      str += path.some(([pr, pc]) => pr === r && pc === c) ? '🟩' : '⬛';
    }
    str += '\n';
  }

  document.getElementById('share-str').textContent = str.trim();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  document.getElementById('win-footer').classList.add('show');
}

function handleOverlayClick(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function copyShare() {
  const text = document.getElementById('share-str').textContent;
  navigator.clipboard.writeText(text).then(() => {
    setMsg('Copied to clipboard!', 'success');
  });
}
