// /src/config/corsConfig.js
module.exports = {
  cors: {
    // origin: [
    //   'http://168.172.185.178:8081',  // First device IP
    //   'http://10.100.9.10:8081',      // Second device IP
    //   'http://localhost:8081',         // Localhost for local development
    //   'https://your-app-name.onrender.com', // Render deployed URL
    // ],
    origin: "*",
    methods: ["POST", "GET", "PUT", "DELETE", "PATCH"],
  }
}

  