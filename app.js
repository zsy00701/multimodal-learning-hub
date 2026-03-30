/* ========== Utility Functions ========== */
function escapeAttr(str) {
  return str.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ========== Navigation Groups — organize 24 tabs into logical categories ========== */
const NAV_GROUPS = [
  { label: '基础', ids: ['overview', 'math', 'dl', 'cv', 'nlp', 'cs-fundamentals'] },
  { label: '架构', ids: ['transformer', 'arch-internals', 'llm', 'tokenization', 'vit'] },
  { label: '多模态', ids: ['vlm-arch', 'models', 'reasoning', 'rag-ground', 'frontier'] },
  { label: '扩展', ids: ['audio-mm', 'generation', 'safety', 'domain-apps'] },
  { label: '工程', ids: ['inference', 'eval-bench', 'resources', 'practice', 'interview'] },
];

/* Section accent color mapping */
const SECTION_ACCENTS = {
  'overview': '#2563eb', 'math': '#4f46e5', 'dl': '#7c3aed', 'cv': '#16a34a',
  'nlp': '#0891b2', 'cs-fundamentals': '#ea580c', 'transformer': '#d97706', 'arch-internals': '#7c3aed',
  'llm': '#ea580c', 'tokenization': '#16a34a', 'vit': '#0891b2',
  'vlm-arch': '#7c3aed', 'models': '#dc2626', 'reasoning': '#7c3aed',
  'rag-ground': '#16a34a', 'frontier': '#dc2626', 'audio-mm': '#ea580c',
  'generation': '#7c3aed', 'safety': '#d97706', 'domain-apps': '#0891b2',
  'inference': '#16a34a', 'eval-bench': '#4f46e5', 'resources': '#2563eb',
  'practice': '#16a34a', 'interview': '#d97706'
};

/* ========== Progress Tracking (localStorage) ========== */
const STORAGE_KEY = 'mllm-learning-progress';
const BOOKMARK_KEY = 'mllm-bookmarks';
const STREAK_KEY = 'mllm-streak';

function getProgress() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } 
  catch { return {}; }
}
function setProgress(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function getBookmarks() {
  try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY)) || []; }
  catch { return []; }
}
function setBookmarks(data) { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(data)); }
function getStreak() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY)) || { count: 0, lastDate: '' }; }
  catch { return { count: 0, lastDate: '' }; }
}
function updateStreak() {
  const streak = getStreak();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (streak.lastDate === today) return streak;
  if (streak.lastDate === yesterday) { streak.count++; }
  else if (streak.lastDate !== today) { streak.count = 1; }
  streak.lastDate = today;
  localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  return streak;
}

function getCardId(sectionId, cardIdx) { return `${sectionId}-${cardIdx}`; }
function isCardCompleted(cardId) { return !!getProgress()[cardId]; }

function toggleCardComplete(cardId) {
  const progress = getProgress();
  if (progress[cardId]) { delete progress[cardId]; }
  else { progress[cardId] = Date.now(); updateStreak(); }
  setProgress(progress);
  updateAllProgressUI();
  showToast(progress[cardId] ? '✅ 已标记为完成' : '↩️ 已取消完成');
}

function isBookmarked(cardId) { return getBookmarks().includes(cardId); }
function toggleBookmark(cardId) {
  let bm = getBookmarks();
  if (bm.includes(cardId)) { bm = bm.filter(b => b !== cardId); showToast('🔖 已取消收藏'); }
  else { bm.push(cardId); showToast('⭐ 已收藏'); }
  setBookmarks(bm);
  updateAllProgressUI();
}

/* ========== Difficulty & Study Time ========== */
function getDifficulty(tag) {
  const map = { 'required': 2, 'important': 3, 'advanced': 4, 'practical': 3, 'paper': 4, 'new': 3 };
  return map[tag] || 2;
}
function getDifficultyLabel(level) {
  return ['', '', '基础', '中等', '进阶', '专家'][level] || '基础';
}
function estimateStudyTime(item) {
  const subCount = (item.subs || []).filter(s => s.trim() !== '').length;
  const resCount = (item.resources || []).length;
  return Math.max(2, Math.round(subCount * 0.5 + resCount * 1.5));
}

