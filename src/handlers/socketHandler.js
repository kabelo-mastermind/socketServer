// /src/handlers/socketHandler.js
const { handleTripAcceptance, handleTripCancellation } = require('../services/socketService');

module.exports = (socket) => {
  socket.on("joinRoom", (userId) => {
    const roomName = `customer_${userId}`;
    socket.join(roomName);
    console.log(`User with ID ${userId} joined room: ${roomName}`);
  });

  socket.on("acceptTrip", (tripId) => {
    handleTripAcceptance(tripId);
  });

  socket.on("tripCancelled", (tripId) => {
    handleTripCancellation(tripId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  socket.on("error", (error) => {
    console.error("Socket connection error:", error);
  });
};
