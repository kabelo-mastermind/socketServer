// /src/server.js
const express = require('express');
const http = require('http');
const { initializeSocket } = require('./socket');
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Manually set the CSP header
app.use((req, res, next) => {
  // Update CSP header to include WebSocket connections
  res.setHeader(
    "Content-Security-Policy",
    "connect-src 'self' wss://socketserver-k62n.onrender.com"
  );
  next();
});

// Other routes or middleware can be added here
app.get('/', (req, res) => {
  res.send('WebSocket server is running!');
});

// Use process.env.PORT for Render compatibility
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 WebSocket server running on port ${PORT}`);
});
