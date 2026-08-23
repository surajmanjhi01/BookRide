const http = require("http");
const { Server } = require("socket.io");

const app = require("./app");
const Ride = require("./models/ride.model");
const PORT =
  process.env.PORT || 3000;

const server =
  http.createServer(app);

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
// CAPTAIN SOCKET MAP
// ==================================================

const captainSockets =
  new Map();

// ==================================================
// PENDING RIDE REQUESTS
// --------------------------------------------------
// Stores ride requests per captain ID so they can
// be delivered if a captain reconnects after a
// socket disconnection (e.g. page refresh).
// ==================================================

const pendingRideRequests =
  new Map();

// ==================================================
// USER SOCKET MAP
// ==================================================

const userSockets =
  new Map();

// ==================================================
// MAKE AVAILABLE TO EXPRESS
// ==================================================

app.set("io", io);

app.set(
  "captainSockets",
  captainSockets
);

app.set(
  "pendingRideRequests",
  pendingRideRequests
);

app.set(
  "userSockets",
  userSockets
);

// ==================================================
// SOCKET CONNECTION
// ==================================================

io.on("connection", (socket) => {
  console.log(
    "Socket connected:",
    socket.id
  );

  // ==================================================
  // CAPTAIN
  // ==================================================

  socket.on(
    "join-captain",
    ({ captainId }) => {

      if (!captainId) {
        console.log(
          "Captain ID missing"
        );

        return;
      }

      captainSockets.set(
        captainId,
        socket.id
      );

      socket.captainId =
        captainId;

      console.log(
        `Captain ${captainId} connected with socket ${socket.id}`
      );

      // --------------------------------------------------
      // Deliver any pending ride requests that were
      // created while this captain was disconnected
      // --------------------------------------------------

      const pending =
        pendingRideRequests.get(
          captainId
        ) || [];

      if (pending.length > 0) {
        console.log(
          `Delivering ${pending.length} pending ride request(s) to captain ${captainId}`
        );

        pending.forEach((rideData) => {
          io.to(socket.id).emit(
            "new-ride-request",
            rideData
          );
        });

        // Clear pending requests after delivery
        pendingRideRequests.delete(
          captainId
        );
      }
    }
  );

  // ==================================================
  // RIDER / USER
  // ==================================================

  socket.on(
    "join-user",
    ({ userId }) => {

      if (!userId) {
        console.log(
          "User ID missing"
        );

        return;
      }

      userSockets.set(
        userId,
        socket.id
      );

      socket.userId =
        userId;

      console.log(
        `User ${userId} connected with socket ${socket.id}`
      );
    }
  );

  // ==================================================
  // DISCONNECT
  // ==================================================

  socket.on(
    "disconnect",
    () => {

      console.log(
        "Socket disconnected:",
        socket.id
      );

      // -----------------------------
      // Remove captain
      // -----------------------------

      if (socket.captainId) {

        captainSockets.delete(
          socket.captainId
        );

        console.log(
          `Captain ${socket.captainId} removed from socket map`
        );
      }

      // -----------------------------
      // Remove user
      // -----------------------------

      if (socket.userId) {

        userSockets.delete(
          socket.userId
        );

        console.log(
          `User ${socket.userId} removed from socket map`
        );
      }
    }
  );
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // ============================================
  // CAPTAIN CONNECT
  // ============================================

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

  // ============================================
  // RIDER CONNECT
  // ============================================

  socket.on("join-rider", ({ userId }) => {
    if (!userId) {
      console.log("User ID missing");
      return;
    }

    userSockets.set(userId, socket.id);

    socket.userId = userId;

    console.log(
      `Rider ${userId} connected with socket ${socket.id}`
    );
  });

  // ============================================
  // CAPTAIN LOCATION
  // ============================================

  socket.on(
    "captain-location",
    async ({
      rideId,
      latitude,
      longitude,
    }) => {
      try {
        if (!rideId) {
          console.log("Ride ID missing");
          return;
        }

        if (
          typeof latitude !== "number" ||
          typeof longitude !== "number"
        ) {
          console.log("Invalid captain coordinates");
          return;
        }

        if (!socket.captainId) {
          console.log(
            "Captain location rejected: captain not identified"
          );
          return;
        }

        // ----------------------------------------
        // Find ride
        // ----------------------------------------

        const ride = await Ride.findById(rideId);

        if (!ride) {
          console.log(
            `Ride ${rideId} not found`
          );
          return;
        }

        // ----------------------------------------
        // Security check
        // Captain must belong to this ride
        // ----------------------------------------

        if (
          !ride.captain ||
          ride.captain.toString() !== socket.captainId
        ) {
          console.log(
            `Captain ${socket.captainId} is not assigned to ride ${rideId}`
          );

          return;
        }

        // ----------------------------------------
        // Find rider socket
        // ----------------------------------------

        const riderId =
          ride.user.toString();

        const riderSocketId =
          userSockets.get(riderId);

        if (!riderSocketId) {
          console.log(
            `Rider ${riderId} has no active socket`
          );

          return;
        }

        // ----------------------------------------
        // Send location to rider
        // ----------------------------------------

        io.to(riderSocketId).emit(
          "captain-location",
          {
            rideId: ride._id,
            latitude,
            longitude,
          }
        );

        console.log(
          `Captain ${socket.captainId} location forwarded to rider ${riderId}`
        );

      } catch (error) {
        console.error(
          "Captain location error:",
          error
        );
      }
    }
  );

  // ============================================
  // DISCONNECT
  // ============================================

  socket.on("disconnect", () => {
    console.log(
      "Socket disconnected:",
      socket.id
    );

    if (socket.captainId) {
      captainSockets.delete(
        socket.captainId
      );

      console.log(
        `Captain ${socket.captainId} removed from socket map`
      );
    }

    if (socket.userId) {
      userSockets.delete(
        socket.userId
      );

      console.log(
        `Rider ${socket.userId} removed from socket map`
      );
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
      `Server is running on port ${PORT}`
    );
  }
);