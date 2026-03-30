/* ========== Quiz App ========== */
const QUIZ_STORAGE = 'mllm-quiz-history';

function getHistory() {
  try { return JSON.parse(localStorage.getItem(QUIZ_STORAGE)) || []; }
  catch { return []; }
}
function saveHistory(entry) {
  const h = getHistory();
  h.unshift(entry);
  if (h.length > 20) h.length = 20;
  localStorage.setItem(QUIZ_STORAGE, JSON.stringify(h));
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2000);
}

/* Shuffle array in place */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ========== Particle Canvas ========== */
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const COLORS = [
    {r:94,g:234,b:212},{r:125,g:211,b:252},{r:196,g:181,b:253},
    {r:134,g:239,b:172},{r:240,g:171,b:252},{r:253,g:230,b:138}
  ];
  let particles = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  for (let i = 0; i < 40; i++) {
    const c = COLORS[Math.floor(Math.random() * COLORS.length)];
    particles.push({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.1 - 0.04,
      r: Math.random() * 1.8 + 0.5, baseAlpha: Math.random() * 0.2 + 0.05,
      alpha: 0, color: c, phase: Math.random() * Math.PI * 2,
      breathSpeed: Math.random() * 0.012 + 0.006
    });
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.phase += p.breathSpeed;
      p.alpha = p.baseAlpha * (0.5 + 0.5 * Math.sin(p.phase));
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha * 0.6})`);
      g.addColorStop(1, `rgba(${p.color.r},${p.color.g},${p.color.b},0)`);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color.r},${p.color.g},${p.color.b},${p.alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* ========== State ========== */
let state = {
  screen: 'home', // home | quiz | results
  mode: 'random',  // random | category | challenge
  selectedCats: [],
  questions: [],
  currentIdx: 0,
  answers: [], // { qIdx, selected, correct }
  timerStart: 0,
  timerInterval: null,
  elapsed: 0,
};

/* ========== Render ========== */
function render() {
  const app = document.getElementById('quiz-app');
  let h = '';
  h += `<canvas id="particleCanvas"></canvas>`;
  h += `<div class="bg-glow"></div><div class="bg-mesh"></div>`;
  h += `<div class="container">`;

  if (state.screen === 'home') {
    h += renderHome();
  } else if (state.screen === 'quiz') {
    h += renderQuiz();
  } else if (state.screen === 'results') {
    h += renderResults();
  }

  h += `</div>`;
  app.innerHTML = h;
  initParticles();

  if (state.screen === 'quiz') startTimer();
}

function renderHome() {
  let h = '';
  // Header
  h += `<div class="quiz-header">
    <div class="quiz-badge">🧪 INTERVIEW SELF-TEST</div>
    <h1>🧠 多模态大模型面试自测</h1>
    <p class="quiz-subtitle">精选40+顶级面试真题，覆盖Transformer、LLM、VLM、推理优化等12大核心板块。检验你的多模态AI知识深度。</p>
    <a href="index.html" class="back-link">← 返回学习资源楼</a>
  </div>`;

  // Mode selector
  h += `<div class="mode-selector">
    <div class="mode-card" style="--mode-accent:#5eead4" onclick="startQuiz('random')">
      <span class="mode-icon">🎲</span>
      <div class="mode-title">随机挑战</div>
      <div class="mode-desc">从题库随机抽取15题，全面检验综合实力</div>
    </div>
    <div class="mode-card" style="--mode-accent:#c4b5fd" onclick="showCategorySelect()">
      <span class="mode-icon">🎯</span>
      <div class="mode-title">分类练习</div>
      <div class="mode-desc">选择特定知识板块进行针对性训练</div>
    </div>
    <div class="mode-card" style="--mode-accent:#fca5a5" onclick="startQuiz('challenge')">
      <span class="mode-icon">🔥</span>
      <div class="mode-title">全量挑战</div>
      <div class="mode-desc">挑战全部${QUIZ_QUESTIONS.length}道题目，看看你能得几分</div>
    </div>
  </div>`;

  // Category select area (hidden by default, shown via JS)
  h += `<div id="catSelectArea" style="display:none">
    <div class="cat-chips">`;
  QUIZ_CATEGORIES.forEach(c => {
    h += `<button class="cat-chip" data-cat="${c.id}" onclick="toggleCat('${c.id}', this)">${c.icon} ${c.label}</button>`;
  });
  h += `</div>
    <div style="text-align:center;margin-top:8px">
      <button class="next-btn" onclick="startCategoryQuiz()" id="startCatBtn" style="opacity:0.4;pointer-events:none">开始练习 →</button>
    </div>
  </div>`;

  // History
  const history = getHistory();
  if (history.length > 0) {
    h += `<div class="history-panel"><h3>📊 历史记录</h3>`;
    history.slice(0, 8).forEach(e => {
      const pct = Math.round((e.correct / e.total) * 100);
      const color = pct >= 80 ? '#86efac' : pct >= 60 ? '#fde68a' : '#fca5a5';
      h += `<div class="history-item">
        <div class="history-score" style="color:${color}">${pct}%</div>
        <div class="history-meta">${e.mode} · ${e.correct}/${e.total} · ${formatTime(e.time)}</div>
        <div class="history-date">${e.date}</div>
      </div>`;
    });
    h += `</div>`;
  }

  h += `<footer><p>🧪 多模态大模型面试自测 — 助你成为顶尖多模态算法工程师</p></footer>`;
  return h;
}

function renderQuiz() {
  const q = state.questions[state.currentIdx];
  const cat = QUIZ_CATEGORIES.find(c => c.id === q.cat);
  const answered = state.answers[state.currentIdx];
  const total = state.questions.length;
  const pct = Math.round(((state.currentIdx + (answered ? 1 : 0)) / total) * 100);
  const labels = ['A', 'B', 'C', 'D'];

  let h = '';
  h += `<div class="quiz-header" style="padding:30px 0 16px">
    <h1 style="font-size:clamp(1.4rem,3vw,2rem)">🧠 面试自测</h1>
  </div>`;

  h += `<div class="quiz-panel">`;

  // Progress + Timer
  h += `<div class="quiz-progress">
    <div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:${pct}%"></div></div>
    <span class="quiz-progress-text">${state.currentIdx + 1} / ${total}</span>
    <div class="timer" id="timer">⏱️ <span id="timerText">00:00</span></div>
  </div>`;

  // Category badge
  h += `<div class="q-cat-badge" style="color:${cat ? cat.accent : '#5eead4'};border-color:${cat ? cat.accent+'33' : ''}">${cat ? cat.icon : ''} ${cat ? cat.label : ''}</div>`;

  // Question
  h += `<div class="question-text">${q.q}</div>`;

  // Options
  h += `<ul class="options-list">`;
  q.opts.forEach((opt, i) => {
    let cls = '';
    if (answered) {
      cls = 'disabled';
      if (i === q.ans) cls += ' correct';
      else if (i === answered.selected && answered.selected !== q.ans) cls += ' wrong';
    }
    h += `<li><button class="option-btn ${cls}" onclick="selectAnswer(${i})">
      <span class="option-label">${labels[i]}</span>
      <span class="option-text">${opt}</span>
    </button></li>`;
  });
  h += `</ul>`;

  // Explanation (shown after answer)
  if (answered) {
    h += `<div class="explanation">
      <div class="exp-title">${answered.correct ? '✅ 回答正确！' : '❌ 回答错误'} 正确答案：${labels[q.ans]}</div>
      <div>${q.exp}</div>
    </div>`;

    if (state.currentIdx < state.questions.length - 1) {
      h += `<button class="next-btn" onclick="nextQuestion()">下一题 →</button>`;
    } else {
      h += `<button class="next-btn" onclick="finishQuiz()">查看结果 🎉</button>`;
    }
  }

  h += `</div>`;
  return h;
}

function renderResults() {
  const total = state.questions.length;
  const correct = state.answers.filter(a => a && a.correct).length;
  const pct = Math.round((correct / total) * 100);
  const elapsed = state.elapsed;

  let grade = '', gradeColor = '', gradeStyle = '';
  if (pct >= 90) { grade = '🏆 大模型专家'; gradeColor = '#86efac'; gradeStyle = 'background:rgba(134,239,172,0.1);color:#86efac;border:1px solid rgba(134,239,172,0.2)'; }
  else if (pct >= 75) { grade = '⭐ 高级工程师'; gradeColor = '#5eead4'; gradeStyle = 'background:rgba(94,234,212,0.1);color:#5eead4;border:1px solid rgba(94,234,212,0.2)'; }
  else if (pct >= 60) { grade = '📘 中级水平'; gradeColor = '#fde68a'; gradeStyle = 'background:rgba(253,230,138,0.1);color:#fde68a;border:1px solid rgba(253,230,138,0.2)'; }
  else { grade = '📖 继续加油'; gradeColor = '#fca5a5'; gradeStyle = 'background:rgba(252,165,165,0.1);color:#fca5a5;border:1px solid rgba(252,165,165,0.2)'; }

  let h = '';
  h += `<div class="quiz-header" style="padding:30px 0 16px">
    <h1 style="font-size:clamp(1.4rem,3vw,2rem)">📊 测试结果</h1>
  </div>`;

  h += `<div class="quiz-panel"><div class="results-panel">`;
  h += `<div class="results-score">${pct}%</div>`;
  h += `<div class="results-label">正确率</div>`;
  h += `<div class="results-grade" style="${gradeStyle}">${grade}</div>`;

  h += `<div class="results-stats">
    <div class="result-stat"><div class="result-stat-num">${correct}</div><div class="result-stat-label">正确题数</div></div>
    <div class="result-stat"><div class="result-stat-num">${total - correct}</div><div class="result-stat-label">错误题数</div></div>
    <div class="result-stat"><div class="result-stat-num">${formatTime(elapsed)}</div><div class="result-stat-label">用时</div></div>
  </div>`;

  // Category breakdown
  const catStats = {};
  state.answers.forEach((a, i) => {
    if (!a) return;
    const q = state.questions[i];
    if (!catStats[q.cat]) catStats[q.cat] = { correct: 0, total: 0 };
    catStats[q.cat].total++;
    if (a.correct) catStats[q.cat].correct++;
  });

  h += `<div class="cat-breakdown"><h3>📋 分类得分</h3>`;
  Object.keys(catStats).forEach(catId => {
    const cat = QUIZ_CATEGORIES.find(c => c.id === catId);
    const s = catStats[catId];
    const p = Math.round((s.correct / s.total) * 100);
    const color = p >= 80 ? '#86efac' : p >= 60 ? '#fde68a' : '#fca5a5';
    h += `<div class="cat-bar-item">
      <span class="cat-bar-label">${cat ? cat.icon : ''} ${cat ? cat.label : catId}</span>
      <div class="cat-bar-track"><div class="cat-bar-fill" style="width:${p}%;background:${color}"></div></div>
      <span class="cat-bar-pct" style="color:${color}">${s.correct}/${s.total}</span>
    </div>`;
  });
  h += `</div>`;

  // Wrong answers review
  const wrongs = state.answers.map((a, i) => ({ ...a, idx: i })).filter(a => a && !a.correct);
  if (wrongs.length > 0) {
    const labels = ['A', 'B', 'C', 'D'];
    h += `<div class="review-list"><h3>❌ 错题回顾</h3>`;
    wrongs.forEach(w => {
      const q = state.questions[w.idx];
      h += `<div class="review-item">
        <div class="review-q"><span style="color:#fca5a5">✗</span> ${q.q}</div>
        <div class="review-answer">
          你的答案：${labels[w.selected]} · <span class="correct-text">正确答案：${labels[q.ans]} — ${q.opts[q.ans]}</span>
        </div>
      </div>`;
    });
    h += `</div>`;
  }

  h += `<div class="result-actions">
    <button class="action-btn primary" onclick="goHome()">🏠 返回首页</button>
    <button class="action-btn" onclick="startQuiz('random')">🎲 再来一轮</button>
    <button class="action-btn" onclick="retryWrong()">🔄 错题重做 (${wrongs.length})</button>
  </div>`;

  h += `</div></div>`;

  h += `<footer><p>🧪 多模态大模型面试自测 — 目标：成为全世界最厉害的多模态算法工程师 🚀</p></footer>`;
  return h;
}

/* ========== Actions ========== */
function startQuiz(mode) {
  state.mode = mode;
  state.currentIdx = 0;
  state.answers = [];

  if (mode === 'random') {
    state.questions = shuffle([...QUIZ_QUESTIONS]).slice(0, 15);
  } else if (mode === 'challenge') {
    state.questions = shuffle([...QUIZ_QUESTIONS]);
  }

  state.screen = 'quiz';
  state.timerStart = Date.now();
  state.elapsed = 0;
  render();
}

function showCategorySelect() {
  state.selectedCats = [];
  const area = document.getElementById('catSelectArea');
  if (area) area.style.display = '';
}

function toggleCat(catId, el) {
  const idx = state.selectedCats.indexOf(catId);
  if (idx > -1) { state.selectedCats.splice(idx, 1); el.classList.remove('active'); }
  else { state.selectedCats.push(catId); el.classList.add('active'); }
  const btn = document.getElementById('startCatBtn');
  if (btn) {
    btn.style.opacity = state.selectedCats.length > 0 ? '1' : '0.4';
    btn.style.pointerEvents = state.selectedCats.length > 0 ? 'auto' : 'none';
  }
}

function startCategoryQuiz() {
  if (state.selectedCats.length === 0) return;
  state.mode = 'category';
  state.currentIdx = 0;
  state.answers = [];
  state.questions = shuffle(QUIZ_QUESTIONS.filter(q => state.selectedCats.includes(q.cat)));
  if (state.questions.length === 0) { showToast('所选分类暂无题目'); return; }
  state.screen = 'quiz';
  state.timerStart = Date.now();
  state.elapsed = 0;
  render();
}

function selectAnswer(idx) {
  if (state.answers[state.currentIdx]) return;
  const q = state.questions[state.currentIdx];
  state.answers[state.currentIdx] = {
    qIdx: state.currentIdx,
    selected: idx,
    correct: idx === q.ans
  };
  render();
  if (state.answers[state.currentIdx].correct) showToast('✅ 正确！');
  else showToast('❌ 错误');
}

function nextQuestion() {
  state.currentIdx++;
  render();
}

function finishQuiz() {
  state.elapsed = Math.floor((Date.now() - state.timerStart) / 1000);
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  state.screen = 'results';

  const correct = state.answers.filter(a => a && a.correct).length;
  const modeLabel = state.mode === 'random' ? '随机15题' : state.mode === 'challenge' ? '全量挑战' : '分类练习';
  saveHistory({
    mode: modeLabel,
    correct: correct,
    total: state.questions.length,
    time: state.elapsed,
    date: new Date().toLocaleDateString('zh-CN')
  });

  render();
}

function goHome() {
  state.screen = 'home';
  state.selectedCats = [];
  if (state.timerInterval) { clearInterval(state.timerInterval); state.timerInterval = null; }
  render();
}

function retryWrong() {
  const wrongs = state.answers.map((a, i) => ({ ...a, idx: i })).filter(a => a && !a.correct);
  if (wrongs.length === 0) { showToast('没有错题！'); return; }
  state.questions = wrongs.map(w => state.questions[w.idx]);
  state.currentIdx = 0;
  state.answers = [];
  state.mode = 'retry';
  state.screen = 'quiz';
  state.timerStart = Date.now();
  state.elapsed = 0;
  render();
}

/* ========== Timer ========== */
function startTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    const el = document.getElementById('timerText');
    if (!el) return;
    const elapsed = Math.floor((Date.now() - state.timerStart) / 1000);
    el.textContent = formatTime(elapsed);
    const timer = document.getElementById('timer');
    if (timer) {
      timer.classList.toggle('warning', elapsed > 300 && elapsed <= 600);
      timer.classList.toggle('danger', elapsed > 600);
    }
  }, 1000);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/* ========== Keyboard ========== */
document.addEventListener('keydown', e => {
  if (state.screen !== 'quiz') return;
  const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
  if (e.key.toLowerCase() in keyMap && !state.answers[state.currentIdx]) {
    selectAnswer(keyMap[e.key.toLowerCase()]);
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (state.answers[state.currentIdx]) {
      if (state.currentIdx < state.questions.length - 1) nextQuestion();
      else finishQuiz();
    }
  }
});

/* ========== Init ========== */
document.addEventListener('DOMContentLoaded', () => { render(); });
