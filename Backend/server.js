const http = require("http");
const { Server } = require("socket.io");

const captainModel = require("./models/captain.model");
const Ride = require("./models/ride.model");
const app = require("./app");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// ==================================================
// SOCKET.IO
// ==================================================

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

// ==================================================
// SOCKET MAPS
// ==================================================

const captainSockets = new Map();
const userSockets = new Map();

// Pending rides for disconnected captains
const pendingRideRequests = new Map();

// ==================================================
// MAKE AVAILABLE TO EXPRESS
// ==================================================

app.set("io", io);

app.set(
  "captainSockets",
  captainSockets
);

app.set(
  "userSockets",
  userSockets
);

app.set(
  "pendingRideRequests",
  pendingRideRequests
);

// ==================================================
// SOCKET CONNECTION
// ==================================================

io.on("connection", (socket) => {
  console.log("=================================");
  console.log("Socket connected:", socket.id);
  console.log("=================================");

  // ==================================================
  // CAPTAIN CONNECT
  // ==================================================

  socket.on("join-captain", async ({ captainId }) => {
    try {
      if (!captainId) {
        console.log("❌ Captain ID missing");
        return;
      }

      // ------------------------------------------
      // Store socket in memory
      // ------------------------------------------

      captainSockets.set(
        captainId.toString(),
        socket.id
      );

      socket.captainId =
        captainId.toString();

      console.log(
        `🚕 Captain ${captainId} connected with socket ${socket.id}`
      );

      // ------------------------------------------
      // IMPORTANT:
      // Store socket ID in MongoDB
      // ------------------------------------------

      await captainModel.findByIdAndUpdate(
        captainId,
        {
          socketId: socket.id,
        },
        {
          returnDocument: "after",
        }
      );

      console.log(
        `✅ Captain ${captainId} socketId saved to MongoDB`
      );

      // ------------------------------------------
      // Deliver pending rides
      // ------------------------------------------

      const pending =
        pendingRideRequests.get(
          captainId.toString()
        ) || [];

      if (pending.length > 0) {
        console.log(
          `📦 Delivering ${pending.length} pending ride(s) to captain ${captainId}`
        );

        pending.forEach((rideData) => {
          socket.emit(
            "new-ride-request",
            rideData
          );
        });

        pendingRideRequests.delete(
          captainId.toString()
        );
      }

    } catch (error) {
      console.error(
        "❌ Captain socket connection error:",
        error
      );
    }
  });

  // ==================================================
  // RIDER CONNECT
  // ==================================================

socket.on("join-rider", ({ userId }) => {
  if (!userId) {
    console.log("❌ Rider ID missing");
    return;
  }

  const userIdString = userId.toString();

  userSockets.set(
    userIdString,
    socket.id
  );

  socket.userId = userIdString;

  console.log("=================================");
  console.log("👤 RIDER CONNECTED");
  console.log("Rider ID:", userIdString);
  console.log("Socket ID:", socket.id);
  console.log(
    "User socket map:",
    [...userSockets.entries()]
  );
  console.log("=================================");
});

  // ==================================================
  // CAPTAIN LOCATION
  // ==================================================

  socket.on(
    "captain-location",
    async ({
      rideId,
      latitude,
      longitude,
    }) => {

      try {

        if (!rideId) {
          console.log(
            "❌ Ride ID missing"
          );
          return;
        }

        if (
          typeof latitude !== "number" ||
          typeof longitude !== "number"
        ) {
          console.log(
            "❌ Invalid captain coordinates"
          );
          return;
        }

        if (!socket.captainId) {
          console.log(
            "❌ Captain not identified"
          );
          return;
        }

        // ------------------------------------------
        // Find ride
        // ------------------------------------------

        const ride =
          await Ride.findById(rideId);

        if (!ride) {
          console.log(
            `❌ Ride ${rideId} not found`
          );

          return;
        }

        // ------------------------------------------
        // Security check
        // ------------------------------------------

        if (
          !ride.captain ||
          ride.captain.toString() !==
            socket.captainId
        ) {

          console.log(
            `❌ Captain ${socket.captainId} is not assigned to ride ${rideId}`
          );

          return;
        }

        // ------------------------------------------
        // Find rider socket
        // ------------------------------------------

        const riderId =
          ride.user.toString();

        const riderSocketId =
          userSockets.get(riderId);

        if (!riderSocketId) {
          console.log(
            `⚠️ Rider ${riderId} has no active socket`
          );

          return;
        }

        // ------------------------------------------
        // Send location to rider
        // ------------------------------------------

        io.to(riderSocketId).emit(
          "captain-location",
          {
            rideId: ride._id,
            latitude,
            longitude,
          }
        );

        console.log(
          `📍 Captain ${socket.captainId} location forwarded to rider ${riderId}`
        );

      } catch (error) {

        console.error(
          "❌ Captain location error:",
          error
        );

      }

    }
  );

  // ==================================================
  // DISCONNECT
  // ==================================================

  socket.on("disconnect", async () => {

    console.log(
      "❌ Socket disconnected:",
      socket.id
    );

    // ------------------------------------------
    // CAPTAIN DISCONNECT
    // ------------------------------------------

    if (socket.captainId) {

      const captainId =
        socket.captainId.toString();

      // Only delete if this socket is still
      // the current socket for this captain
      if (
        captainSockets.get(captainId) ===
        socket.id
      ) {

        captainSockets.delete(
          captainId
        );

        console.log(
          `Captain ${captainId} removed from socket map`
        );

        // Clear socketId from database
        await captainModel.findByIdAndUpdate(
          captainId,
          {
            socketId: null,
          },
          {
            returnDocument: "after",
          }
        );

        console.log(
          `Captain ${captainId} socketId cleared`
        );
      }
    }

    // ------------------------------------------
    // RIDER DISCONNECT
    // ------------------------------------------

    if (socket.userId) {

      const userId =
        socket.userId.toString();

      // Only remove if this is the
      // current socket
      if (
        userSockets.get(userId) ===
        socket.id
      ) {

        userSockets.delete(
          userId
        );

        console.log(
          `Rider ${userId} removed from socket map`
        );
      }
    }
  });
});

// ==================================================
// START SERVER
// ==================================================

server.listen(
  PORT,
  () => {
    console.log(
      `🚀 Server is running on port ${PORT}`
    );
  }
);