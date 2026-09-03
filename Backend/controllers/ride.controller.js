const rideService = require("../services/ride.service");
const captainService = require("../services/captain.services");

// ==================================================
// CREATE RIDE
// ==================================================

exports.createRide = async (req, res) => {
  try {
    const {
      pickup,
      destination,
      distance,
      duration,
      vehicleType,
    } = req.body;

    // ==================================================
    // VALIDATION
    // ==================================================

    if (
      !pickup ||
      !destination ||
      distance === undefined ||
      duration === undefined ||
      !vehicleType
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Pickup, destination, distance, duration and vehicleType are required.",
      });
    }

    // ==================================================
    // CHECK USER AUTHENTICATION
    // ==================================================

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required.",
      });
    }

    // ==================================================
    // VALIDATE PICKUP COORDINATES
    // ==================================================

    if (
      !pickup.location ||
      !Array.isArray(pickup.location.coordinates) ||
      pickup.location.coordinates.length !== 2
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid pickup location coordinates.",
      });
    }

    const [
      longitude,
      latitude,
    ] = pickup.location.coordinates;

    if (
      typeof longitude !== "number" ||
      typeof latitude !== "number"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Pickup longitude and latitude must be numbers.",
      });
    }

    // ==================================================
    // DEBUG SOCKET STATE
    // ==================================================

    const userSockets =
      req.app.get("userSockets");

    console.log(
      "================================="
    );

    console.log(
      "🚕 CREATE RIDE"
    );

    console.log(
      "User ID:",
      req.user._id.toString()
    );

    console.log(
      "User Socket:",
      userSockets
        ? userSockets.get(
            req.user._id.toString()
          )
        : "userSockets not available"
    );

    console.log(
      "Pickup:",
      [longitude, latitude]
    );

    console.log(
      "Vehicle:",
      vehicleType
    );

    console.log(
      "================================="
    );

    // ==================================================
    // CREATE RIDE IN DATABASE
    // ==================================================

    const ride =
      await rideService.createRide({
        user: req.user._id,
        pickup,
        destination,
        distance,
        duration,
        vehicleType,
      });

    console.log(
      "================================="
    );

    console.log(
      "✅ RIDE CREATED"
    );

    console.log(
      "Ride ID:",
      ride._id.toString()
    );

    console.log(
      "Ride User:",
      ride.user.toString()
    );

    console.log(
      "Ride Status:",
      ride.status
    );

    console.log(
      "================================="
    );

    // ==================================================
    // FIND NEARBY CAPTAINS
    // ==================================================

    const nearbyCaptains =
      await captainService.findNearbyCaptains(
        longitude,
        latitude,
        5000
      );

    console.log(
      "🚕 Nearby captains:",
      nearbyCaptains.length
    );

    // ==================================================
    // SOCKET.IO OBJECTS
    // ==================================================

    const io =
      req.app.get("io");

    const captainSockets =
      req.app.get("captainSockets");

    const pendingRideRequests =
      req.app.get(
        "pendingRideRequests"
      );

    if (!io) {
      console.warn(
        "⚠️ Socket.IO instance not available"
      );
    }

    // ==================================================
    // RIDE REQUEST PAYLOAD
    // ==================================================

    const rideRequestPayload = {
      rideId:
        ride._id.toString(),

      pickup:
        ride.pickup,

      destination:
        ride.destination,

      distance:
        ride.distance,

      duration:
        ride.duration,

      fare:
        ride.fare,

      vehicleType:
        ride.vehicleType,
    };

    // ==================================================
    // SEND RIDE REQUEST TO NEARBY CAPTAINS
    // ==================================================

    nearbyCaptains.forEach(
      (captain) => {

        const captainId =
          captain._id.toString();

        const socketId =
          captainSockets?.get(
            captainId
          );

        // ==================================================
        // CAPTAIN HAS NO SOCKET
        // ==================================================

        if (!socketId) {

          console.log(
            `⚠️ Captain ${captainId} has no active socket`
          );

          // ----------------------------------------------
          // Queue ride request
          // ----------------------------------------------

          if (pendingRideRequests) {

            const existingRequests =
              pendingRideRequests.get(
                captainId
              ) || [];

            const alreadyQueued =
              existingRequests.some(
                (request) =>
                  request.rideId ===
                  rideRequestPayload.rideId
              );

            if (!alreadyQueued) {

              existingRequests.push(
                rideRequestPayload
              );

              pendingRideRequests.set(
                captainId,
                existingRequests
              );

              console.log(
                `📦 Ride ${rideRequestPayload.rideId} queued for captain ${captainId}`
              );
            }
          }

          return;
        }

        // ==================================================
        // CAPTAIN HAS ACTIVE SOCKET
        // ==================================================

        console.log(
          `📡 Sending ride request to captain ${captainId}`
        );

        console.log(
          `Captain socket: ${socketId}`
        );

        io.to(socketId).emit(
          "new-ride-request",
          rideRequestPayload
        );

        console.log(
          `✅ Ride request sent to captain ${captainId}`
        );
      }
    );

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(201).json({
      success: true,
      message:
        "Ride created successfully",
      data: ride,
    });

  } catch (error) {

    console.error(
      "❌ Create Ride Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message,
    });
  }
};


