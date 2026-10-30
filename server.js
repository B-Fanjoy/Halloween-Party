const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3000);
const dbDir = path.join(__dirname, 'data');
const dbPath = path.join(dbDir, 'game.db');
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'halloween';

fs.mkdirSync(dbDir, { recursive: true });

const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error('Could not open database:', error.message);
    process.exit(1);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'waiting',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `, (createError) => {
    if (createError) {
      console.error('Could not create players table:', createError.message);
      process.exit(1);
    }

    console.log('Database ready at', dbPath);
  });
});

function normaliseName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function getStatusLabel(status) {
  if (status === 'safe') return 'Safe';
  if (status === 'danger') return 'Not Safe';
  return 'Waiting';
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/players', (req, res) => {
  db.all(
    'SELECT name, status FROM players ORDER BY name COLLATE NOCASE ASC',
    (error, rows) => {
      if (error) {
        console.error('Load players failed:', error.message);
        return res.status(500).json({ error: 'Could not load players.' });
      }

      const players = rows.reduce((acc, row) => {
        acc[row.name] = row.status;
        return acc;
      }, {});

      res.json({ players });
    }
  );
});

app.post('/api/players', (req, res) => {
  const name = normaliseName(req.body.name);

  if (!name) {
    return res.status(400).json({ error: 'Player name is required.' });
  }

  db.get('SELECT name, status FROM players WHERE name = ?', [name], (lookupError, row) => {
    if (lookupError) {
      console.error('Player lookup failed:', lookupError.message);
      return res.status(500).json({ error: 'Could not check player.' });
    }

    if (row) {
      return res.json({ player: { name: row.name, status: row.status } });
    }

    db.run(
      'INSERT INTO players (name, status, updated_at) VALUES (?, ?, datetime("now"))',
      [name, 'waiting'],
      function (insertError) {
        if (insertError) {
          console.error('Create player failed:', insertError.message);
          return res.status(500).json({ error: 'Could not create player.' });
        }

        res.json({ player: { name, status: 'waiting' } });
      }
    );
  });
});

app.put('/api/players/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const requestedStatus = String(req.body.status || '').trim();

  if (!['safe', 'danger', 'waiting'].includes(requestedStatus)) {
    return res.status(400).json({ error: 'Invalid player status.' });
  }

  db.run(
    'UPDATE players SET status = ?, updated_at = datetime("now") WHERE name = ?',
    [requestedStatus, name],
    function (updateError) {
      if (updateError) {
        console.error('Update player failed:', updateError.message);
        return res.status(500).json({ error: 'Could not update player status.' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Player not found.' });
      }

      res.json({ ok: true, name, status: requestedStatus });
    }
  );
});

app.delete('/api/players/:name', (req, res) => {
  const name = normaliseName(decodeURIComponent(req.params.name));

  if (!name) {
    return res.status(400).json({ error: 'Player name is required.' });
  }

  db.run('DELETE FROM players WHERE name = ?', [name], function (deleteError) {
    if (deleteError) {
      console.error('Delete player failed:', deleteError.message);
      return res.status(500).json({ error: 'Could not remove player.' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Player not found.' });
    }

    res.json({ ok: true, name });
  });
});

app.post('/api/admin/login', (req, res) => {
  const username = String(req.body.username || '').trim();
  const password = String(req.body.password || '');

  if (username === adminUsername && password === adminPassword) {
    return res.json({ ok: true });
  }

  return res.status(401).json({ ok: false, error: 'Incorrect username or password.' });
});

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/playerPage.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'playerPage.html'));
});

app.get('/adminPage.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'adminPage.html'));
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found.' });
  }

  res.status(404).send('Page not found');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Halloween Party server running at http://localhost:${port}`);
  console.log(`Also available on your local network at http://<your-ip>:${port}`);
});
