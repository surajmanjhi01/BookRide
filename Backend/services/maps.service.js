const axios = require("axios");

exports.getCoordinates = async (address) => {
    try {

        const response = await axios.get(
            "https://api.openrouteservice.org/geocode/search",
            {
                params: {
                    api_key: process.env.ORS_API_KEY,
                    text: address
                }
            }
        );

        if (!response.data.features.length) {
            throw new Error("Address not found");
        }

        const coordinates =
            response.data.features[0].geometry.coordinates;

        return {
            longitude: coordinates[0],
            latitude: coordinates[1]
        };

    } catch (error) {
        throw new Error(error.message);
    }
};

exports.getDistanceAndTime = async (origin, destination) => {
    try {

        // Convert addresses to coordinates
        const originCoordinates = await exports.getCoordinates(origin);
        const destinationCoordinates = await exports.getCoordinates(destination);

        const response = await axios.post(
            "https://api.openrouteservice.org/v2/directions/driving-car",
            {
                coordinates: [
                    [
                        originCoordinates.longitude,
                        originCoordinates.latitude
                    ],
                    [
                        destinationCoordinates.longitude,
                        destinationCoordinates.latitude
                    ]
                ]
            },
            {
                headers: {
                    Authorization: process.env.ORS_API_KEY,
                    "Content-Type": "application/json"
                }
            }
        );

        const summary = response.data.routes[0].summary;

        return {
            distance: Number((summary.distance / 1000).toFixed(2)), // km
            duration: Number((summary.duration / 60).toFixed(2))    // minutes
        };

   } catch (error) {
  console.error("ORS error:", {
    url: error.config?.url,
    status: error.response?.status,
    data: error.response?.data
  });

  throw new Error(
    error.response?.data?.error?.message || error.message
  );
}
};