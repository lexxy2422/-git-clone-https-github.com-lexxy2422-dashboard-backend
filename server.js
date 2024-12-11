const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Initialization
const db = new sqlite3.Database('./dashboard.db', (err) => {
    if (err) console.error('Error connecting to SQLite database:', err.message);
    else console.log('Connected to SQLite database.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS dashboard (
        id INTEGER PRIMARY KEY,
        revenue INTEGER NOT NULL,
        sales INTEGER NOT NULL
    )`);
    db.run(`INSERT OR IGNORE INTO dashboard (id, revenue, sales) VALUES (1, 50000, 4500)`);
});

// Mock User Data
const users = [
    { id: 1, username: 'admin', password: bcrypt.hashSync('password', 10) }
];

// Routes
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find((u) => u.username === username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
});

app.get('/dashboard', authenticateToken, (req, res) => {
    db.get('SELECT * FROM dashboard WHERE id = 1', (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

app.put('/dashboard', authenticateToken, (req, res) => {
    const { revenue, sales } = req.body;
    db.run('UPDATE dashboard SET revenue = ?, sales = ? WHERE id = 1', [revenue, sales], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ revenue, sales });
    });
});

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Forbidden' });
        req.user = user;
        next();
    });
}

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});