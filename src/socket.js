const { Server } = require("socket.io");

let io;
const connectedUsers = {}; // Store connected users

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      // origin: [
      //   'http://168.172.185.178:8081', // master
      //   'http://10.100.99.10:8081', // bobo
      //   'http://10.100.99.12:8081', // lule
      //   'http://localhost:8081',
      //   'https://10.100.99.6:8081'
      // ],
      origin: '*',
      methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`🚀 New client connected: ${socket.id}`);

    // User joins a room
    socket.on("joinRoom", (userId, userType) => {
      if (!userId || !userType) return;

      // Store user data with socketId
      connectedUsers[userId] = { userId, userType, socketId: socket.id };

      const roomName = userType === "driver" ? `driver_${userId}` : `customer_${userId}`;
      socket.join(roomName);

      console.log(`✅ ${userType} ${userId} joined room: ${roomName}`);
      console.log("📋 Current Connected Users:", connectedUsers);  // Log updated users
    });

    // Notify a driver about a new trip request
    socket.on("newTripRequest", ({ tripData, driverId }) => {
      if (!tripData || !driverId) {
        console.error("❌ Missing tripData or driverId");
        return;
      }

      console.log(`📢 New trip request for Driver ID: ${driverId}`);
      io.to(`driver_${driverId}`).emit("newTripNotification", tripData);
    });

    // Notify customer when a trip is accepted
    socket.on("acceptTrip", ({ tripId, customerId }) => {
      if (!tripId || !customerId) return console.error("❌ Missing tripId or customerId");

      console.log(`✅ Trip ${tripId} accepted for customer ${customerId}`);
      io.to(`customer_${customerId}`).emit("tripAccepted", { tripId });
    });

    // Notify customer when driver arrives
    socket.on("driverArrived", ({ tripId, customerId }) => {
      if (!tripId || !customerId) return console.error("❌ Missing tripId or customerId");

      console.log(`🚗 Driver arrived for trip ${tripId}, notifying customer ${customerId}`);
      io.to(`customer_${customerId}`).emit("driverArrived", { tripId });
    });

    // Notify customer when trip starts
    socket.on("startTrip", ({ tripId, customerId }) => {
      if (!tripId || !customerId) return console.error("❌ Missing tripId or customerId");

      console.log(`🚀 Trip ${tripId} started for customer ${customerId}`);
      io.to(`customer_${customerId}`).emit("tripStarted", { tripId });
    });

    // Notify customer when trip ends
    socket.on("endTrip", ({ tripId, customerId }) => {
      if (!tripId || !customerId) return console.error("❌ Missing tripId or customerId");

      console.log(`🏁 Trip ${tripId} ended for customer ${customerId}`);
      io.to(`customer_${customerId}`).emit("tripEnded", { tripId });
    });

    // Notify customer if the trip is declined
    socket.on("declineTrip", ({ tripId, customerId }) => {
      if (!tripId || !customerId) return console.error("❌ Missing tripId or customerId");

      console.log(`🚫 Trip ${tripId} declined for customer ${customerId}`);
      io.to(`customer_${customerId}`).emit("tripDeclined", { tripId });
    });

    // Notify driver if the trip is canceled
    socket.on("newTripCancel", ({ tripData, driverId }) => {
      if (!tripData || !driverId) return console.error("❌ Missing tripData or driverId");

      console.log(`🚫 Trip ${tripData.tripId} canceled for driver ${driverId}`);
      io.to(`driver_${driverId}`).emit("tripCancelled", { tripId: tripData.tripId });
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // ✅ Updated Chat Functionality
    socket.on("sendMessage", (messageData) => {
      const { receiverId, message, senderId, timestamp } = messageData;
    
      console.log(`📨 New message from ${senderId} to ${receiverId}: ${message}`);
    
      // Check if the receiver exists in the connectedUsers object
      const receiverSocket = connectedUsers[receiverId];  // Look for receiverId in the connected users
    
      console.log("🔍 Receiver Socket Data:", receiverSocket);
    
      if (receiverSocket && receiverSocket.socketId) {
        // Emit message to the correct room (receiver's socketId)
        io.to(receiverSocket.socketId).emit("chatMessage", {
          senderId,
          message,
          timestamp,
        });
        console.log(`📩 Message delivered to ${receiverId}`);
      } else {
        console.log("❌ Receiver not found or offline");
      }
    });

    /////delete message
    // Edit Message
socket.on("editMessage", (messageData) => {
  const { messageId, newMessage, senderId, receiverId, timestamp } = messageData;

  console.log(`✏️ Editing message ${messageId}: ${newMessage}`);

  // Send the updated message to the receiver if they are online
  const receiverSocket = connectedUsers[receiverId];
  if (receiverSocket && receiverSocket.socketId) {
    io.to(receiverSocket.socketId).emit("messageEdited", { messageId, newMessage, timestamp });
  }
});

// Delete Message
socket.on("deleteMessage", ({ messageId, senderId, receiverId }) => {
  console.log(`🗑️ Deleting message ${messageId}`);

  // Notify the receiver that the message has been deleted
  const receiverSocket = connectedUsers[receiverId];
  if (receiverSocket && receiverSocket.socketId) {
    io.to(receiverSocket.socketId).emit("messageDeleted", { messageId });
  }
});

    
    
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // Handle disconnection
    socket.on("disconnect", () => {
      const user = Object.values(connectedUsers).find(u => u.socketId === socket.id);

      if (user) {
        console.log(`⚡ ${user.userType} disconnected: ${socket.id}`);
        delete connectedUsers[user.userId]; // Remove user from list
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
