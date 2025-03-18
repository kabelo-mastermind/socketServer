const { Server } = require("socket.io");

let io;

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://168.172.185.178:8081',
        'http://10.100.99.10:8081',
        'http://localhost:8081',
        'https://10.100.99.6:8081'
      ],
      methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`🚀 New client connected: ${socket.id}`);

    // Driver joins a room based on user ID
    socket.on("joinRoom", (userId) => {
      if (!userId) return;
      const roomName = `customer_${userId}`;
      socket.join(roomName);
      console.log(`✅ User with ID ${userId} joined room: ${roomName}`);
    });

    // Notify drivers when a new trip request is created
    socket.on("newTripRequest", (tripData) => {
      console.log("📢 New trip request received:", tripData);
      io.emit("newTripNotification", tripData); // Broadcast to all drivers
    });

    // When a trip is accepted
    socket.on("acceptTrip", (tripId) => {
      console.log(`✅ Trip ${tripId} has been accepted`);
      io.emit("tripAccepted", { tripId });
    });

    // When a trip is canceled
    socket.on("tripCancelled", (tripId) => {
      console.log(`❌ Trip ${tripId} has been canceled`);
      io.emit("tripCancelled", { tripId });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`⚡ Client disconnected: ${socket.id}`);
    });

    // Handle socket errors
    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });
  });

  return io;
};

module.exports = { initializeSocket };
