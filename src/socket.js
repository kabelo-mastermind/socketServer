const { Server } = require("socket.io");

let io;
const connectedUsers = {}; // Store connected users

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
    console.log(`🚀 New client connected: ${socket.id}`); // Updated log

    // Driver or customer joins a specific room
    socket.on("joinRoom", (userId, userType) => {
      if (!userId || !userType) return;

      // Join the appropriate room based on the user type
      const roomName = userType === "driver" ? "drivers" : `customer_${userId}`;
      socket.join(roomName);
      connectedUsers[socket.id] = { userId, userType };

      console.log(`✅ ${userType} with ID ${userId} joined room: ${roomName}`);
    });

    // Notify only drivers when a new trip request is created
    socket.on("newTripRequest", (tripData) => {
      console.log("📢 New trip request received:", tripData);

      // Emit notification to the "drivers" room
      io.to("drivers").emit("newTripNotification", tripData);

      // Log notification sent to drivers
      console.log("📢 Notification sent to driver via Socket.io:", tripData);
    });

    // When a trip is accepted, notify the customer
    socket.on("acceptTrip", ({ tripId, customerId }) => {
      try {
        console.log(`✅ Trip ${tripId} accepted for customer ${customerId}`);
        io.to(`customer_${customerId}`).emit("tripAccepted", { tripId });
      } catch (error) {
        console.error("❌ Error emitting tripAccepted:", error);
      }
    });

    // When a trip is canceled, notify the customer and drivers
    socket.on('tripCancelled', ({ tripId, customerId }) => {
      try {
        // Update trip status to declined in the database
        const updateTripStatusQuery = `UPDATE trips SET statuses = 'declined', cancellation_reason = ?, cancel_by = 'driver' WHERE id = ?`;
        // Assuming you have a function to run the query and handle the database
        runQuery(updateTripStatusQuery, [cancellationReason, tripId]);
    
        // Notify the customer about the cancellation
        io.to(`customer_${customerId}`).emit('tripCancelled', { tripId });
    
        console.log(`❌ Trip ${tripId} has been canceled by the driver`);
      } catch (error) {
        console.error("❌ Error handling trip cancellation:", error);
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      const user = connectedUsers[socket.id];
      if (user) {
        console.log(`⚡ ${user.userType} disconnected: ${socket.id}`);
        delete connectedUsers[socket.id];
      }
    });

    // Handle socket errors
    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });
  });

  return io;
};

module.exports = { initializeSocket };
