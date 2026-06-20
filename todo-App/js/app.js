const state = {
  tasks: [],
  activeModal: null,
  editingTaskId: null,
  deletingTaskId: null,
};

// ==============================
// Rendering
// ==============================

function renderTasks(tasks) {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');

  list.innerHTML = '';

  if (tasks.length === 0) {
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  const uncompleted = tasks.filter(t => !t.completed);
  const completed = tasks.filter(t => t.completed);

  uncompleted.forEach(task => list.appendChild(createTaskElement(task)));

  if (uncompleted.length > 0 && completed.length > 0) {
    const sep = document.createElement('li');
    sep.className = 'task-separator';
    sep.setAttribute('role', 'separator');
    list.appendChild(sep);
  }

  completed.forEach(task => list.appendChild(createTaskElement(task)));
}

function createTaskElement(task) {
  const li = document.createElement('li');
  li.className = `task-item${task.completed ? ' task-item--completed' : ''}`;
  li.dataset.id = task.id;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.completed;
  checkbox.setAttribute('aria-label', `「${task.title}」の完了状態を切り替える`);
  checkbox.addEventListener('change', handleToggleCompletion);

  const titleSpan = document.createElement('span');
  titleSpan.className = 'task-title';
  titleSpan.textContent = task.title;
  titleSpan.title = task.title;

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon btn-edit';
  editBtn.textContent = '編集';
  editBtn.setAttribute('aria-label', `「${task.title}」を編集`);
  editBtn.addEventListener('click', () => openEditModal(task.id, task.title));

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-icon btn-delete';
  deleteBtn.textContent = '削除';
  deleteBtn.setAttribute('aria-label', `「${task.title}」を削除`);
  deleteBtn.addEventListener('click', () => openConfirmDialog(task.id));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  li.appendChild(checkbox);
  li.appendChild(titleSpan);
  li.appendChild(actions);

  return li;
}

// ==============================
// Modal control
// ==============================

function openCreateModal() {
  state.activeModal = 'create';
  const input = document.getElementById('create-title-input');
  const error = document.getElementById('create-error');
  input.value = '';
  error.hidden = true;
  error.textContent = '';
  document.getElementById('create-modal').hidden = false;
  setTimeout(() => input.focus(), 50);
}

function openEditModal(taskId, currentTitle) {
  state.activeModal = 'edit';
  state.editingTaskId = taskId;
  const input = document.getElementById('edit-title-input');
  const error = document.getElementById('edit-error');
  input.value = currentTitle;
  error.hidden = true;
  error.textContent = '';
  document.getElementById('edit-modal').hidden = false;
  setTimeout(() => input.focus(), 50);
}

function openConfirmDialog(taskId) {
  state.activeModal = 'confirm-delete';
  state.deletingTaskId = taskId;
  document.getElementById('confirm-dialog').hidden = false;
  setTimeout(() => document.getElementById('btn-confirm-delete').focus(), 50);
}

function closeModal() {
  const modalMap = {
    'create': 'create-modal',
    'edit': 'edit-modal',
    'confirm-delete': 'confirm-dialog',
  };
  const modalId = modalMap[state.activeModal];
  if (modalId) document.getElementById(modalId).hidden = true;

  state.activeModal = null;
  state.editingTaskId = null;
  state.deletingTaskId = null;
}

// ==============================
// Event handlers
// ==============================

async function handleToggleCompletion(e) {
  const checkbox = e.target;
  const id = Number(checkbox.closest('.task-item').dataset.id);

  // 連打防止ガード: DB処理中はチェックボックスをdisabledにする
  checkbox.disabled = true;

  try {
    await DB.toggleTaskCompletion(id);
    state.tasks = await DB.getAllTasks();
    renderTasks(state.tasks);
    // renderTasks() がリストを再描画するため、新しいチェックボックスはデフォルトでenabledになる
  } catch (err) {
    console.error('完了状態の切り替えに失敗:', err);
    checkbox.disabled = false;
  }
}

async function handleCreateTask() {
  const input = document.getElementById('create-title-input');
  const error = document.getElementById('create-error');
  const title = input.value;

  if (!title.trim()) {
    error.textContent = 'タイトルを入力してください';
    error.hidden = false;
    input.focus();
    return;
  }

  try {
    await DB.createTask(title);
    state.tasks = await DB.getAllTasks();
    renderTasks(state.tasks);
    closeModal();
  } catch (err) {
    error.textContent = err.message || 'タスクの作成に失敗しました';
    error.hidden = false;
  }
}

async function handleSaveEdit() {
  const input = document.getElementById('edit-title-input');
  const error = document.getElementById('edit-error');
  const title = input.value;

  if (!title.trim()) {
    error.textContent = 'タイトルを入力してください';
    error.hidden = false;
    input.focus();
    return;
  }

  try {
    await DB.updateTaskTitle(state.editingTaskId, title);
    state.tasks = await DB.getAllTasks();
    renderTasks(state.tasks);
    closeModal();
  } catch (err) {
    error.textContent = err.message || 'タスクの更新に失敗しました';
    error.hidden = false;
  }
}

async function handleConfirmDelete() {
  const id = state.deletingTaskId;
  try {
    await DB.deleteTask(id);
    state.tasks = await DB.getAllTasks();
    renderTasks(state.tasks);
    closeModal();
  } catch (err) {
    console.error('タスクの削除に失敗:', err);
    closeModal();
  }
}

// ==============================
// Global keyboard (FR-011)
// ==============================

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.activeModal) {
    closeModal();
  }
});

// ==============================
// Init
// ==============================

document.addEventListener('DOMContentLoaded', async () => {
  const loading = document.getElementById('loading');
  const initError = document.getElementById('init-error');
  const app = document.getElementById('app');

  document.getElementById('btn-create').addEventListener('click', openCreateModal);
  document.getElementById('btn-submit-create').addEventListener('click', handleCreateTask);
  document.getElementById('btn-cancel-create').addEventListener('click', closeModal);
  document.getElementById('create-title-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleCreateTask();
  });

  document.getElementById('btn-save-edit').addEventListener('click', handleSaveEdit);
  document.getElementById('btn-cancel-edit').addEventListener('click', closeModal);
  document.getElementById('edit-title-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSaveEdit();
  });

  document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);
  document.getElementById('btn-cancel-delete').addEventListener('click', closeModal);

  try {
    await DB.init();
    state.tasks = await DB.getAllTasks();
    renderTasks(state.tasks);
    loading.hidden = true;
    app.hidden = false;
  } catch (err) {
    console.error('初期化失敗:', err);
    loading.hidden = true;
    initError.hidden = false;
  }
});
