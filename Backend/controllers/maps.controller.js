const mapsService = require("../services/maps.service");

exports.getCoordinates = async (req, res) => {
    try {
        const { address } = req.query;

        if (!address) {
            return res.status(400).json({
                success: false,
                message: "Address is required"
            });
        }

        const coordinates = await mapsService.getCoordinates(address);

        res.status(200).json({
            
            success: true,
            data: coordinates
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};

exports.getDistanceAndTime = async (req, res) => {
    try {
        const { pickup, destination } = req.body;

        if (!pickup || !destination) {
            return res.status(400).json({
                success: false,
                message: "Pickup and destination are required"
            });
        }

        const result = await mapsService.getDistanceAndTime(
            pickup,
            destination
        );

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.getFare = async (req, res) => {

    try {

        const { pickup, destination } = req.body;

        if (!pickup || !destination) {
            return res.status(400).json({
                success: false,
                message: "Pickup and destination are required"
            });
        }

        const result = await mapsService.getFare(
            pickup,
            destination
        );

        res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

};