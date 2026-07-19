const rideService = require("../services/ride.service");

exports.createRide = async (req, res) => {
    try {

        const {
            user,
            pickup,
            destination,
            distance,
            duration
        } = req.body;

        if (!user || !pickup || !destination) {
            return res.status(400).json({
                success: false,
                message: "User, pickup and destination are required."
            });
        }

        const ride = await rideService.createRide({
            user,
            pickup,
            destination,
            distance,
            duration
        });

        res.status(201).json({
            success: true,
            message: "Ride created successfully",
            data: ride
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};