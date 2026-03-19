const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { exec } = require('child_process');
const { scan } = require('./src/scanner');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('start_scan', async () => {
    socket.emit('scan_started');
    try {
      await scan((device) => {
        socket.emit('device_found', device);
      });
    } catch (err) {
      console.error('Scan error:', err);
    }
    socket.emit('scan_complete');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3333;
server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`TV Remote running at ${url}`);
  // Auto-open browser
  exec(`start ${url}`);
});
