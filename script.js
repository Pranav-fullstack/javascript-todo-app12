'use strict';

/* ==========================================================
   Task 3 – JavaScript To-Do List
   State lives in one object; every change goes through a
   small function that updates state, saves it and re-renders.
   ========================================================== */

const STORAGE_KEY = 'task3.todos';
const FILTER_KEY = 'task3.filter';
const FILTERS = ['all', 'active', 'completed'];
const SVG_NS = 'http://www.w3.org/2000/svg';

const state = {
  todos: [],        // { id, text, completed, createdAt }
  filter: 'all',
  editingId: null,
};

/* ---------- DOM references ---------- */
const $ = (id) => document.getElementById(id);
const form = $('add-form');
const input = $('new-task');
const formError = $('form-error');
const list = $('task-list');
const filtersNav = $('filters');
const countEl = $('count');
const emptyEl = $('empty');
const clearBtn = $('clear-completed');
const toggleAllBtn = $('toggle-all');

/* ---------- Persistence (localStorage) ---------- */
function isValidTodo(t) {
  return t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.completed === 'boolean';
}

function load() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    state.todos = Array.isArray(parsed) ? parsed.filter(isValidTodo) : [];
    const savedFilter = localStorage.getItem(FILTER_KEY);
    state.filter = FILTERS.includes(savedFilter) ? savedFilter : 'all';
  } catch (err) {
    // Corrupt JSON or storage blocked: start clean instead of crashing.
    state.todos = [];
    state.filter = 'all';
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
    localStorage.setItem(FILTER_KEY, state.filter);
  } catch (err) {
    showError('Could not save your tasks. Browser storage may be full or disabled.');
  }
}

/* ---------- CRUD ---------- */
function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function addTodo(text) {
  state.todos.unshift({ id: createId(), text, completed: false, createdAt: Date.now() });
  commit();
}

function toggleTodo(id) {
  const todo = state.todos.find((t) => t.id === id);
  if (todo) todo.completed = !todo.completed;
  commit();
}

function updateTodo(id, text) {
  const todo = state.todos.find((t) => t.id === id);
  if (todo) todo.text = text;
  state.editingId = null;
  commit();
}

function deleteTodo(id) {
  state.todos = state.todos.filter((t) => t.id !== id);
  if (state.editingId === id) state.editingId = null;
  commit();
}

function clearCompleted() {
  state.todos = state.todos.filter((t) => !t.completed);
  commit();
}

function toggleAll() {
  const allDone = state.todos.length > 0 && state.todos.every((t) => t.completed);
  state.todos.forEach((t) => { t.completed = !allDone; });
  commit();
}

function setFilter(filter) {
  if (!FILTERS.includes(filter)) return;
  state.filter = filter;
  commit();
}

function commit() {
  save();
  render();
}

/* ---------- Derived data ---------- */
function visibleTodos() {
  switch (state.filter) {
    case 'active': return state.todos.filter((t) => !t.completed);
    case 'completed': return state.todos.filter((t) => t.completed);
    default: return state.todos;
  }
}

/* ---------- Rendering (dynamic DOM) ---------- */
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (key === 'className') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key in node) node[key] = value;
    else node.setAttribute(key, value);
  });
  node.append(...children);
  return node;
}

function createCheckbox(todo) {
  const checkbox = el('input', {
    type: 'checkbox',
    checked: todo.completed,
    'aria-label': `Mark “${todo.text}” as ${todo.completed ? 'not done' : 'done'}`,
    dataset: { action: 'toggle' },
  });
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M6 12.5l4 4 8-9');
  svg.append(path);
  return el('span', { className: 'check' }, checkbox, el('span', { className: 'box' }), svg);
}

function createTodoItem(todo) {
  const li = el('li', {
    className: 'task' + (todo.completed ? ' done' : ''),
    dataset: { id: todo.id },
  });

  if (state.editingId === todo.id) {
    li.append(
      createCheckbox(todo),
      el('input', {
        type: 'text',
        className: 'edit-input',
        value: todo.text,
        maxLength: 120,
        'aria-label': 'Edit task',
        dataset: { role: 'edit-input' },
      })
    );
    return li;
  }

  li.append(
    createCheckbox(todo),
    el('span', { className: 'task-text', textContent: todo.text, title: 'Double-click to edit', dataset: { role: 'text' } }),
    el('div', { className: 'task-actions' },
      el('button', { type: 'button', className: 'icon-btn', textContent: 'Edit', dataset: { action: 'edit' }, 'aria-label': `Edit “${todo.text}”` }),
      el('button', { type: 'button', className: 'icon-btn danger', textContent: 'Delete', dataset: { action: 'delete' }, 'aria-label': `Delete “${todo.text}”` })
    )
  );
  return li;
}

