const axios = require("axios");

exports.getCoordinates = async (address) => {
    try {

        const response = await axios.get(
            "https://api.heigit.org/pelias/v1/search",
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
            "https://api.heigit.org/openrouteservice/v2/directions/driving-car",
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
            duration: Number((summary.duration / 60).toFixed(2)),
            geometry: response.data.routes[0].geometry
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

exports.searchPlaces=async(query)=>{
    let response;

    try {
        response = await axios.get(
            "https://api.heigit.org/pelias/v1/search",
            {
                params:{
                    api_key:process.env.ORS_API_KEY,
                    text:query
                }
            }
        );
    } catch (error) {
        const status = error.response?.status || 500;
        const detail =
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            error.message;

        const err = new Error(
            `OpenRouteService search failed (${status}): ${detail}`
        );
        err.status = status;
        throw err;
    }

    return response.data.features.map(place=>({
        name:place.properties.name||place.properties.label,
        address:place.properties.label,
        latitude:place.geometry.coordinates[1],
        longitude:place.geometry.coordinates[0]
    }));
};

exports.reverseGeocode=async(lat,lng)=>{
    try{
        const response= await axios.get(
            "https://api.heigit.org/pelias/v1/reverse",
            {
                params:{
                    api_key:process.env.ORS_API_KEY,
                    "point.lon": lng,
                    "point.lat": lat
                }
            }
        );

        const feature= response.data.features?.[0];

        if(!feature){
            return null;
        }

        return {
            name: feature.properties.name || feature.properties.label,
            address:
                feature.properties.label ||
                feature.properties.name ||
                "Selected location"
        };

    } catch (error) {
        const status = error.response?.status || 500;
        const detail =
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            error.message;

        const err = new Error(
            `OpenRouteService reverse geocode failed (${status}): ${detail}`
        );
        err.status = status;
        throw err;
    }
};