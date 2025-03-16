const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
  const io = new Server(server, {
    // Update to explicit allowed origins
    origin: [
      'http://168.172.185.178:8081',
      'http://10.100.9.10:8081',
      'http://localhost:8081',
      'https://your-app-name.onrender.com'
    ],
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
    // Add these for better compatibility
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]

  });

  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on("joinRoom", (userId) => {
      const roomName = `customer_${userId}`;
      socket.join(roomName);
      console.log(`User with ID ${userId} joined room: ${roomName}`);
    });

    socket.on("acceptTrip", (tripId) => {
      io.emit("tripAccepted", { tripId });
    });

    socket.on("tripCancelled", (tripId) => {
      io.emit("tripCancelled", { tripId });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });

    socket.on("error", (error) => {
      console.error("Socket connection error:", error);
    });
  });

  return io;
};

module.exports = { initializeSocket };
