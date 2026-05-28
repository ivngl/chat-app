import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Define TypeScript interfaces for our real-time events
interface MessagePayload {
    username: string;
    content: string;
}

interface MessageRow extends MessagePayload {
    id: number;
    created_at: string;
}

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const db = new sqlite3.Database('./messenger.db', (err: Error | null) => {
    if (err) {
        console.error("Error opening database:", err.message);
    } else {
        console.log("Connected to the SQLite database.");
    }
});

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

// Explicitly type the Express route handlers
app.get('/api/messages', (req: Request, res: Response) => {
    db.all('SELECT * FROM messages ORDER BY created_at ASC', [], (err: Error | null, rows: MessageRow[]) => {
        if (err) {
            console.error(err.message);
            return res.status(500).send("Server Error");
        }
        res.json(rows);
    });
});

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Type checking for incoming message event payloads
    socket.on('send_message', (data: MessagePayload) => {
        const { username, content } = data;
        const sql = 'INSERT INTO messages (username, content) VALUES (?, ?)';

        db.run(sql, [username, content], function (this: sqlite3.RunResult, err: Error | null) {
            if (err) {
                return console.error("Database save failed:", err.message);
            }

            db.get('SELECT * FROM messages WHERE id = ?', [this.lastID], (err: Error | null, row: MessageRow) => {
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