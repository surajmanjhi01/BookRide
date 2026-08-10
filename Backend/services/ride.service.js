const Ride = require("../models/ride.model");
const fareService = require("./fare.service");

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
  // Validate vehicle type
  if (!["bike", "auto", "car"].includes(vehicleType)) {
    throw new Error("Invalid vehicle type");
  }

  // Calculate fare for the selected vehicle
  const fare = fareService.calculateVehicleFare({
    distance,
    duration,
    vehicleType,
  });

  // Create ride
  const ride = await Ride.create({
    user,

    vehicleType,

    pickup,

    destination,

    distance,

    duration,

    fare,

    otp: generateOTP(),

    status: "requested",

    paymentStatus: "pending",
  });

  return ride;
};