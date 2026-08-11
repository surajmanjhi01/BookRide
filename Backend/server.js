const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// Store captainId -> socketId
const captainSockets = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // -----------------------------------
  // Captain joins socket system
  // -----------------------------------
  socket.on("join-captain", ({ captainId }) => {
    if (!captainId) {
      console.log("Captain ID missing");
      return;
    }

    captainSockets.set(captainId, socket.id);

    // Store captainId on this socket
    socket.captainId = captainId;

    console.log(
      `Captain ${captainId} connected with socket ${socket.id}`
    );
  });

  // -----------------------------------
  // Captain disconnects
  // -----------------------------------
  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);

    if (socket.captainId) {
      captainSockets.delete(socket.captainId);

      console.log(
        `Captain ${socket.captainId} removed from socket map`
      );
    }
  });
});

// -----------------------------------
// Start server
// -----------------------------------

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = {
  io,
  captainSockets,
};