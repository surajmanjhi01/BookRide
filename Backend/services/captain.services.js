const captainModel = require("../models/captain.model");

exports.updateLocation = async (
  captainId,
  latitude,
  longitude
) => {
  return await captainModel.findByIdAndUpdate(
    captainId,
    {
      location: {
        type: "Point",
        coordinates: [
          longitude,
          latitude
        ]
      }
    },
    {
      returnDocument: "after"
    }
  );
};


exports.getCaptainsInRadius = async (
  longitude,
  latitude,
  radius
) => {
  return await captainModel.find({
    status: "active",

    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [
            longitude,
            latitude
          ]
        },

        $maxDistance: radius
      }
    }
  });
};

exports.findNearbyCaptains = async (
    lng,
    lat,
    maxDistance = 5000
) => {
    try {
        const captains = await captainModel.find({
            status: "active",

            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat],
                    },
                    $maxDistance: maxDistance,
                },
            },
        });

        return captains;
    } catch (error) {
        throw new Error(error.message);
    }
};