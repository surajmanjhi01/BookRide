import React from "react";

const VehiclePanel = ({
  fare,
  selectedVehicle,
  setSelectedVehicle,
}) => {
  if (!fare) return null;

  const vehicles = [
    {
      type: "bike",
      title: "Bike",
      icon: "🏍",
      eta: "3 min",
      price: fare.bike,
    },
    {
      type: "auto",
      title: "Auto",
      icon: "🛺",
      eta: "4 min",
      price: fare.auto,
    },
    {
      type: "car",
      title: "Car",
      icon: "🚗",
      eta: "5 min",
      price: fare.car,
    },
  ];

  return (
    <div className="w-full">

      <h2 className="text-2xl font-bold mb-4">
        Choose a Ride
      </h2>

      {vehicles.map((vehicle) => (

        <div
          key={vehicle.type}
          onClick={() =>
            setSelectedVehicle(vehicle.type)
          }
          className={`border rounded-xl p-4 mb-3 flex justify-between items-center cursor-pointer transition
          ${
            selectedVehicle === vehicle.type
              ? "border-black bg-gray-100"
              : "border-gray-300"
          }`}
        >

          <div className="flex items-center gap-4">

            <div className="text-3xl">
              {vehicle.icon}
            </div>

            <div>
              <h3 className="font-semibold">
                {vehicle.title}
              </h3>

              <p className="text-gray-500 text-sm">
                {vehicle.eta}
              </p>
            </div>

          </div>

          <div className="text-xl font-bold">
            ₹{vehicle.price}
          </div>

        </div>

      ))}

    </div>
  );
};

export default VehiclePanel;