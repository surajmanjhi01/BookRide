exports.calculateFare = ({ distance, duration }) => {
  const fares = {
    bike: {
      baseFare: 30,
      perKm: 8,
      perMin: 1,
    },

    auto: {
      baseFare: 40,
      perKm: 15,
      perMin: 2,
    },

    car: {
      baseFare: 70,
      perKm: 15,
      perMin: 2,
    },
  };

  const calculate = (vehicle) => {
    return Math.round(
      vehicle.baseFare +
        distance * vehicle.perKm +
        duration * vehicle.perMin
    );
  };

  return {
    bike: calculate(fares.bike),
    auto: calculate(fares.auto),
    car: calculate(fares.car),
  };
};


// Used when creating the actual ride
exports.calculateVehicleFare = ({
  distance,
  duration,
  vehicleType,
}) => {
  const fares = {
    bike: {
      baseFare: 30,
      perKm: 8,
      perMin: 1,
    },

    auto: {
      baseFare: 40,
      perKm: 15,
      perMin: 2,
    },

    car: {
      baseFare: 70,
      perKm: 15,
      perMin: 2,
    },
  };

  const vehicle = fares[vehicleType];

  if (!vehicle) {
    throw new Error("Invalid vehicle type");
  }

  const distanceFare =
    distance * vehicle.perKm;

  const timeFare =
    duration * vehicle.perMin;

  const totalFare = Math.round(
    vehicle.baseFare +
      distanceFare +
      timeFare
  );

  return {
    baseFare: vehicle.baseFare,
    distanceFare: Math.round(distanceFare),
    timeFare: Math.round(timeFare),
    totalFare,
  };
};