function emptyMessage() {
  if (state.todos.length === 0) return 'No tasks yet. Add your first task above.';
  if (state.filter === 'active') return 'Nothing left to do. Nice work.';
  if (state.filter === 'completed') return 'No completed tasks yet.';
  return '';
}

function render() {
  const items = visibleTodos();
  const fragment = document.createDocumentFragment();
  items.forEach((todo) => fragment.append(createTodoItem(todo)));
  list.replaceChildren(fragment);

  // Empty state
  const message = items.length === 0 ? emptyMessage() : '';
  emptyEl.textContent = message;
  emptyEl.hidden = message === '';

  // Filter buttons
  filtersNav.querySelectorAll('.filter').forEach((btn) => {
    btn.setAttribute('aria-pressed', String(btn.dataset.filter === state.filter));
  });

  // Footer controls
  const activeCount = state.todos.filter((t) => !t.completed).length;
  const completedCount = state.todos.length - activeCount;
  countEl.textContent = `${activeCount} ${activeCount === 1 ? 'task' : 'tasks'} left`;
  clearBtn.disabled = completedCount === 0;
  toggleAllBtn.disabled = state.todos.length === 0;
  toggleAllBtn.textContent = state.todos.length > 0 && activeCount === 0 ? 'Mark all active' : 'Mark all done';

  // Focus the edit field when entering edit mode
  if (state.editingId) {
    const editField = list.querySelector('[data-role="edit-input"]');
    if (editField) {
      editField.focus();
      editField.setSelectionRange(editField.value.length, editField.value.length);
    }
  }
}

/* ---------- Helpers ---------- */
function showError(message) {
  formError.textContent = message;
  formError.hidden = !message;
}

function cleanText(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function idOf(target) {
  const item = target.closest('.task');
  return item ? item.dataset.id : null;
}

function startEditing(id) {
  state.editingId = id;
  render();
}

function finishEditing(editField, shouldSave) {
  const id = state.editingId;
  if (!id) return;
  const text = cleanText(editField.value);
  if (shouldSave && text) updateTodo(id, text);
  else if (shouldSave && !text) deleteTodo(id);   // saving an empty task removes it
  else { state.editingId = null; render(); }
}

/* ---------- Events ---------- */
// Add a task
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = cleanText(input.value);
  if (!text) {
    showError('Enter a task before adding it.');
    input.focus();
    return;
  }
  showError('');
  addTodo(text);
  input.value = '';
  input.focus();
});

input.addEventListener('input', () => showError(''));

// Delegated listeners: one handler on the <ul> serves every task, including ones created later.
list.addEventListener('click', (event) => {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;
  const id = idOf(actionEl);
  if (!id) return;

  switch (actionEl.dataset.action) {
    case 'delete': deleteTodo(id); break;
    case 'edit': startEditing(id); break;
  }
});

list.addEventListener('change', (event) => {
  if (event.target.dataset.action === 'toggle') toggleTodo(idOf(event.target));
});

list.addEventListener('dblclick', (event) => {
  if (event.target.dataset.role === 'text') startEditing(idOf(event.target));
});

list.addEventListener('keydown', (event) => {
  if (event.target.dataset.role !== 'edit-input') return;
  if (event.key === 'Enter') { event.preventDefault(); finishEditing(event.target, true); }
  if (event.key === 'Escape') { event.preventDefault(); finishEditing(event.target, false); }
});

// Clicking away from the edit field saves the change.
list.addEventListener('focusout', (event) => {
  if (event.target.dataset.role === 'edit-input' && state.editingId) {
    finishEditing(event.target, true);
  }
});

// Filters
filtersNav.addEventListener('click', (event) => {
  const btn = event.target.closest('[data-filter]');
  if (btn) setFilter(btn.dataset.filter);
});

clearBtn.addEventListener('click', clearCompleted);
toggleAllBtn.addEventListener('click', toggleAll);

// Keep several open tabs in sync.
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY || event.key === FILTER_KEY) {
    load();
    render();
  }
});

/* ---------- Init ---------- */
$('today').textContent = new Date().toLocaleDateString(undefined, {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
load();
render();
