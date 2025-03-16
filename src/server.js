// /src/server.js
const express = require('express');
const http = require('http');
const { initializeSocket } = require('./socket');
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Other routes or middleware can be added here
app.get('/', (req, res) => {
  res.send('WebSocket server is running!');
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
