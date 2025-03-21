const { Server } = require("socket.io");

let io;
const connectedUsers = {}; // Store connected users

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://168.172.185.178:8081',//master
        'http://10.100.99.10:8081',//bobo
        'http://10.100.99.12:8081',//lule
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

      // Dynamically create a room name for drivers based on their userId
      const roomName = userType === "driver" ? `driver_${userId}` : `customer_${userId}`;
      socket.join(roomName);
      connectedUsers[socket.id] = { userId, userType };

      console.log(`✅ ${userType} with ID ${userId} joined room: ${roomName}`);
    });

    // Notify a specific driver when a new trip request is created
    socket.on("newTripRequest", ({ tripData, driverId }) => {
      if (!tripData || !driverId) {
        console.error("❌ Missing tripData or driverId");
        return;
      }

      console.log(`📢 New trip request for Driver ID: ${driverId}`);
      console.log("🚀 tripData:", tripData);

      const driverRoom = `driver_${driverId}`;

      console.log(`📡 Emitting to room: ${driverRoom}`);

      io.to(driverRoom).emit("newTripNotification", tripData);
    });



    // When a trip is accepted, notify the customer
    socket.on("acceptTrip", ({ tripId, customerId }) => {
      try {
        if (!tripId || !customerId) {
          console.error("❌ Missing tripId or customerId");
          return;
        }
        console.log(`✅ Trip ${tripId} accepted for customer ${customerId}`);
        io.to(`customer_${customerId}`).emit("tripAccepted", { tripId });
      } catch (error) {
        console.error("❌ Error emitting tripAccepted:", error);
      }
    });

    // When a driver is close, notify the customer for arival
    socket.on("driverArrived", ({ tripId, customerId }) => {
      try {
        if (!tripId || !customerId) {
          console.error("❌ Missing tripId or customerId");
          return;
        }
        console.log(`✅ Trip ${tripId} accepted for customer ${customerId}`);
        io.to(`customer_${customerId}`).emit("driverArrived", { tripId });
      } catch (error) {
        console.error("❌ Error emitting driverArrived:", error);
      }
    });

    // When a trip is started, notify the customer
    socket.on("startTrip", ({ tripId, customerId }) => {
      try {
        if (!tripId || !customerId) {
          console.error("❌ Missing tripId or customerId");
          return;
        }
        console.log(`✅ Trip ${tripId} started for customer ${customerId}`);
        io.to(`customer_${customerId}`).emit("tripStarted", { tripId });
      } catch (error) {
        console.error("❌ Error emitting tripStarted:", error);
      }
    });
    // When a trip is ended, notify the customer
    socket.on("endTrip", ({ tripId, customerId }) => {
      try {
        if (!tripId || !customerId) {
          console.error("❌ Missing tripId or customerId");
          return;
        }
        console.log(`✅ Trip ${tripId} ended for customer ${customerId}`);
        io.to(`customer_${customerId}`).emit("tripEnded", { tripId });
      } catch (error) {
        console.error("❌ Error emitting tripEnded:", error);
      }
    });

    // When a trip is canceled, notify the customer
    socket.on("declineTrip", ({ tripId, customerId }) => {
      try {
        if (!tripId || !customerId) {
          console.error("❌ Missing tripId or customerId");
          return;
        }
        console.log(`✅ Trip ${tripId} canceled for customer ${customerId}`);
        io.to(`customer_${customerId}`).emit("tripDeclined", { tripId });
      } catch (error) {
        console.error("❌ Error emitting tripDeclined:", error);
      }
    });

    // When a trip is canceled, notify the driver
    socket.on("newTripCancel", ({ tripData, driverId }) => {
      try {
        if (!tripData || !driverId) {
          console.error("❌ Missing tripData or driverId");
          return;
        }
        console.log(`🚫 Trip ${tripData.tripId} canceled for driver ${driverId}`);
        io.to(`driver_${driverId}`).emit("tripCancelled", { tripId: tripData.tripId });
      } catch (error) {
        console.error("❌ Error emitting tripCancelled:", error);
      }
    });



    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // lule chats
    // Handle sending chat messages
    socket.on("sendMessage", (messageData) => {
      const { receiverId, message, senderId, timestamp } = messageData;

      // Check if the receiver is connected
      const receiverSocket = Object.values(connectedUsers).find(user => user.userId === receiverId);

      if (receiverSocket) {
        io.to(receiverSocket.socketId).emit("chatMessage", {
          senderId,
          message,
          timestamp,
        });
        console.log(`Message sent to user ${receiverId}: ${message}`);
      } else {
        console.log("❌ Receiver not found");
      }
    });

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
