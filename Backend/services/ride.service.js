const Ride = require("../models/ride.model");
const fareService = require("./fare.service");

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}


// ==================================================
// CREATE RIDE
// ==================================================

exports.createRide = async ({
  user,
  pickup,
  destination,
  distance,
  duration,
  vehicleType,
}) => {

  if (!["bike", "auto", "car"].includes(vehicleType)) {
    throw new Error("Invalid vehicle type");
  }

  const fare = fareService.calculateVehicleFare({
    distance,
    duration,
    vehicleType,
  });

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


// ==================================================
// ACCEPT RIDE
// ==================================================

exports.acceptRide = async (
  rideId,
  captainId
) => {

  /*
   * IMPORTANT:
   *
   * Only a ride whose status is "requested"
   * can be accepted.
   *
   * MongoDB performs this condition atomically.
   */

  const ride = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      status: "requested",
    },
    {
      $set: {
        captain: captainId,
        status: "accepted",
      },
    },
    {
      new: true,
    }
  );

  if (!ride) {
    throw new Error(
      "Ride is no longer available"
    );
  }

  return ride;
};
// Captain rejects a ride
exports.rejectRide = async (rideId, captainId) => {
  // Atomically find the requested ride and ensure
  // it has not already been accepted/cancelled.
  const ride = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      status: "requested",
      captain: null,
    },
    {
      $addToSet: {
        rejectedBy: captainId,
      },
    },
    {
      new: true,
    }
  );

  if (!ride) {
    throw new Error(
      "Ride is no longer available or has already been accepted."
    );
  }

  return ride;
};
//captain marks the ride is arrived
exports.markRideArrived=async(rideId,captainId)=>{
  const ride=await Ride.findOneAndUpdate(
    {
      _id:rideId,
      captain:captainId,
      status:"accepted"
    },
    {
      $set: {
        status: "arrived"
      }
    },
    {
      new: true
    }
  );
  if (!ride) {
    throw new Error("Ride is no longer available or has already been completed.");
  }
  return ride;
};

exports.verifyOTP=async({
  rideid,
  otp,
  captainId,
})=>{
  const ride=await Ride.findOne({
    _id:rideId,
    capatan:capatainId,
    stAtus:"arrived",
  });
  if(!ride){
    throw new Error("Ride is not available for otp verification");
}
if(ride.otp!==otp){
  throw new Error("Invalid OTP");
}
ride.status="ongoing";
awaitride.save();
return ride;
};