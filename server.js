require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/room/:roomId', (req, res) => {
    res.render('room', { roomId: req.params.roomId });
});

// Socket.io
io.on('connection', (socket) => {
    console.log('New user connected');
    
    // Generate random username
    const username = `Doodler-${Math.floor(Math.random() * 10000)}`;
    socket.username = username;
    
    socket.on('joinRoom', (roomId) => {
        socket.join(roomId);
        socket.room = roomId;
        
        // Notify room that a user has joined
        io.to(roomId).emit('userJoined', { 
            username,
            users: getUsersInRoom(roomId)
        });
    });
    
    socket.on('draw', (data) => {
        // Broadcast drawing data to all other clients in the same room
        socket.to(data.roomId).emit('draw', data);
    });
    
    socket.on('clearCanvas', (roomId) => {
        // Broadcast clear canvas command to the room
        socket.to(roomId).emit('clearCanvas');
    });
    
    socket.on('disconnect', () => {
        if (socket.room) {
            io.to(socket.room).emit('userLeft', { 
                username: socket.username,
                users: getUsersInRoom(socket.room)
            });
        }
        console.log('User disconnected');
    });
    
    // Helper function to get users in a room
    function getUsersInRoom(roomId) {
        const users = [];
        if (io.sockets.adapter.rooms.get(roomId)) {
            io.sockets.adapter.rooms.get(roomId).forEach(socketId => {
                users.push(io.sockets.sockets.get(socketId).username);
            });
        }
        return users;
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});