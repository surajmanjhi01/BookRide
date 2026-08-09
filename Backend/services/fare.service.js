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

  return {
    bike: Math.round(
      fares.bike.baseFare +
      distance * fares.bike.perKm +
      duration * fares.bike.perMin
    ),

    auto: Math.round(
      fares.auto.baseFare +
      distance * fares.auto.perKm +
      duration * fares.auto.perMin
    ),

    car: Math.round(
      fares.car.baseFare +
      distance * fares.car.perKm +
      duration * fares.car.perMin
    ),
  };
};