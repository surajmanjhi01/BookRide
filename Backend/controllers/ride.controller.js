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

    // -----------------------------
    // Validate request
    // -----------------------------

    if (
      !pickup ||
      !destination ||
      !distance ||
      !duration ||
      !vehicleType
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Pickup, destination, distance, duration and vehicleType are required.",
      });
    }

    // -----------------------------
    // Create ride
    // -----------------------------

    const ride = await rideService.createRide({
      user: req.user._id,
      pickup,
      destination,
      distance,
      duration,
      vehicleType,
    });

    console.log(
      "Ride created:",
      ride._id.toString()
    );

    // -----------------------------
    // Find nearby captains
    // -----------------------------

    const [longitude, latitude] =
      pickup.location.coordinates;

    const nearbyCaptains =
      await captainService.findNearbyCaptains(
        longitude,
        latitude,
        5000
      );

    console.log(
      "Nearby captains:",
      nearbyCaptains.length
    );

    // -----------------------------
    // Get Socket.IO objects
    // -----------------------------

    const io = req.app.get("io");

    const captainSockets =
      req.app.get("captainSockets");

    // -----------------------------
    // Send ride request
    // -----------------------------

    nearbyCaptains.forEach((captain) => {
      const captainId =
        captain._id.toString();

      const socketId =
        captainSockets.get(captainId);

      if (!socketId) {
        console.log(
          `Captain ${captainId} has no active socket`
        );

        return;
      }

      console.log(
        `Sending ride request to captain ${captainId}`
      );

      io.to(socketId).emit(
        "new-ride-request",
        {
          rideId: ride._id.toString(),

          pickup: ride.pickup,

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
        }
      );
    });

    // -----------------------------
    // Response to rider
    // -----------------------------

    return res.status(201).json({
      success: true,
      message:
        "Ride created successfully",
      data: ride,
    });

  } catch (error) {
    console.error(
      "Create Ride Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



exports.acceptRide = async (req, res) => {
  try {

    const { rideId } = req.params;

    // authCaptain middleware gives us this
    const captainId = req.captain._id;

    console.log(
      `Captain ${captainId} attempting to accept ride ${rideId}`
    );

    // ------------------------------------------
    // Accept ride atomically
    // ------------------------------------------

    const ride =
      await rideService.acceptRide(
        rideId,
        captainId
      );

    console.log(
      `Ride ${rideId} accepted by captain ${captainId}`
    );

    // ------------------------------------------
    // Socket.IO
    // ------------------------------------------

    const io = req.app.get("io");

    const userSockets =
      req.app.get("userSockets");

    if (io && userSockets) {

      const userId =
        ride.user.toString();

      const userSocketId =
        userSockets.get(userId);

      if (userSocketId) {

        console.log(
          `Sending ride-accepted to user ${userId}`
        );

        io.to(userSocketId).emit(
          "ride-accepted",
          {
            rideId: ride._id,
            captainId: captainId,
            status: ride.status,
            captain: {
              id: req.captain._id,
              fullname: req.captain.fullname,
              vehicle: req.captain.vehicle,
            },
          }
        );

      } else {

        console.log(
          `User ${userId} does not have an active socket`
        );

      }
    }

    // ------------------------------------------
    // Response
    // ------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Ride accepted successfully",
      data: ride,
    });

  } catch (error) {

    console.error(
      "Accept Ride Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================================================
// REJECT RIDE
// ==================================================

exports.rejectRide = async (req, res) => {
    try {
        const { rideId } = req.params;

        // authCaptain middleware gives us this
        const captainId = req.captain._id;

        if (!rideId) {
            return res.status(400).json({
                success: false,
                message: "Ride ID is required",
            });
        }

        const ride = await rideService.rejectRide(rideId, captainId);

        return res.status(200).json({
            success: true,
            message: "Ride rejected successfully",
            data: ride,
        });

    } catch (error) {
        console.error("Reject Ride Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.markRideArrived = async (req, res) => {
  try {
    const { rideId } = req.params;

    const captainId = req.captain._id;

    const ride = await rideService.markRideArrived(
      rideId,
      captainId
    );

    console.log(
      `Captain ${captainId} arrived for ride ${rideId}`
    );

    // --------------------------------
    // Notify rider through Socket.IO
    // --------------------------------

    const io = req.app.get("io");

    if (io && ride.user) {
      io.to(`user:${ride.user.toString()}`).emit(
        "captain-arrived",
        {
          rideId: ride._id,
          captainId: ride.captain,
          status: ride.status,
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Captain has arrived at pickup location.",
      data: ride,
    });

  } catch (error) {
    console.error(
      "Mark Ride Arrived Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required",
      });
    }

    const ride = await rideService.verifyOTP({
      rideId,
      otp,
      captainId: req.captain._id,
    });

    // Socket.IO
    const io = req.app.get("io");

    // Notify rider that ride has started
    io.to(`user:${ride.user.toString()}`).emit(
      "ride-started",
      {
        rideId: ride._id,
        status: ride.status,
      }
    );

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. Ride started.",
      data: ride,
    });

  } catch (error) {
    console.error("Verify OTP Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};