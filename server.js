const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Подключение к базе данных
const db = new sqlite3.Database(path.join(__dirname, 'db.sqlite'), (err) => {
  if (err) console.error('❌ Ошибка базы:', err);
  else console.log('✅ База данных подключена');
});

// Создание таблицы при первом запуске
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    username TEXT,
    inviter_id TEXT,
    balance INTEGER DEFAULT 0,
    registered_at TEXT
  )
`);

// Роут для регистрации
app.post('/register', (req, res) => {
  const { user_id, username, inviter_id } = req.body;

  if (!user_id) return res.status(400).json({ error: 'user_id обязателен' });

  db.get(`SELECT * FROM users WHERE user_id = ?`, [user_id], (err, row) => {
    if (row) {
      return res.json({ message: 'Пользователь уже зарегистрирован', user: row });
    }

    const registered_at = new Date().toISOString();

    db.run(`
      INSERT INTO users (user_id, username, inviter_id, balance, registered_at)
      VALUES (?, ?, ?, ?, ?)
    `, [user_id, username || '', inviter_id || '', 0, registered_at], function (err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Ошибка при добавлении' });
      }

      res.json({
        message: 'Пользователь зарегистрирован',
        user: {
          user_id,
          username,
          inviter_id,
          balance: 0,
          registered_at
        }
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
