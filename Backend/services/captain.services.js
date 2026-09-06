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
      const hasSocket = Boolean(captain.socketId);
      const coords = captain.location?.coordinates;
      const hasValidLocation =
        Array.isArray(coords) &&
        coords.length === 2 &&
        !(coords[0] === 0 && coords[1] === 0);

      if (!hasSocket) {
        console.warn(
          `⚠️ Captain ${captain._id.toString()} is active but has NO socket connection – rides will NOT reach them until the captain page is reopened/reconnected.`
        );
      }

      if (!hasValidLocation) {
        console.warn(
          `⚠️ Captain ${captain._id.toString()} is active but has NO valid GPS location (currently ${JSON.stringify(
            coords || null
          )}). Enabling location (or the schema default [0,0] which must be overwritten by the browser GPS) is required before any ride requests can be sent to them.`
        );
      }
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

    // -----------------------------------------------
    // Exclude captains whose stored location is the
    // schema default [0, 0] or missing entirely.
    //
    // A captain stuck at [0,0] means the browser GPS
    // never delivered a reading, so the captain would
    // silently never receive requests. Filtering them
    // here (and warning above) makes the problem visible
    // instead of sending ride requests to a bogus point.
    // -----------------------------------------------

    const validCaptains =
      captains.filter((captain) => {
        const coords =
          captain.location?.coordinates;

        if (
          !Array.isArray(coords) ||
          coords.length !== 2
        ) {
          return false;
        }

        return !(
          coords[0] === 0 &&
          coords[1] === 0
        );
      });

    console.log(
      "🚕 Nearby captains:",
      validCaptains.length
    );

    validCaptains.forEach((captain) => {
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

    return validCaptains;

  } catch (error) {
    console.error(
      "❌ Find Nearby Captains Error:",
      error
    );

    throw new Error(error.message);
  }
};

