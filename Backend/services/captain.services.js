const captainModel = require("../models/captain.model");

// ==================================================
// UPDATE CAPTAIN LOCATION
// ==================================================

exports.updateLocation = async (
  captainId,
  longitude,
  latitude
) => {
  try {
    const captain =
      await captainModel.findByIdAndUpdate(
        captainId,
        {
          location: {
            type: "Point",

            // GeoJSON format:
            // [longitude, latitude]
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
      throw new Error("Captain not found");
    }

    console.log(
      "📍 Captain location saved:",
      captain.location.coordinates
    );

    return captain;

  } catch (error) {
    console.error(
      "❌ Update Captain Location Error:",
      error
    );

    throw new Error(error.message);
  }
};


// ==================================================
// GET CAPTAINS IN RADIUS
// ==================================================

exports.getCaptainsInRadius = async (
  longitude,
  latitude,
  radius
) => {
  try {
    return await captainModel.find({
      status: "active",

      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [
              longitude,
              latitude,
            ],
          },

          $maxDistance: radius,
        },
      },
    });

  } catch (error) {
    console.error(
      "❌ Get Captains In Radius Error:",
      error
    );

    throw new Error(error.message);
  }
};


// ==================================================
// FIND NEARBY CAPTAINS
// ==================================================

exports.findNearbyCaptains = async (
  lng,
  lat,
  maxDistance = 5000
) => {
  try {
    console.log("=================================");
    console.log("🔎 FINDING NEARBY CAPTAINS");
    console.log("Ride longitude:", lng);
    console.log("Ride latitude:", lat);
    console.log("Max distance:", maxDistance);
    console.log("=================================");

    // -----------------------------------------------
    // Find all active captains
    // -----------------------------------------------

    const activeCaptains =
      await captainModel.find({
        status: "active",
      });

    console.log(
      "🟢 Active captains:",
      activeCaptains.length
    );

    activeCaptains.forEach((captain) => {
      console.log(
        "Captain:",
        captain._id.toString()
      );

      console.log(
        "Status:",
        captain.status
      );

      console.log(
        "Socket:",
        captain.socketId
      );

      console.log(
        "Location:",
        captain.location
      );
    });

    // -----------------------------------------------
    // Find nearby active captains
    // -----------------------------------------------

    const captains =
      await captainModel.find({
        status: "active",

        socketId: {
          $ne: null,
        },

        location: {
          $near: {
            $geometry: {
              type: "Point",

              // GeoJSON:
              // [longitude, latitude]
              coordinates: [
                lng,
                lat,
              ],
            },

            $maxDistance: maxDistance,
          },
        },
      });

    console.log(
      "🚕 Nearby captains:",
      captains.length
    );

    captains.forEach((captain) => {
      console.log(
        "Nearby Captain:",
        captain._id.toString()
      );

      console.log(
        "Captain Location:",
        captain.location.coordinates
      );

      console.log(
        "Captain Socket:",
        captain.socketId
      );
    });

    return captains;

  } catch (error) {
    console.error(
      "❌ Find Nearby Captains Error:",
      error
    );

    throw new Error(error.message);
  }
};