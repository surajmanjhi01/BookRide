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
      returnDocument: "after",
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
      returnDocument: "after",
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
      returnDocument: "after"
    }
  );
  if (!ride) {
    throw new Error("Ride is no longer available or has already been completed.");
  }
  return ride;
};

exports.verifyOTP = async ({
  rideId,
  otp,
  captainId,
}) => {
  const ride = await Ride.findOne({
    _id: rideId,
    captain: captainId,
    status: "arrived",
  });

  if (!ride) {
    throw new Error("Ride is not available for OTP verification");
  }

  if (ride.otp !== otp) {
    throw new Error("Invalid OTP");
  }

  ride.status = "ongoing";
  await ride.save();

  return ride;
};

// ==================================================
// GET ACTIVE RIDE FOR A RIDER
// ==================================================

exports.getActiveRideForUser = async (userId) => {
  // Finds the rider's most recent ride that is still in progress.
  // "requested" is included so a page refresh can restore the
  // "Searching for Captain" state and keep listening for captains.
  // A stale abandoned ride (older than 6 hours and never
  // completed / cancelled) is ignored - same defensive rule as
  // the captain's active-ride endpoint.

  return Ride.findOne({
    user: userId,
    status: {
      $in: [
        "requested",
        "accepted",
        "arrived",
        "ongoing",
      ],
    },
    createdAt: {
      $gte: new Date(
        Date.now() - 6 * 60 * 60 * 1000
      ),
    },
  }).sort({ createdAt: -1 });
};

// ==================================================
// CANCEL RIDE  (RIDER)
// ==================================================

exports.cancelRide = async (
  rideId,
  userId
) => {
  // Atomically cancel only a ride that is still "requested".
  // Once a captain has accepted (or the ride was already
  // cancelled / completed), cancellation is rejected.

  const ride = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      user: userId,
      status: "requested",
    },
    {
      $set: {
        status: "cancelled",
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (!ride) {
    throw new Error(
      "Ride is no longer available or has already been accepted."
    );
  }

  return ride;
};

// ==================================================
// COMPLETE RIDE
// ==================================================

exports.completeRide = async (
  rideId,
  captainId
) => {
  const ride = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      captain: captainId,
      status: "ongoing",
    },
    {
      $set: {
        status: "completed",
      },
    },
    {
      returnDocument: "after",
    }
  );

  if (!ride) {
    throw new Error(
      "Ride is no longer available or has already been completed."
    );
  }

  return ride;
};

