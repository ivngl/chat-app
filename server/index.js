const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Initialize SQLite Database (creates 'messenger.db' file if it doesn't exist)
const db = new sqlite3.Database('./messenger.db', (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

// Create the messages table automatically on startup
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
});

// HTTP Endpoint: Fetch chat history
app.get('/api/messages', (req, res) => {
    db.all('SELECT * FROM messages ORDER BY created_at ASC', [], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Server Error");
        }
        res.json(rows);
    });
});

// Socket.io Real-time Communication
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Listen for incoming messages
    socket.on('send_message', (data) => {
        const { username, content } = data;

        const sql = 'INSERT INTO messages (username, content) VALUES (?, ?)';
        db.run(sql, [username, content], function (err) {
            if (err) {
                return console.error("Database save failed:", err.message);
            }

            // 'this.lastID' contains the ID of the newly inserted row.
            // Fetch the completed row (including the default timestamp) to broadcast.
            db.get('SELECT * FROM messages WHERE id = ?', [this.lastID], (err, row) => {
                if (!err && row) {
                    io.emit('receive_message', row);
                }
            });
        });
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));