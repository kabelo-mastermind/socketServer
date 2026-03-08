const { Server } = require("socket.io");
const { admin, initFirebaseAdmin } = require("./config/firebaseAdmin");

let io;
const connectedUsers = {}; // Store connected users

const getAllowedOrigins = () => {
  const raw = process.env.ALLOWED_ORIGINS || "";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
};

const initializeSocket = (server) => {
  initFirebaseAdmin();
  const allowedOrigins = getAllowedOrigins();

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          return callback(null, true);
        }
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error("CORS_NOT_ALLOWED"));
      },
      methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) {
        return next(new Error("AUTH_MISSING_TOKEN"));
      }

      const decoded = await admin.auth().verifyIdToken(token);
      socket.user = {
        uid: decoded.uid,
        claims: decoded,
      };

      return next();
    } catch (error) {
      return next(new Error("AUTH_INVALID_TOKEN"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`🚀 New client connected: ${socket.id}`);

    // User joins a room
    socket.on("joinRoom", (userId, userType) => {
      if (!userId || !userType) return;

      // Store user data with socketId
      connectedUsers[userId] = { userId, userType, socketId: socket.id };

      // Create room based on userType - ADD SUPPORT FOR FOOD-DELIVERY
      let roomName;
      if (userType === "driver" || userType === "food-delivery") {
        roomName = `driver_${userId}`;
      } else {
        roomName = `customer_${userId}`;
      }

      socket.join(roomName);

      console.log(`✅ ${userType} ${userId} joined room: ${roomName}`);
      console.log("📋 Current Connected Users:", connectedUsers);
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


    // 🔥 FINAL + WORKING FOOD ORDER UPDATE HANDLER
    socket.on("foodOrderUpdate", (data) => {
      console.log("🔍 RAW foodOrderUpdate received:", data);

      if (!data || typeof data !== "object") {
        console.error("❌ Invalid foodOrderUpdate payload:", data);
        return;
      }

      const { orderId, status, customerId, driverId } = data;

      if (!customerId) {
        console.error("❌ Missing customerId in foodOrderUpdate");
        return;
      }

      console.log("\n=== 🍔 FOOD ORDER UPDATE RECEIVED FROM DRIVER ===");
      console.log(`Order: ${orderId}`);
      console.log(`Status: ${status}`);
      console.log(`Customer ID: ${customerId}`);
      console.log(`Driver ID: ${driverId}`);

      const customerRoom = `customer_${customerId}`;

      console.log(`📤 Forwarding update to room: ${customerRoom}`);

      // ⭐ THE IMPORTANT PART ⭐
      io.to(customerRoom).emit("foodOrderUpdate", data);

      console.log(`✅ Update delivered to customer room: ${customerRoom}`);
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

    // Handle SOS alerts emitted by clients
    socket.on('sosAlert', async (payload) => {
      try {
        const senderUid = socket.user?.uid || null;

        // Normalize incoming payload to a predictable shape for consumers
        const normalized = {
          user_id: payload && payload.user_id ? payload.user_id : null,
          user_type: payload && payload.user_type ? payload.user_type : null,
          trip_id: payload && payload.trip_id ? payload.trip_id : null,
          latitude: payload && (payload.latitude !== undefined) ? Number(payload.latitude) : null,
          longitude: payload && (payload.longitude !== undefined) ? Number(payload.longitude) : null,
          accuracy: payload && (payload.accuracy !== undefined) ? (payload.accuracy === null ? null : Number(payload.accuracy)) : null,
          trigger_source: (payload && payload.trigger_source) ? payload.trigger_source : 'in_app_button',
          severity: (payload && payload.severity) ? payload.severity : 'unknown',
          description: (payload && payload.description) ? payload.description : null,
          phone: (payload && payload.phone) ? payload.phone : null,
          metadata: (payload && payload.metadata) ? payload.metadata : null,
          senderUid,
          receivedAt: new Date().toISOString(),
        };

        console.log('🚨 SOS received (normalized):', normalized);

        // Do not persist on the socket server — frontend already POSTs to the HTTP endpoint.
        // Realtime delivery only below.

        // 1) Emit to any admin/support/emergency staff connected
        Object.values(connectedUsers).forEach((u) => {
          if (u && u.userType && (u.userType === 'admin' || u.userType === 'support' || u.userType === 'emergency')) {
            if (u.socketId) io.to(u.socketId).emit('sosAlert', normalized);
          }
        });

        // 2) Emit to generic emergency dashboard room
        io.to('emergency_room').emit('sosAlert', normalized);

        // 3) If the alert references a specific user, emit to their room (customer/driver)
        try {
          if (normalized.user_type && normalized.user_id) {
            if (normalized.user_type === 'driver' || normalized.user_type === 'food-delivery') {
              io.to(`driver_${normalized.user_id}`).emit('sosAlert', normalized);
            } else {
              io.to(`customer_${normalized.user_id}`).emit('sosAlert', normalized);
            }
          }
        } catch (e) {
          console.warn('⚠️ Failed to emit to user room for sosAlert:', e);
        }
      } catch (err) {
        console.error('❌ Error handling sosAlert:', err);
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
