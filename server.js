require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Set static folder 🖼️
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine ⚙️
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes 🛣️
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/room/:roomId', (req, res) => {
    res.render('room', { roomId: req.params.roomId });
});

// Store room states 🏘️
const rooms = {};

// Socket.io setup 📡
io.on('connection', (socket) => {
    console.log('New user connected');
    
    // Generate random username 🤖
    const username = `User-${Math.floor(Math.random() * 10000)}`;
    socket.username = username;
    
    socket.on('joinRoom', (roomId) => {
        // Initialize room if needed 🤔
        if (!rooms[roomId]) {
            rooms[roomId] = {
                drawingHistory: [],
                users: []
            };
        }
        
        socket.join(roomId);
        socket.room = roomId;
        
        // Add user to room ➕
        rooms[roomId].users.push(username);
        
        // Send drawing history to user 📜
        socket.emit('drawingHistory', rooms[roomId].drawingHistory);
        
        // Notify room about joining 📣
        io.to(roomId).emit('userJoined', {
            username,
            users: rooms[roomId].users
        });
    });
    
    socket.on('draw', (data) => {
        if (!socket.room) return;
        
        // Add to drawing history ✍️
        if (data.tool !== 'eraser') {
            rooms[socket.room].drawingHistory.push(data);
        }
        
        // Broadcast draw event 📢
        socket.to(socket.room).emit('draw', data);
    });
    
    socket.on('clearCanvas', (roomId) => {
        if (!rooms[roomId]) return;
        
        // Clear room's history 🗑️
        rooms[roomId].drawingHistory = [];
        
        // Broadcast canvas cleared 📢
        io.to(roomId).emit('canvasCleared');
        
        // Send empty drawing history 📦
        io.to(roomId).emit('drawingHistory', []);
    });
    
    socket.on('requestDrawingHistory', (roomId) => {
        if (rooms[roomId]) {
            socket.emit('drawingHistory', rooms[roomId].drawingHistory);
        }
    });
    
    socket.on('disconnect', () => {
        if (socket.room) {
            const roomId = socket.room;
            if (rooms[roomId]) {
                // Remove user from room 🚪
                const index = rooms[roomId].users.indexOf(socket.username);
                if (index !== -1) {
                    rooms[roomId].users.splice(index, 1);
                }
                
                // Clean empty rooms later ⏰
                if (rooms[roomId].users.length === 0) {
                    setTimeout(() => {
                        if (rooms[roomId] && rooms[roomId].users.length === 0) {
                            delete rooms[roomId];
                        }
                    }, 30000);
                }
                
                // Notify user left event 📢
                io.to(roomId).emit('userLeft', {
                    username: socket.username,
                    users: rooms[roomId].users
                });
            }
        }
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});