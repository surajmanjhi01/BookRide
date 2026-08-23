import React from "react";

const VehiclePanel = ({
  fare,
  selectedVehicle,
  setSelectedVehicle,
  createRide,
}) => {
  if (!fare) return null;

  const vehicles = [
    {
      type: "bike",
      title: "Bike",
      icon: "🏍️",
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

  // ==========================================
  // CONFIRM RIDE
  // ==========================================

  const handleConfirmRide = () => {
    console.log("=================================");
    console.log("🚕 CONFIRM RIDE CLICKED");
    console.log("Selected vehicle:", selectedVehicle);
    console.log("=================================");

    // No vehicle selected
    if (!selectedVehicle) {
      alert("Please select a vehicle first.");
      return;
    }

    console.log(
      "✅ Calling createRide() for:",
      selectedVehicle
    );

    createRide();
  };

  return (
    <div className="w-full">

      {/* HEADER */}
      <h2 className="text-2xl font-bold mb-4">
        Choose a Ride
      </h2>

      {/* VEHICLES */}
      {vehicles.map((vehicle) => (
        <div
          key={vehicle.type}
          onClick={() => {
            console.log(
              "Vehicle selected:",
              vehicle.type
            );

            setSelectedVehicle(vehicle.type);
          }}
          className={`border rounded-xl p-4 mb-3 flex justify-between items-center cursor-pointer transition
          ${
            selectedVehicle === vehicle.type
              ? "border-black bg-gray-100"
              : "border-gray-300"
          }`}
        >

          {/* VEHICLE INFO */}
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

          {/* PRICE */}
          <div className="text-xl font-bold">
            ₹{vehicle.price}
          </div>

        </div>
      ))}

      {/* =====================================
          CONFIRM RIDE BUTTON
      ====================================== */}

      <button
        type="button"
        onClick={handleConfirmRide}
        disabled={!selectedVehicle}
        className={`w-full py-4 rounded-xl text-lg font-semibold mt-4 transition
          ${
            selectedVehicle
              ? "bg-black text-white hover:bg-gray-800"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
      >
        {selectedVehicle
          ? `Confirm ${selectedVehicle.toUpperCase()} Ride`
          : "Select a Vehicle"}
      </button>

    </div>
  );
};

export default VehiclePanel;