const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Default Vite development port
        methods: ["GET", "POST"]
    }
});

// PostgreSQL Connection Pool
const pool = new Pool({
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    port: process.env.PG_PORT,
});

// HTTP Endpoint: Fetch chat history
app.get('/api/messages', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM messages ORDER BY created_at ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

// Socket.io Real-time Communication
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Listen for incoming messages from clients
    socket.on('send_message', async (data) => {
        const { username, content } = data;
        try {
            // Persist the message to PostgreSQL
            const result = await pool.query(
                'INSERT INTO messages (username, content) VALUES ($1, $2) RETURNING *',
                [username, content]
            );

            // Broadcast the saved message to all connected clients
            io.emit('receive_message', result.rows[0]);
        } catch (err) {
            console.error("Database save failed:", err.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));