const captain = require("../models/capatain.model");

exports.updateLocation = async (
    captainId,
    latitude,
    longitude
) => {

    return await captain.findByIdAndUpdate(
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
            new: true
        }
    );
};
exports.getCaptainsInRadius = async (
    longitude,
    latitude,
    radius
) => {

    return await Captain.find({
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