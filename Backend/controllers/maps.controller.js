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

exports.searchPlaces=async(req,res)=>{
    try{
        const{query}=req.query;
        if(!query){
            return res.status(400).json({
                success:false,
                message:"Query is required"
            })
        }
        const places=await mapsService.searchPlaces(query);
        res.status(200).json({
            success:true,
            data:places
        });
    } catch (error) {
        res.status(error.status || 500).json({
            success: false,
            message: error.message
        });
    }
}

exports.reverseGeocode = async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (lat === undefined || lng === undefined) {
            return res.status(400).json({
                success: false,
                message: "Latitude and longitude are required"
            });
        }

        const result = await mapsService.reverseGeocode(
            Number(lat),
            Number(lng)
        );

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.message
        });
    }
}