// ==================================================
// ACCEPT RIDE
// ==================================================

exports.acceptRide = async (req, res) => {
  try {

    const { rideId } =
      req.params;

    // ==================================================
    // VALIDATION
    // ==================================================

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "Ride ID is required",
      });
    }

    // ==================================================
    // AUTHENTICATED CAPTAIN
    // ==================================================

    if (
      !req.captain ||
      !req.captain._id
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Captain authentication required.",
      });
    }

    const captainId =
      req.captain._id;

    console.log(
      "================================="
    );

    console.log(
      `🚕 Captain ${captainId} attempting to accept ride ${rideId}`
    );

    console.log(
      "================================="
    );

    // ==================================================
    // ACCEPT RIDE
    // ==================================================

    const ride =
      await rideService.acceptRide(
        rideId,
        captainId
      );

    console.log(
      `✅ Ride ${rideId} accepted by captain ${captainId}`
    );

    // ==================================================
    // SOCKET.IO
    // ==================================================

    const io =
      req.app.get("io");

    const userSockets =
      req.app.get("userSockets");

    if (
      !io ||
      !userSockets
    ) {

      console.log(
        "⚠️ Socket.IO or userSockets not available"
      );

    } else {

      const userId =
        ride.user.toString();

      const userSocketId =
        userSockets.get(
          userId
        );

      // ==================================================
      // RIDER SOCKET FOUND
      // ==================================================

      if (userSocketId) {

        console.log(
          `📡 Sending ride-accepted to user ${userId}`
        );

        console.log(
          `Rider socket: ${userSocketId}`
        );

        io.to(userSocketId).emit(
          "ride-accepted",
          {
            rideId:
              ride._id,

            captainId:
              captainId,

            status:
              ride.status,

            captain: {
              id:
                req.captain._id,

              fullname:
                req.captain.fullname,

              vehicle:
                req.captain.vehicle,
            },
          }
        );

        console.log(
          `✅ ride-accepted sent to rider ${userId}`
        );

      } else {

        console.log(
          `⚠️ User ${userId} does not have an active socket`
        );

        console.log(
          "Current user socket map:",
          [
            ...userSockets.entries(),
          ]
        );
      }
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,
      message:
        "Ride accepted successfully",
      data: ride,
    });

  } catch (error) {

    console.error(
      "❌ Accept Ride Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
};


// ==================================================
// REJECT RIDE
// ==================================================

exports.rejectRide = async (
  req,
  res
) => {

  try {

    const { rideId } =
      req.params;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message:
          "Ride ID is required",
      });
    }

    if (
      !req.captain ||
      !req.captain._id
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Captain authentication required.",
      });
    }

    const captainId =
      req.captain._id;

    const ride =
      await rideService.rejectRide(
        rideId,
        captainId
      );

    console.log(
      `🚫 Captain ${captainId} rejected ride ${rideId}`
    );

    return res.status(200).json({
      success: true,
      message:
        "Ride rejected successfully",
      data: ride,
    });

  } catch (error) {

    console.error(
      "❌ Reject Ride Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
};


// ==================================================
// CAPTAIN ARRIVED
// ==================================================

// ==================================================
// CAPTAIN ARRIVED
// ==================================================

// ==================================================
// CAPTAIN ARRIVED
// ==================================================

exports.markRideArrived = async (req, res) => {
  try {
    const { rideId } = req.params;

    // ==================================================
    // VALIDATE RIDE ID
    // ==================================================

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "Ride ID is required",
      });
    }

    // ==================================================
    // VALIDATE CAPTAIN
    // ==================================================

    if (!req.captain || !req.captain._id) {
      return res.status(401).json({
        success: false,
        message: "Captain authentication required.",
      });
    }

    const captainId = req.captain._id.toString();

    console.log("\n=================================");
    console.log("📍 CAPTAIN ARRIVED");
    console.log("=================================");
    console.log("Ride ID:", rideId);
    console.log("Captain ID:", captainId);

    // ==================================================
    // MARK RIDE ARRIVED
    // ==================================================

    const ride = await rideService.markRideArrived(
      rideId,
      captainId
    );

    console.log("=================================");
    console.log("✅ RIDE STATUS UPDATED");
    console.log("=================================");
    console.log("Ride ID:", ride._id.toString());
    console.log("Ride status:", ride.status);
    console.log("Ride user:", ride.user?.toString());
    console.log("Ride captain:", ride.captain?.toString());

    // ==================================================
    // GET SOCKET.IO
    // ==================================================

    const io = req.app.get("io");
    const userSockets = req.app.get("userSockets");

    console.log("\n=================================");
    console.log("🔌 SOCKET DEBUG");
    console.log("=================================");

    console.log(
      "IO available:",
      !!io
    );

    console.log(
      "userSockets available:",
      !!userSockets
    );

    // ==================================================
    // CHECK USER
    // ==================================================

    if (!ride.user) {
      console.log(
        "❌ Ride does not contain a user"
      );

      return res.status(200).json({
        success: true,
        message: "Captain arrived, but rider could not be notified.",
        data: ride,
      });
    }

    const userId = ride.user.toString();

    console.log(
      "👤 Rider ID from ride:",
      userId
    );

    // ==================================================
    // PRINT COMPLETE SOCKET MAP
    // ==================================================

    if (userSockets) {

      console.log(
        "📋 Current userSockets map:"
      );

      console.log(
        [...userSockets.entries()]
      );

      console.log(
        "Total connected riders:",
        userSockets.size
      );

    } else {

      console.log(
        "❌ userSockets MAP DOES NOT EXIST"
      );
    }

    // ==================================================
    // FIND RIDER SOCKET
    // ==================================================

    const userSocketId =
      userSockets?.get(userId);

    console.log(
      "🔎 Searching socket for rider:",
      userId
    );

    console.log(
      "🔌 Found rider socket:",
      userSocketId
    );

    // ==================================================
    // RIDER SOCKET FOUND
    // ==================================================

    if (
      io &&
      userSockets &&
      userSocketId
    ) {

      console.log("\n=================================");
      console.log("📡 SENDING CAPTAIN ARRIVED");
      console.log("=================================");

      console.log(
        "Rider ID:",
        userId
      );

      console.log(
        "Rider Socket:",
        userSocketId
      );

      console.log(
        "Event:",
        "captain-arrived"
      );

      io.to(userSocketId).emit(
        "captain-arrived",
        {
          rideId: ride._id.toString(),

          captainId:
            ride.captain?.toString(),

          status:
            ride.status,
        }
      );

      console.log(
        "✅ captain-arrived event SENT"
      );

    } else {

      // ==================================================
      // SOCKET NOT FOUND
      // ==================================================

      console.log("\n=================================");
      console.log("⚠️ RIDER SOCKET NOT FOUND");
      console.log("=================================");

      console.log(
        "Rider ID:",
        userId
      );

      console.log(
        "Expected socket:",
        userSocketId || "NONE"
      );

      console.log(
        "IO available:",
        !!io
      );

      console.log(
        "userSockets available:",
        !!userSockets
      );

      if (userSockets) {

        console.log(
          "Current userSockets:",
          [...userSockets.entries()]
        );

        console.log(
          "Does rider exist in map:",
          userSockets.has(userId)
        );
      }

      console.log(
        "=================================\n"
      );
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    return res.status(200).json({
      success: true,
      message:
        "Captain has arrived at pickup location.",
      data: ride,
    });

  } catch (error) {

    console.error(
      "❌ Mark Ride Arrived Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================================================
// VERIFY OTP
// ==================================================

exports.verifyOTP =
  async (req, res) => {

    try {

      const {
        rideId,
      } = req.params;

      const {
        otp,
      } = req.body;

      if (!rideId) {
        return res.status(400).json({
          success: false,
          message:
            "Ride ID is required",
        });
      }

      if (!otp) {
        return res.status(400).json({
          success: false,
          message:
            "OTP is required",
        });
      }

      if (
        !req.captain ||
        !req.captain._id
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Captain authentication required.",
        });
      }

      const ride =
        await rideService.verifyOTP({
          rideId,
          otp,
          captainId:
            req.captain._id,
        });

      console.log(
        `✅ OTP verified for ride ${rideId}`
      );

      // ==================================================
      // NOTIFY RIDER
      // ==================================================

      const io =
        req.app.get("io");

      const userSockets =
        req.app.get("userSockets");

      const userId =
        ride.user.toString();

      const userSocketId =
        userSockets?.get(
          userId
        );

      if (
        io &&
        userSocketId
      ) {

        io.to(userSocketId).emit(
          "ride-started",
          {
            rideId:
              ride._id,

            status:
              ride.status,
          }
        );

        console.log(
          `✅ ride-started sent to rider ${userId}`
        );

      } else {

        console.log(
          `⚠️ User ${userId} does not have an active socket`
        );
      }

      return res.status(200).json({
        success: true,
        message:
          "OTP verified successfully. Ride started.",
        data: ride,
      });

    } catch (error) {

      console.error(
        "❌ Verify OTP Error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message,
      });
    }
  };

