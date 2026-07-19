const Ride=require("../models/ride.model");
function generateOTP() {
    return Math.floor(1000+Math.random()*9000).toString();
}
exports.createRide=async({
    user,
    pickup,
    destination,
    distance=10,
    duration=20
})=>{
    const fare={
        baseFare: 50,
        distanceFare:100,
        timeFare:50,
        totalFare:200
    };
    const ride=await Ride.create({
        user,
        captain:null,
        pickup,
        destination,
        fare,
        distance,
        duration,
        otp:generateOTP()
    });
  return ride;
}