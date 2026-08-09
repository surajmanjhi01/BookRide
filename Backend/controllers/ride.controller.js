const rideService = require("../services/ride.service");

exports.createRide = async (req, res) => {
  try {
    const {
      pickup,
      destination,
      distance,
      duration,
      vehicleType,
    } = req.body;

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
          "Pickup, destination, distance, duration and vehicle type are required.",
      });
    }

    const ride = await rideService.createRide({
      user: req.user._id,
      pickup,
      destination,
      distance,
      duration,
      vehicleType,
    });

    return res.status(201).json({
      success: true,
      message: "Ride created successfully",
      data: ride,
    });

  } catch (error) {
    console.error("Create Ride Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};