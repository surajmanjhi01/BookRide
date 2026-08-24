const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const captainModel = require("./models/captain.model");
const userModel = require("./models/user.model");
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

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      console.log("❌ Socket authentication rejected: token missing");
      return next(new Error("Socket authentication required"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [user, captain] = await Promise.all([
      userModel.findById(decoded.id).select("_id"),
      captainModel.findById(decoded.id).select("_id"),
    ]);

    if (user) {
      socket.authenticatedId = user._id.toString();
      socket.authenticatedRole = "user";
    } else if (captain) {
      socket.authenticatedId = captain._id.toString();
      socket.authenticatedRole = "captain";
    } else {
      console.log(
        `❌ Socket authentication rejected: account ${decoded.id} not found`
      );
      return next(new Error("Socket account not found"));
    }

    console.log(
      `🔐 Socket authenticated: ${socket.authenticatedRole} ${socket.authenticatedId}`
    );
    next();
  } catch (error) {
    console.error("❌ Socket authentication error:", error.message);
    next(new Error("Socket authentication failed"));
  }
});

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

  socket.on("join-captain", async ({ captainId } = {}) => {
    try {
      if (socket.authenticatedRole !== "captain") {
        console.log("❌ Non-captain socket attempted captain registration");
        return;
      }

      const authenticatedCaptainId = socket.authenticatedId;

      if (captainId && captainId.toString() !== authenticatedCaptainId) {
        console.log(
          `⚠️ Ignoring mismatched captain ID ${captainId}; using ${authenticatedCaptainId}`
        );
      }

      // ------------------------------------------
      // Store socket in memory
      // ------------------------------------------

      captainSockets.set(
        authenticatedCaptainId,
        socket.id
      );

      socket.captainId =
        authenticatedCaptainId;

      console.log(
        `🚕 Captain ${authenticatedCaptainId} connected with socket ${socket.id}`
      );

      // ------------------------------------------
      // IMPORTANT:
      // Store socket ID in MongoDB
      // ------------------------------------------

      await captainModel.findByIdAndUpdate(
        authenticatedCaptainId,
        {
          socketId: socket.id,
        },
        {
          returnDocument: "after",
        }
      );

      console.log(
        `✅ Captain ${authenticatedCaptainId} socketId saved to MongoDB`
      );

      // ------------------------------------------
      // Deliver pending rides
      // ------------------------------------------

      const pending =
        pendingRideRequests.get(
          authenticatedCaptainId
        ) || [];

      if (pending.length > 0) {
        console.log(
          `📦 Delivering ${pending.length} pending ride(s) to captain ${authenticatedCaptainId}`
        );

        pending.forEach((rideData) => {
          socket.emit(
            "new-ride-request",
            rideData
          );
        });

        pendingRideRequests.delete(
          authenticatedCaptainId
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

socket.on("join-rider", ({ userId } = {}) => {
  if (socket.authenticatedRole !== "user") {
    console.log("❌ Non-rider socket attempted rider registration");
    return;
  }

  const userIdString = socket.authenticatedId;

  if (userId && userId.toString() !== userIdString) {
    console.log(
      `⚠️ Ignoring mismatched rider ID ${userId}; using ${userIdString}`
    );
  }

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

      // ==================================================
      // BASIC VALIDATION
      // ==================================================

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

      console.log("=================================");
      console.log("📍 CAPTAIN LOCATION RECEIVED");
      console.log("Captain:", socket.captainId);
      console.log("Latitude:", latitude);
      console.log("Longitude:", longitude);
      console.log("Ride:", rideId);
      console.log("=================================");

      // ==================================================
      // SAVE CAPTAIN LOCATION TO MONGODB
      // ==================================================

      const captain =
        await captainModel.findByIdAndUpdate(
          socket.captainId,
          {
            location: {
              type: "Point",
              coordinates: [
                longitude,
                latitude,
              ],
            },
          },
          {
            returnDocument: "after",
          }
        );

      if (!captain) {
        console.log(
          `❌ Captain ${socket.captainId} not found`
        );

        return;
      }

      console.log(
        "📍 Captain location saved:",
        captain.location.coordinates
      );

      // ==================================================
      // IF THERE IS NO RIDE
      // ==================================================

      if (!rideId) {
        console.log(
          "ℹ️ No active ride. Location saved only."
        );

        return;
      }

      // ==================================================
      // FIND RIDE
      // ==================================================

      const ride =
        await Ride.findById(rideId);

      if (!ride) {
        console.log(
          `❌ Ride ${rideId} not found`
        );

        return;
      }

      // ==================================================
      // SECURITY CHECK
      // ==================================================

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

      // ==================================================
      // FIND RIDER
      // ==================================================

      if (!ride.user) {
        console.log(
          `❌ Ride ${rideId} has no rider`
        );

        return;
      }

      const riderId =
        ride.user.toString();

      console.log(
        "👤 Ride belongs to rider:",
        riderId
      );

      // ==================================================
      // DEBUG USER SOCKET MAP
      // ==================================================

      console.log(
        "👥 Current user socket map:",
        [...userSockets.entries()]
      );

      const riderSocketId =
        userSockets.get(riderId);

      console.log(
        "🔎 Rider socket lookup:"
      );

      console.log(
        "Rider ID:",
        riderId
      );

      console.log(
        "Rider socket:",
        riderSocketId
      );

      // ==================================================
      // RIDER NOT CONNECTED
      // ==================================================

      if (!riderSocketId) {

        console.log(
          `⚠️ Rider ${riderId} has no active socket`
        );

        console.log(
          "Available rider sockets:",
          [...userSockets.entries()]
        );

        return;
      }

      // ==================================================
      // SEND LOCATION TO RIDER
      // ==================================================

      io.to(riderSocketId).emit(
        "captain-location",
        {
          rideId:
            ride._id.toString(),

          captainId:
            socket.captainId,

          latitude,
          longitude,
        }
      );

      console.log(
        `✅ Captain location forwarded to rider ${riderId}`
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