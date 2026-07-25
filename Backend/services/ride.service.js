const Ride=require("../models/ride.model");
const fareService=require("../services/fare.service");
function generateOTP() {
    return Math.floor(1000+Math.random()*9000).toString();
}
exports.createRide = async ({
    user,
    pickup,
    destination,
    distance,
    duration
}) => {

    const fares = fareService.calculateFare({
        distance,
        duration
    });

    const ride = await Ride.create({

        user,

        pickup,

        destination,

        distance,

        duration,

        fare: {
            baseFare: 0,
            distanceFare: 0,
            timeFare: 0,
            totalFare: fares.car
        },

        otp: generateOTP()

    });

    return ride;
};