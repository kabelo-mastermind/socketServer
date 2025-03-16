// /src/utils/logger.js
const logMessage = (message) => {
    console.log(`[LOG]: ${message}`);
  };
  
  const logError = (error) => {
    console.error(`[ERROR]: ${error}`);
  };
  
  module.exports = { logMessage, logError };
  