exports.completeRide = async (
  req,
  res
) => {
  try {
    const { rideId } = req.params;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "Ride ID is required",
      });
    }

    if (
      !req.captain ||
      !req.captain._id
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Captain authentication required",
      });
    }

    const captainId =
      req.captain._id;

    console.log(
      `🏁 Captain ${captainId} completing ride ${rideId}`
    );

    // ------------------------------------------
    // COMPLETE RIDE
    // ------------------------------------------

    const ride =
      await rideService.completeRide(
        rideId,
        captainId
      );

    console.log(
      `✅ Ride ${rideId} completed successfully`
    );

    // ------------------------------------------
    // SOCKET.IO
    // ------------------------------------------

    const io =
      req.app.get("io");

    const userSockets =
      req.app.get("userSockets");

    if (
      io &&
      userSockets &&
      ride.user
    ) {
      const userId =
        ride.user.toString();

      const userSocketId =
        userSockets.get(userId);

      if (userSocketId) {
        io.to(userSocketId).emit(
          "ride-completed",
          {
            rideId:
              ride._id.toString(),

            status:
              ride.status,

            fare:
              ride.fare,
          }
        );

        console.log(
          `📡 ride-completed sent to rider ${userId}`
        );
      } else {
        console.log(
          `⚠️ Rider ${userId} has no active socket`
        );
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Ride completed successfully",
      data: ride,
    });

  } catch (error) {

    console.error(
      "❌ Complete Ride Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message,
    });
  }
};