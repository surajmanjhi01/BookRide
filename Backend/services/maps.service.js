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

const mapsService = require("../services/maps.service");

exports.getDistanceAndTime = async (pickup, destination) => {
    try {
        const response = await axios.post(
            "https://api.openrouteservice.org/v2/directions/driving-car",
            {
                coordinates: [
                    [pickup.lng, pickup.lat],
                    [destination.lng, destination.lat]
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
            distance: Number((summary.distance / 1000).toFixed(2)),
            duration: Number((summary.duration / 60).toFixed(2))
        };

    } catch (error) {
        throw new Error(
            error.response?.data?.error?.message || error.message
        );
    }
};
const fareService = require("../services/fare.service");

exports.getFare=async(pickup,destination)=>{
    const route=await exports.getDistanceAndTime(pickup,destination);
    const fare=fareService.calculateFare({
        distance:route.distance,
        duration:route.duration
    });
    console.log("Fare calculated:", fare);
    return{
        distance:route.distance,
        duration:route.duration,
        fare
    };    
};