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

// Make io available to Express controllers
app.set("io", io);

// Store captain socket connections
const captainSockets = new Map();

// Make captain socket map available to controllers
app.set("captainSockets", captainSockets);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join-captain", ({ captainId }) => {
    if (!captainId) {
      console.log("Captain ID missing");
      return;
    }

    captainSockets.set(captainId, socket.id);

    socket.captainId = captainId;

    console.log(
      `Captain ${captainId} connected with socket ${socket.id}`
    );
  });

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

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});