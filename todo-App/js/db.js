const DB = (() => {
  let db = null;

  function saveToIndexedDB() {
    return new Promise((resolve, reject) => {
      const data = db.export();
      const request = indexedDB.open('TodoDB', 1);
      request.onupgradeneeded = e => {
        e.target.result.createObjectStore('database');
      };
      request.onsuccess = e => {
        const idb = e.target.result;
        const tx = idb.transaction('database', 'readwrite');
        tx.objectStore('database').put(data, 'sqlite-db');
        tx.oncomplete = () => { idb.close(); resolve(); };
        tx.onerror = () => { idb.close(); reject(tx.error); };
      };
      request.onerror = () => reject(request.error);
    });
  }

  function loadFromIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TodoDB', 1);
      request.onupgradeneeded = e => {
        e.target.result.createObjectStore('database');
      };
      request.onsuccess = e => {
        const idb = e.target.result;
        const tx = idb.transaction('database', 'readonly');
        const getReq = tx.objectStore('database').get('sqlite-db');
        getReq.onsuccess = () => { idb.close(); resolve(getReq.result || null); };
        getReq.onerror = () => { idb.close(); reject(getReq.error); };
      };
      request.onerror = () => reject(request.error);
    });
  }

  function rowToTask(row) {
    return {
      id: row[0],
      title: row[1],
      completed: row[2] === 1,
      created_at: row[3],
    };
  }

  async function init() {
    const SQL = await initSqlJs({
      locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`,
    });

    let savedData = null;
    try {
      savedData = await loadFromIndexedDB();
    } catch (err) {
      console.error('IndexedDB読み込み失敗:', err);
    }

    db = savedData ? new SQL.Database(savedData) : new SQL.Database();

    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT    NOT NULL,
        completed  INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `);
  }

  async function createTask(title) {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('タイトルを入力してください');

    const now = Date.now();
    db.run('INSERT INTO tasks (title, completed, created_at) VALUES (?, 0, ?)', [trimmed, now]);

    const result = db.exec('SELECT last_insert_rowid()');
    const id = result[0].values[0][0];

    try { await saveToIndexedDB(); } catch (err) { console.error('IndexedDB保存失敗:', err); }

    return { id, title: trimmed, completed: false, created_at: now };
  }

  async function getAllTasks() {
    const result = db.exec(
      'SELECT id, title, completed, created_at FROM tasks ORDER BY completed ASC, created_at DESC'
    );
    if (!result.length) return [];
    return result[0].values.map(rowToTask);
  }

  async function updateTaskTitle(id, title) {
    const trimmed = title.trim();
    if (!trimmed) throw new Error('タイトルを入力してください');

    db.run('UPDATE tasks SET title = ? WHERE id = ?', [trimmed, id]);

    try { await saveToIndexedDB(); } catch (err) { console.error('IndexedDB保存失敗:', err); }
  }

  async function toggleTaskCompletion(id) {
    const result = db.exec('SELECT completed FROM tasks WHERE id = ?', [id]);
    if (!result.length || !result[0].values.length) return;

    const current = result[0].values[0][0];
    db.run('UPDATE tasks SET completed = ? WHERE id = ?', [current === 0 ? 1 : 0, id]);

    try { await saveToIndexedDB(); } catch (err) { console.error('IndexedDB保存失敗:', err); }
  }

  async function deleteTask(id) {
    db.run('DELETE FROM tasks WHERE id = ?', [id]);

    try { await saveToIndexedDB(); } catch (err) { console.error('IndexedDB保存失敗:', err); }
  }

  return { init, createTask, getAllTasks, updateTaskTitle, toggleTaskCompletion, deleteTask };
})();
