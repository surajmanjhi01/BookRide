const rideService = require("../services/ride.service");
const captainService = require("../services/captain.services");

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

    console.log("Ride created:", ride._id);

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
          rideId: ride._id,
          pickup: ride.pickup,
          destination: ride.destination,
          distance: ride.distance,
          duration: ride.duration,
          fare: ride.fare,
          vehicleType: ride.vehicleType,
        }
      );
    });

    // -----------------------------
    // Response to rider
    // -----------------------------

    return res.status(201).json({
      success: true,
      message: "Ride created successfully",
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