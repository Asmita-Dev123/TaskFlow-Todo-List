(() => {
  'use strict';

  const STORAGE_KEY = 'taskflow.tasks.v1';
  const THEME_KEY = 'taskflow.theme';

  // ---------- Elements ----------
  const $ = (id) => document.getElementById(id);
  const els = {
    list: $('list'),
    input: $('taskInput'),
    addBtn: $('addBtn'),
    statTotal: $('statTotal'),
    statDone: $('statDone'),
    progressLabel: $('progressLabel'),
    progressPct: $('progressPct'),
    progressFill: $('progressFill'),
    footer: $('footer'),
    footerText: $('footerText'),
    clearDone: $('clearDoneBtn'),
    modal: $('editModal'),
    editInput: $('editInput'),
    saveEdit: $('saveEditBtn'),
    cancelEdit: $('cancelEditBtn'),
    themeBtn: $('themeBtn'),
  };
  const tagChips = document.querySelectorAll('.tag-chip');
  const priorityChips = document.querySelectorAll('.priority-chip');
  const filterBtns = document.querySelectorAll('.filter-btn');

  // ---------- State ----------
  let tasks = load();
  let filter = 'all';
  let selectedTag = null;
  let selectedPriority = 'medium';
  let editingId = null;

  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(data) ? data : [];
    } catch { return []; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
  }

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    return d + 'd ago';
  }

  // ---------- Actions ----------
  function addTask() {
    const text = els.input.value.trim();
    if (!text) {
      els.input.classList.remove('shake');
      void els.input.offsetWidth;
      els.input.classList.add('shake');
      els.input.focus();
      return;
    }
    tasks.unshift({
      id: uid(), text, done: false,
      tag: selectedTag, priority: selectedPriority, created: Date.now(),
    });
    els.input.value = '';
    save();
    render();
    els.input.focus();
  }

  function toggleTask(id) {
    const t = tasks.find((x) => x.id === id);
    if (t) { t.done = !t.done; save(); render(); }
  }

  function deleteTask(id, node) {
    const finish = () => { tasks = tasks.filter((x) => x.id !== id); save(); render(); };
    if (node) { node.classList.add('removing'); setTimeout(finish, 280); } else finish();
  }

  function openEdit(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    editingId = id;
    els.editInput.value = t.text;
    els.modal.classList.add('open');
    els.modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => { els.editInput.focus(); els.editInput.select(); }, 50);
  }
  function closeEdit() {
    editingId = null;
    els.modal.classList.remove('open');
    els.modal.setAttribute('aria-hidden', 'true');
  }
  function commitEdit() {
    const text = els.editInput.value.trim();
    if (!text) { els.editInput.focus(); return; }
    const t = tasks.find((x) => x.id === editingId);
    if (t) { t.text = text; save(); render(); }
    closeEdit();
  }

  // ---------- Render ----------
  const ICONS = {
    check: '<svg viewBox="0 0 24 24"><polyline points="4 12 10 18 20 6"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    del: '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
  };
  const PRIORITY_LABEL = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };

  function visibleTasks() {
    return tasks.filter((t) => {
      if (filter === 'all') return true;
      if (filter === 'active') return !t.done;
      if (filter === 'done') return t.done;
      return t.tag === filter;
    });
  }

  const EMPTY = {
    all: ['✨', 'Nothing here yet', 'Add your first task above to get going.'],
    active: ['🎉', 'All caught up', 'No active tasks. Enjoy the calm.'],
    done: ['🌱', 'Nothing completed', 'Finish a task and it will show up here.'],
    other: ['🔍', 'No tasks in this tag', 'Add a task with this tag to see it here.'],
  };

  function render() {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    els.statTotal.textContent = total;
    els.statDone.textContent = done;
    els.progressPct.textContent = pct + '%';
    els.progressFill.style.width = pct + '%';
    els.progressLabel.textContent = !total
      ? 'No tasks yet'
      : done === total ? 'All done — great work! 🎉' : `${done} of ${total} completed`;

    const items = visibleTasks();
    if (!items.length) {
      const key = ['all', 'active', 'done'].includes(filter) ? filter : 'other';
      const [icon, title, sub] = EMPTY[key];
      els.list.innerHTML = `<div class="empty"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-sub">${sub}</div></div>`;
    } else {
      els.list.innerHTML = items.map((t, i) => `
        <div class="task p-${t.priority}${t.done ? ' done' : ''}" data-id="${t.id}" style="animation-delay:${Math.min(i, 8) * 30}ms">
          <button class="check" data-act="toggle" aria-label="Toggle complete">${ICONS.check}</button>
          <div class="task-body">
            <div class="task-text">${esc(t.text)}</div>
            <div class="task-meta">
              ${t.tag ? `<span class="badge ${t.tag}">${t.tag[0].toUpperCase() + t.tag.slice(1)}</span>` : ''}
              <span>${PRIORITY_LABEL[t.priority] || ''}</span>
              <span>·</span>
              <span>${timeAgo(t.created)}</span>
            </div>
          </div>
          <div class="task-actions">
            <button class="icon-btn" data-act="edit" aria-label="Edit task">${ICONS.edit}</button>
            <button class="icon-btn del" data-act="delete" aria-label="Delete task">${ICONS.del}</button>
          </div>
        </div>`).join('');
    }

    els.footer.style.display = total ? 'flex' : 'none';
    const left = total - done;
    els.footerText.textContent = `${left} task${left === 1 ? '' : 's'} left`;
    els.clearDone.style.display = done ? '' : 'none';
  }

  // ---------- Events ----------
  els.addBtn.addEventListener('click', addTask);
  els.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addTask(); });

  els.list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    const node = e.target.closest('.task');
    if (!btn || !node) return;
    const id = node.dataset.id;
    if (btn.dataset.act === 'toggle') toggleTask(id);
    else if (btn.dataset.act === 'edit') openEdit(id);
    else if (btn.dataset.act === 'delete') deleteTask(id, node);
  });
  els.list.addEventListener('dblclick', (e) => {
    const text = e.target.closest('.task-text');
    if (text) openEdit(text.closest('.task').dataset.id);
  });

  tagChips.forEach((chip) => chip.addEventListener('click', () => {
    const tag = chip.dataset.tag;
    selectedTag = selectedTag === tag ? null : tag;
    tagChips.forEach((c) => c.classList.toggle('selected', c.dataset.tag === selectedTag));
  }));

  priorityChips.forEach((chip) => chip.addEventListener('click', () => {
    selectedPriority = chip.dataset.priority;
    priorityChips.forEach((c) => c.classList.toggle('selected', c.dataset.priority === selectedPriority));
  }));

  filterBtns.forEach((btn) => btn.addEventListener('click', () => {
    filter = btn.dataset.filter;
    filterBtns.forEach((b) => b.classList.toggle('active', b === btn));
    render();
  }));

  els.clearDone.addEventListener('click', () => {
    tasks = tasks.filter((t) => !t.done);
    save();
    render();
  });

  // Modal
  els.saveEdit.addEventListener('click', commitEdit);
  els.cancelEdit.addEventListener('click', closeEdit);
  els.editInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitEdit(); });
  els.modal.addEventListener('click', (e) => { if (e.target === els.modal) closeEdit(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && editingId) closeEdit(); });

  // Theme
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#0e0d1a' : '#6d5dfc';
  }
  let theme = 'light';
  try {
    theme = localStorage.getItem(THEME_KEY) ||
      (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  } catch {}
  applyTheme(theme);
  els.themeBtn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  });

  // Init: default priority chip selected, refresh relative times
  priorityChips.forEach((c) => c.classList.toggle('selected', c.dataset.priority === selectedPriority));
  render();
  setInterval(render, 60000);
})();
