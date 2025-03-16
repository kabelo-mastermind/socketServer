// /src/services/socketService.js
const { getSocketInstance } = require('../socket');
const { logMessage, logError } = require('../utils/logger');

// Function to handle trip acceptance
const handleTripAcceptance = (tripId) => {
  const io = getSocketInstance();
  io.emit("tripAccepted", { tripId });
  logMessage(`Trip ${tripId} accepted`);
};

// Function to handle trip cancellation
const handleTripCancellation = (tripId) => {
  const io = getSocketInstance();
  io.emit("tripCancelled", { tripId });
  logMessage(`Trip ${tripId} cancelled`);
};

module.exports = {
  handleTripAcceptance,
  handleTripCancellation
};
