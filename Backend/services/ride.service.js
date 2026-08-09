const Ride = require("../models/ride.model");
const captainModel = require("../models/captain.model");
const fareService = require("../services/fare.service");
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

exports.createRide = async ({
  user,
  pickup,
  destination,
  distance,
  duration,
  vehicleType,
}) => {

  // Validate vehicle
  const allowedVehicles = ["bike", "auto", "car"];

  if (!allowedVehicles.includes(vehicleType)) {
    throw new Error("Invalid vehicle type");
  }

  // Calculate all fares
  const fares = fareService.calculateFare({
    distance,
    duration,
  });

  // Select fare for chosen vehicle
  const selectedFare = fares[vehicleType];

  const ride = await Ride.create({
    user,

    vehicleType,

    pickup,

    destination,

    distance,

    duration,

    fare: {
      baseFare:
        vehicleType === "bike"
          ? 30
          : vehicleType === "auto"
          ? 40
          : 70,

      distanceFare: 0,

      timeFare: 0,

      totalFare: selectedFare,
    },

    otp: generateOTP(),
  });

  return ride;
};