/* ========== Toast Notification ========== */
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) { toast = document.createElement('div'); toast.id = 'toast'; toast.className = 'toast'; document.body.appendChild(toast); }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2000);
}

/* ========== Particles — disabled for clean theme ========== */
function initParticles() { /* no-op for clean theme */ }

/* ========== Animated Counter ========== */
function animateCounter(el, target) {
  const duration = 1500, startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(target * eased);
    el.textContent = current + (el.dataset.suffix || '');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ========== Main App Init ========== */
function initApp() {
  const container = document.getElementById('app');
  const progress = getProgress();
  const bookmarks = getBookmarks();
  const streak = updateStreak();
  
  let html = '';
  html += `<canvas id="particleCanvas"></canvas>`;
  html += `<div class="bg-glow"></div><div class="bg-mesh"></div>`;
  html += `<div class="progress-bar" id="progressBar" style="width:0%"></div>`;
  html += `<div class="container">`;

  // SVG gradient
  html += `<svg width="0" height="0" style="position:absolute"><defs>
    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#4f46e5"/>
    </linearGradient>
  </defs></svg>`;

  // Stats (compute first so hero can use totalTopics)
  const totalTopics = SECTIONS.reduce((a, s) => a + (s.items?.length || 0), 0);
  const totalPapers = SECTIONS.reduce((a, s) => a + (s.items || []).reduce((b, i) => b + (i.resources || []).filter(r => r.type === 'paper').length, 0), 0);
  const totalCode = SECTIONS.reduce((a, s) => a + (s.items || []).reduce((b, i) => b + (i.resources || []).filter(r => r.type === 'code').length, 0), 0);
  const totalCompleted = Object.keys(progress).length;
  const totalStudyHoursAll = SECTIONS.reduce((a, s) => a + (s.items || []).reduce((b, i) => b + estimateStudyTime(i), 0), 0);

  // Hero
  html += `<div class="hero">
    <div class="hero-badge">🎯 MULTIMODAL AI MASTERY ROADMAP</div>
    <h1>🏗️ 多模态大模型学习资源楼</h1>
    <p class="hero-subtitle">从数学基础到前沿模型，系统掌握多模态大模型的核心知识体系。<br>${SECTIONS.length} 个知识板块 · ${totalTopics}+ 知识专题 · 层层递进，构建完整技术栈。</p>
    <div class="hero-stats-divider"></div>
    <span class="update-badge">🔄 最后更新: 2026.03 | GPT-5.4 · Claude 4.6 · Gemini 3.1 · Qwen3.5 · LLaMA 4</span>
  </div>`;
  
  html += `<div class="stats">
    <div class="stat-card"><div class="stat-num" data-target="${SECTIONS.length}" data-suffix="">0</div><div class="stat-label">知识板块</div></div>
    <div class="stat-card"><div class="stat-num" data-target="${totalTopics}" data-suffix="">0</div><div class="stat-label">知识专题</div></div>
    <div class="stat-card"><div class="stat-num" data-target="${totalPapers}" data-suffix="+">0</div><div class="stat-label">必读论文</div></div>
    <div class="stat-card"><div class="stat-num" data-target="${totalCode}" data-suffix="+">0</div><div class="stat-label">代码仓库</div></div>
    <div class="stat-card">
      <div class="stat-num">
        ${streak.count > 0 ? `<span class="streak-fire">🔥</span> ${streak.count}` : '∞'}
      </div>
      <div class="stat-label">${streak.count > 0 ? '连续学习天数' : '学习激情'}</div>
    </div>
  </div>`;

  // Overall Progress
  const completionPct = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;
  html += `<div class="overall-progress" id="overallProgress">
    <div class="progress-info">
      <h3>📊 整体学习进度</h3>
      <div class="progress-text">已完成 <strong>${totalCompleted}</strong> / ${totalTopics} 个专题</div>
    </div>
    <div class="progress-bar-track"><div class="progress-bar-fill" id="progressFill" style="width:${completionPct}%"></div></div>
    <div class="progress-pct" id="progressPct">${completionPct}%</div>
  </div>`;

  // Search
  html += `<div class="search-wrap">
    <span class="search-icon">🔍</span>
    <input type="text" id="searchInput" placeholder="搜索知识点、论文、模型...  (快捷键 /)" oninput="handleSearch(this.value)">
    <button class="search-clear" id="searchClear" onclick="clearSearch()" style="display:none">✕</button>
  </div>
  <div class="search-result" id="searchResult" style="display:none"></div>`;

  // Grouped Navigation
  html += `<div class="nav-sticky" id="navSticky"><div class="nav-groups">`;
  const sectionMap = {};
  SECTIONS.forEach(s => { sectionMap[s.id] = s; });
  
  NAV_GROUPS.forEach(group => {
    html += `<div class="nav-group">`;
    html += `<span class="nav-group-label">${group.label}</span>`;
    html += `<div class="nav-group-tabs">`;
    group.ids.forEach(id => {
      const s = sectionMap[id];
      if (!s) return;
      const sectionIdx = SECTIONS.findIndex(sec => sec.id === id);
      const sectionItems = s.items || [];
      const sectionCompleted = sectionItems.filter((_, ci) => progress[getCardId(s.id, ci)]).length;
      const tabPct = sectionItems.length > 0 ? Math.round((sectionCompleted / sectionItems.length) * 100) : 0;
      const hasBookmark = sectionItems.some((_, ci) => bookmarks.includes(getCardId(s.id, ci)));
      html += `<button class="nav-tab ${sectionIdx === 0 ? 'active' : ''}" onclick="switchTab('${s.id}', this)" data-section="${s.id}">
        ${s.label}
        ${hasBookmark ? '<span class="bookmark-dot"></span>' : ''}
        <span class="tab-progress" style="width:${tabPct}%"></span>
      </button>`;
    });
    html += `</div></div>`;
  });
  html += `</div></div>`;

  // Sections
  SECTIONS.forEach((s, i) => {
    const sectionAccent = SECTION_ACCENTS[s.id] || '#6366f1';
    html += `<div class="section ${i===0?'active':''}" id="section-${s.id}" style="--section-accent:${sectionAccent}">`;
    
    const sectionItems = s.items || [];
    const sectionCompleted = sectionItems.filter((_, ci) => progress[getCardId(s.id, ci)]).length;
    const sectionPct = sectionItems.length > 0 ? Math.round((sectionCompleted / sectionItems.length) * 100) : 0;
    const circumference = 2 * Math.PI * 20;
    const dashOffset = circumference - (sectionPct / 100) * circumference;
    const totalStudyHours = s.type !== 'timeline' ? sectionItems.reduce((a, item) => a + estimateStudyTime(item), 0) : 0;
    const totalResources = sectionItems.reduce((a, item) => a + (item.resources || []).length, 0);
    
    html += `<div class="section-header">
      <div class="section-header-text">
        <h2>${s.icon} ${s.title}</h2>
        <p>${s.desc}</p>
        ${s.type !== 'timeline' ? `<div class="section-meta">
          <span class="section-meta-item">📚 <span class="meta-val">${sectionItems.length}</span> 专题</span>
          <span class="section-meta-item">🔗 <span class="meta-val">${totalResources}</span> 资源</span>
          <span class="section-meta-item">⏱️ ~<span class="meta-val">${totalStudyHours}</span>h</span>
          <span class="section-meta-item">✅ <span class="meta-val">${sectionCompleted}</span>/${sectionItems.length}</span>
        </div>` : ''}
      </div>
      ${s.type !== 'timeline' ? `
        <div class="section-progress-ring" data-section="${s.id}">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle class="ring-bg" cx="26" cy="26" r="20"/>
            <circle class="ring-fill" cx="26" cy="26" r="20" 
              stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"/>
            <text class="section-progress-text" x="26" y="26" transform="rotate(90 26 26)">${sectionPct}%</text>
          </svg>
        </div>` : ''}
    </div>`;

    if (s.type === 'timeline') {
      html += `<div class="timeline">`;
      s.items.forEach(item => {
        const isNew = item.phase && item.phase.includes('[NEW]');
        const cleanPhase = item.phase ? item.phase.replace('[NEW]', '').trim() : '';
        html += `<div class="timeline-item">
          <h4>${cleanPhase} ${isNew ? '<span class="phase-tag new">NEW</span>' : ''}</h4>
          <p>${item.desc}</p>
        </div>`;
      });
      html += `</div>`;
    } else {
      html += `<button class="expand-all-btn" onclick="toggleAllCards(this)">📂 展开全部</button>`;
      html += `<div class="card-grid">`;
      s.items.forEach((item, ci) => {
        const cardId = getCardId(s.id, ci);
        const completed = !!progress[cardId];
        const bookmarked = bookmarks.includes(cardId);
        const tagClass = item.tag ? `tag-${item.tag}` : '';
        const difficulty = getDifficulty(item.tag);
        const studyHours = estimateStudyTime(item);
        const cardAccent = item.accent || sectionAccent;
        
        html += `<div class="card ${completed ? 'completed' : ''}" 
          style="--card-accent:${cardAccent}" 
          data-search="${escapeAttr((item.title + ' ' + item.desc + ' ' + (item.subs || []).join(' ')).toLowerCase())}"
          data-card-id="${cardId}" data-visible="false">`;
        
        html += `<div class="card-title">${item.title} ${item.tagText ? `<span class="card-tag ${tagClass}">${item.tagText}</span>` : ''}</div>`;
        html += `<div class="card-desc">${item.desc}</div>`;
        
        html += `<div class="card-actions">
          <button class="card-action-btn ${completed ? 'active' : ''}" onclick="toggleCardComplete('${cardId}')">
            ${completed ? '✅ 已完成' : '⬜ 标记完成'}
          </button>
          <button class="card-action-btn ${bookmarked ? 'bookmarked' : ''}" onclick="toggleBookmark('${cardId}')">
            ${bookmarked ? '⭐ 已收藏' : '🔖 收藏'}
          </button>
          <span class="study-time">⏱️ ~${studyHours}h</span>
        </div>`;

        html += `<div class="difficulty-bar">`;
        for (let d = 1; d <= 5; d++) html += `<span class="difficulty-dot ${d <= difficulty ? 'filled' : ''}"></span>`;
        html += `<span class="difficulty-label">${getDifficultyLabel(difficulty)}</span></div>`;

        if (item.subs && item.subs.length) {
          const validSubs = item.subs.filter(s => s.trim() !== '');
          html += `<div class="collapsible-header" onclick="toggleCollapsible(this)">
            <span style="font-size:0.8rem;color:var(--text-muted)">📋 详细内容 (${validSubs.length} 项)</span>
            <span class="arrow">▶</span>
          </div><div class="collapsible-body"><ul class="sub-items">`;
          item.subs.forEach(sub => { html += renderSubItem(sub); });
          html += `</ul></div>`;
        }

        if (item.resources && item.resources.length) {
          html += `<div class="resources">`;
          item.resources.forEach(r => {
            html += `<a href="${r.url}" target="_blank" rel="noopener" class="res-link ${r.type}">${getResIcon(r.type)} ${r.text}</a>`;
          });
          html += `</div>`;
        }
        html += `</div>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
  });

  html += `</div>`;
  
  // Footer
  html += `<footer>
    <p>🏗️ 多模态大模型学习资源楼 — 持续更新中 | 截止 2026.03</p>
    <p style="margin-top:6px;font-size:0.7rem;color:var(--text-muted)">
      快捷键: <kbd>/</kbd> 搜索 · <kbd>Esc</kbd> 清除 · <kbd>←</kbd><kbd>→</kbd> 切换板块 · <kbd>E</kbd> 展开/折叠
    </p>
    <div class="footer-links">
      <a href="#" onclick="resetProgress();return false;">🔄 重置进度</a>
      <a href="#" onclick="exportProgress();return false;">💾 导出进度</a>
      <a href="#" onclick="importProgress();return false;">📥 导入进度</a>
      <a href="#" onclick="showStats();return false;">📊 学习统计</a>
      <a href="quiz.html">🧪 面试自测</a>
    </div>
    <p class="footer-motto">目标：成为全世界最厉害的多模态算法工程师 🚀</p>
  </footer>`;
  
  html += `<button class="back-to-top" id="backToTop" onclick="window.scrollTo({top:0,behavior:'smooth'})">↑</button>`;
  
  container.innerHTML = html;
  initParticles();
  initCounterAnimations();
  initCardObserver();
  initCardMouseTracking();
}

/* ========== Math Formula Formatter ========== */
function formatMathInText(text) {
  // Step 1: Protect code-like tokens and already-wrapped HTML
  const protectedTokens = [];
  let s = text.replace(/(?:https?:\/\/[^\s,)]+|[a-zA-Z_]\w*\.[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)+)/g, (m) => {
    protectedTokens.push(m);
    return `__P${protectedTokens.length - 1}__`;
  });

  // Step 2: Process superscripts first — X^T, X^2, X^(expr), X^{expr}
  s = s.replace(/([A-Za-zα-ωΑ-Ωŷ0-9₀₁₂₃₄₅₆₇₈₉)}\]])\^(\([^)]+\)|\{[^}]+\}|[A-Za-z0-9γ+\-]+)/g,
    (m, base, exp) => {
      const cleanExp = exp.replace(/^\(|\)$/g, '').replace(/^\{|\}$/g, '');
      return `${base}<sup>${cleanExp}</sup>`;
    }
  );

  // Step 3: Process ASCII subscripts — X_gate, W_h, x_t, d_k, d_head etc.
  s = s.replace(/([A-Za-zα-ωΑ-Ω0-9])_([a-zA-Z][a-zA-Z0-9]*)/g, (m, base, sub) => {
    // Skip underscores in code identifiers like __init__, dataset_name etc.
    if (/^[a-z]{4,}$/.test(sub) && !/^(gate|head|model|max|uncond|cond|aligned|threshold|pos|neg|key|query|value|proj|out|in|ff)$/.test(sub)) return m;
    return `${base}<sub>${sub}</sub>`;
  });

  // Step 4: Process _{expr} subscripts
  s = s.replace(/_\{([^}]+)\}/g, (_, sub) => `<sub>${sub}</sub>`);

  // Step 5: Wrap detected mathematical expressions in styled tags
  // Pattern A: Known math functions with parentheses
  s = s.replace(/\b(softmax|sigmoid|tanh|ReLU|GELU|SiLU|Swish|RMSNorm|LayerNorm|FFN|Attention|cos|sin|log|exp|max|min|mean|RMS|sign)\(([^)]*)\)/g,
    (m, fn, args) => `<code class="math-expr">${fn}(${args})</code>`
  );

  // Pattern B: Information theory / probability notation — H(X), KL(P||Q), I(X;Y), P(A|B), q(x|y)
  s = s.replace(/\b([HPIqN])\(([^)]+)\)/g, (m, fn, args) => {
    if (/[|;,]/.test(args) || /^[A-Z]/.test(args)) {
      return `<code class="math-expr">${fn}(${args})</code>`;
    }
    return m;
  });
  s = s.replace(/\bKL\(([^)]+)\)/g, (m, args) => `<code class="math-expr">KL(${args})</code>`);

  // Pattern C: Complexity notation O(n²), O(n), O(nlogn), O(1)
  s = s.replace(/O\(([^)]*)\)/g, (m, args) => `<code class="math-expr">O(${args})</code>`);

  // Pattern D: Full equation patterns — "LHS = RHS" where LHS contains math-like chars
  // Detect lines that have = sign with math content around it
  s = s.replace(
    /(?:^|(?<=:\s))([A-Za-zα-ωΑ-Ωε∂∇λσθγμŷ][A-Za-z0-9_<>\/\s₀₁₂₃₄₅₆₇₈₉ₜ]*(?:<su[bp]>[^<]*<\/su[bp]>)?)\s*=\s*([A-Za-zα-ωΑ-Ωε∂∇λσθγμŷ0-9_<>\/\s₀₁₂₃₄₅₆₇₈₉ₜ()⊙·×√∑∏∫\+\-\*|,;^]+(?:<su[bp]>[^<]*<\/su[bp]>)*[A-Za-z0-9)>₀₁₂₃₄₅₆₇₈₉ₜ])/g,
    (m) => {
      // Only wrap if it contains math-like content and is reasonably short
      if (m.length > 120) return m;
      if (/<code/.test(m)) return m; // already has code tags
      const hasMath = /[⊙·×√∑∏∫∂∇λσθγμ∈≈]|<su[bp]>|[₀₁₂₃₄₅₆₇₈₉ₜ]/.test(m);
      const hasFormula = /[+\-*/|]/.test(m) && /[A-Z].*=.*[A-Z]/.test(m);
      if (hasMath || hasFormula) {
        return `<code class="math-expr">${m.trim()}</code>`;
      }
      return m;
    }
  );

  // Pattern E: Standalone math with Unicode math operators not yet wrapped
  s = s.replace(
    /(?<![<\w"])([A-Za-zα-ωΑ-Ωŷ][A-Za-z0-9₀₁₂₃₄₅₆₇₈₉ₜ<>\/]*(?:<su[bp]>[^<]*<\/su[bp]>)?)([·×⊙∈])([A-Za-zα-ωΑ-Ωŷ][A-Za-z0-9₀₁₂₃₄₅₆₇₈₉ₜ<>\/]*(?:<su[bp]>[^<]*<\/su[bp]>)?)/g,
    (m) => {
      if (/<code/.test(m)) return m;
      return `<code class="math-expr">${m}</code>`;
    }
  );

  // Pattern F: Standalone superscripted terms not yet wrapped
  s = s.replace(
    /(?<![<\w"=])([A-Za-zα-ωΑ-Ω][A-Za-z0-9₀₁₂₃₄₅₆₇₈₉]*)<sup>([^<]+)<\/sup>(?![>\w])/g,
    (m, base, exp) => {
      if (/<code/.test(m)) return m;
      return `<code class="math-expr">${base}<sup>${exp}</sup></code>`;
    }
  );

  // Step 6: Restore protected tokens
  s = s.replace(/__P(\d+)__/g, (_, i) => protectedTokens[parseInt(i)]);

  return s;
}

function renderSubItem(sub) {
  if (sub.trim() === '') return `<li class="sub-empty"></li>`;
  const emojiRe = /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2702}-\u{27B0}]/u;
  if (emojiRe.test(sub.trim()) && !sub.startsWith('  ')) return `<li class="sub-heading">${formatMathInText(sub)}</li>`;
  if (sub.startsWith('  ')) return `<li class="sub-indent">${formatMathInText(sub.trim())}</li>`;
  return `<li>${formatMathInText(sub)}</li>`;
}

function getResIcon(type) { return { paper: '📄', video: '🎬', code: '💻', course: '🎓' }[type] || '🔗'; }

function initCounterAnimations() {
  document.querySelectorAll('.stat-num[data-target]').forEach(el => {
    const target = parseInt(el.dataset.target);
    if (!isNaN(target)) { el.dataset.suffix = el.dataset.suffix || ''; animateCounter(el, target); }
  });
}

function initCardObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.dataset.visible = 'true'; observer.unobserve(entry.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.card[data-visible]').forEach(card => observer.observe(card));
}

function initCardMouseTracking() {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });
  });
}

/* ========== Tab Switch ========== */
function switchTab(id, btn) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  const sec = document.getElementById('section-' + id);
  sec.classList.add('active');
  sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.dataset.visible = 'true'; observer.unobserve(entry.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    sec.querySelectorAll('.card[data-visible="false"]').forEach(card => observer.observe(card));
  }, 100);
}

/* ========== Collapsible ========== */
function toggleCollapsible(header) {
  header.classList.toggle('open');
  header.nextElementSibling.classList.toggle('open');
}
function toggleAllCards(btn) {
  const section = btn.closest('.section');
  const headers = section.querySelectorAll('.collapsible-header');
  const isExpanding = btn.textContent.includes('展开');
  headers.forEach(h => {
    if (isExpanding) { h.classList.add('open'); h.nextElementSibling.classList.add('open'); }
    else { h.classList.remove('open'); h.nextElementSibling.classList.remove('open'); }
  });
  btn.textContent = isExpanding ? '📁 收起全部' : '📂 展开全部';
}

/* ========== Search ========== */
function handleSearch(val) {
  const q = val.toLowerCase().trim();
  const clearBtn = document.getElementById('searchClear');
  const resultDiv = document.getElementById('searchResult');
  clearBtn.style.display = q ? '' : 'none';
  let matchCount = 0;
  document.querySelectorAll('.card').forEach(card => {
    const match = !q || (card.getAttribute('data-search') || '').includes(q);
    card.style.display = match ? '' : 'none';
    if (q && match) matchCount++;
  });
  if (q) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('active'));
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.expand-all-btn').forEach(b => b.style.display = 'none');
    resultDiv.style.display = '';
    resultDiv.textContent = `🔍 找到 ${matchCount} 个相关专题`;
  } else {
    resultDiv.style.display = 'none';
    document.querySelectorAll('.expand-all-btn').forEach(b => b.style.display = '');
  }
}
function clearSearch() {
  const input = document.getElementById('searchInput');
  input.value = ''; handleSearch(''); input.blur();
  const tabs = document.querySelectorAll('.nav-tab');
  const sections = document.querySelectorAll('.section');
  tabs.forEach(t => t.classList.remove('active'));
  sections.forEach(s => s.classList.remove('active'));
  if (tabs[0]) tabs[0].classList.add('active');
  if (sections[0]) sections[0].classList.add('active');
}

/* ========== Update All Progress UI ========== */
function updateAllProgressUI() {
  const progress = getProgress();
  const bookmarks = getBookmarks();
  const totalTopics = SECTIONS.reduce((a, s) => a + (s.items?.length || 0), 0);
  const totalCompleted = Object.keys(progress).length;
  const completionPct = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

  const fill = document.getElementById('progressFill');
  const pct = document.getElementById('progressPct');
  if (fill) fill.style.width = completionPct + '%';
  if (pct) pct.textContent = completionPct + '%';

  document.querySelectorAll('.card[data-card-id]').forEach(card => {
    const cardId = card.dataset.cardId;
    const completed = !!progress[cardId];
    const bookmarked = bookmarks.includes(cardId);
    card.classList.toggle('completed', completed);
    const completeBtn = card.querySelector('.card-action-btn:first-child');
    if (completeBtn) { completeBtn.classList.toggle('active', completed); completeBtn.innerHTML = completed ? '✅ 已完成' : '⬜ 标记完成'; }
    const bmBtn = card.querySelectorAll('.card-action-btn')[1];
    if (bmBtn) { bmBtn.classList.toggle('bookmarked', bookmarked); bmBtn.innerHTML = bookmarked ? '⭐ 已收藏' : '🔖 收藏'; }
  });

  SECTIONS.forEach(s => {
    const sectionItems = s.items || [];
    const sectionCompleted = sectionItems.filter((_, ci) => progress[getCardId(s.id, ci)]).length;
    const sectionPct = sectionItems.length > 0 ? Math.round((sectionCompleted / sectionItems.length) * 100) : 0;
    const circumference = 2 * Math.PI * 20;
    const dashOffset = circumference - (sectionPct / 100) * circumference;
    const ring = document.querySelector(`.section-progress-ring[data-section="${s.id}"] .ring-fill`);
    if (ring) ring.setAttribute('stroke-dashoffset', dashOffset);
    const text = document.querySelector(`.section-progress-ring[data-section="${s.id}"] .section-progress-text`);
    if (text) text.textContent = sectionPct + '%';
    const tab = document.querySelector(`.nav-tab[data-section="${s.id}"] .tab-progress`);
    if (tab) tab.style.width = sectionPct + '%';
  });
}

/* ========== Progress Management ========== */
function resetProgress() {
  if (confirm('确定要重置所有学习进度吗？此操作不可撤销。')) {
    localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(BOOKMARK_KEY);
    showToast('🔄 进度已重置');
    setTimeout(() => location.reload(), 500);
  }
}
function exportProgress() {
  const data = { progress: getProgress(), bookmarks: getBookmarks(), streak: getStreak(), exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url;
  a.download = `mllm-progress-${new Date().toISOString().split('T')[0]}.json`;
  a.click(); URL.revokeObjectURL(url);
  showToast('💾 进度已导出');
}
function importProgress() {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.progress) setProgress(data.progress);
        if (data.bookmarks) setBookmarks(data.bookmarks);
        showToast('📥 进度已导入');
        setTimeout(() => location.reload(), 500);
      } catch { showToast('❌ 文件格式错误'); }
    };
    reader.readAsText(file);
  };
  input.click();
}
function showStats() {
  const progress = getProgress();
  const bookmarks = getBookmarks();
  const streak = getStreak();
  const totalTopics = SECTIONS.reduce((a, s) => a + (s.items?.length || 0), 0);
  const totalCompleted = Object.keys(progress).length;
  let sectionStats = '';
  SECTIONS.forEach(s => {
    if (s.type === 'timeline') return;
    const items = s.items || [];
    const completed = items.filter((_, ci) => progress[getCardId(s.id, ci)]).length;
    const pct = items.length > 0 ? Math.round((completed / items.length) * 100) : 0;
    const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
    sectionStats += `${s.icon} ${s.title.slice(0,12)}: ${bar} ${pct}%\n`;
  });
  alert(`📊 学习统计\n\n🔥 连续学习: ${streak.count} 天\n✅ 完成: ${totalCompleted}/${totalTopics}\n⭐ 收藏: ${bookmarks.length}\n📅 上次: ${streak.lastDate||'暂无'}\n\n${sectionStats}`);
}

/* ========== Keyboard Shortcuts ========== */
document.addEventListener('keydown', e => {
  if (e.key === '/' && !isInputFocused()) { e.preventDefault(); document.getElementById('searchInput')?.focus(); }
  if (e.key === 'Escape') { const input = document.getElementById('searchInput'); if (input?.value) clearSearch(); else input?.blur(); }
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !isInputFocused()) {
    const tabs = Array.from(document.querySelectorAll('.nav-tab'));
    const activeIdx = tabs.findIndex(t => t.classList.contains('active'));
    if (activeIdx === -1) return;
    let nextIdx = e.key === 'ArrowRight' ? activeIdx + 1 : activeIdx - 1;
    if (nextIdx < 0) nextIdx = tabs.length - 1;
    if (nextIdx >= tabs.length) nextIdx = 0;
    tabs[nextIdx].click();
  }
  if (e.key === 'e' && !isInputFocused()) {
    const btn = document.querySelector('.section.active .expand-all-btn');
    if (btn) btn.click();
  }
});
function isInputFocused() { const el = document.activeElement; return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable); }

/* ========== Init & Events ========== */
document.addEventListener('DOMContentLoaded', initApp);
window.addEventListener('scroll', () => {
  const btn = document.getElementById('backToTop');
  if (btn) btn.classList.toggle('visible', window.scrollY > 400);
  const bar = document.getElementById('progressBar');
  if (bar) { const scrollH = document.documentElement.scrollHeight - window.innerHeight; bar.style.width = (scrollH > 0 ? (window.scrollY / scrollH) * 100 : 0) + '%'; }
  const nav = document.getElementById('navSticky');
  if (nav) nav.classList.toggle('scrolled', window.scrollY > 200);
});
