import React, { useState, useRef ,useEffect } from "react";
import LocationSearchPanel from "../components/LocationSearchPanel";
import api from "../services/axios";
import MapView from "../components/MapView";
import gsap from "gsap";
import polyline from "@mapbox/polyline";
import { useGSAP } from "@gsap/react";
import VechilePanel from "../components/VehiclePanel";


gsap.registerPlugin(useGSAP);

const Home = () => {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);
  const [activeField, setActiveField] = useState("");
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const[routeCoordinates,setRouteCoordinates]=useState([]);
  const [fare, setFare] = useState(null);
  const[selectedVehicle, setSelectedVehicle] = useState(null);
  const panelRef = useRef(null);
  const bottomSheetRef = useRef(null);

useGSAP(() => {
  if (panelOpen) {
    // Location suggestions panel
    gsap.to(panelRef.current, {
      y: 0,
      duration: 0.4,
      ease: "power2.out",
    });

    // Search panel open
    gsap.to(bottomSheetRef.current, {
      height: "40vh",
      duration: 0.4,
    });

  } else {
    // Hide location suggestions
    gsap.to(panelRef.current, {
      y: "100%",
      duration: 0.4,
      ease: "power2.in",
    });

    // Change height depending on whether fare exists
    gsap.to(bottomSheetRef.current, {
      height: fare ? "55vh" : "28vh",
      duration: 0.4,
      ease: "power2.out",
    });
  }
}, [panelOpen, fare]);

  // Search Pickup Locations
  const searchPickup = async (query) => {
    if (!query) {
      setPickupSuggestions([]);
      return;
    }

    try {
      const token = localStorage.getItem("user");
      const response = await api.get(`/api/maps/search?query=${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setPickupSuggestions(response.data.data);
      console.log("Pickup Suggestions:", response.data.data);
    } catch (error) {
      console.error(error);
    }
  };
  const searchDestination = async (query) => {
    if (!query) {
      setDestinationSuggestions([]);
      return;
    }

    try {
      const token = localStorage.getItem("user");

      const response = await api.get(`/api/maps/search?query=${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setDestinationSuggestions(response.data.data);

      console.log("Destination Suggestions:", response.data.data);
    } catch (error) {
      console.error(error);
    }
  };
  const handleLocationSelect = (place) => {
    console.log("Selected Place:", place); 
    if (activeField === "pickup") {
      setPickup(place.address);

      setPickupCoordinates({
        lat: place.latitude,
        lng: place.longitude,
      });
    } else {
      setDestination(place.address);

      setDestinationCoordinates({
        lat: place.latitude,
        lng: place.longitude,
      });
    }

    setPanelOpen(false);
  };
 const getDistanceTime = async () => {
  try {
    const response = await api.post(
      "/api/maps/distance-time",
      {
        pickup: pickupCoordinates,
        destination: destinationCoordinates,
      },
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("user")}`,
        },
      }
    );

    console.log(response.data.data);

    const data = response.data.data;

    setDistance(data.distance);
    setDuration(data.duration);

    const decoded = polyline.decode(data.geometry);
    console.log("Decoded:", decoded);

    const coordinates = decoded.map(([lat, lng]) => [
      lng,
      lat,
    ]);
    console.log("Coordinates:", coordinates);

    setRouteCoordinates(coordinates);

    getFare();

  } catch (error) {
    console.error("Distance request failed:", error.response?.data || error);
  }
};
  const getFare = async () => {
    try {
      const response = await api.post(
        "/api/maps/fare",
        { pickup: pickupCoordinates, destination: destinationCoordinates },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("user")}`,
          },
        }
      );

      console.log("Fare Response:", response.data);
      setFare(response.data.data.fare);
    } catch (error) {
      console.error("Fare request failed:", error.response?.data || error);
    }
  };
  //Create Ride
 const Ride = require("../models/ride.model");
const fareService = require("../services/fare.service");

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

exports.createRide = async ({
  user,
  pickup,
  destination,
  distance,
  duration,
  vehicleType,
}) => {

  const fares = fareService.calculateFare({
    distance,
    duration,
  });

  let selectedFare;

  if (vehicleType === "bike") {
    selectedFare = fares.bike;
  } else if (vehicleType === "auto") {
    selectedFare = fares.auto;
  } else if (vehicleType === "car") {
    selectedFare = fares.car;
  } else {
    throw new Error("Invalid vehicle type");
  }

  const ride = await Ride.create({
    user,

    vehicleType,

    pickup: {
      address: pickup.address,
      location: {
        type: "Point",
        coordinates: [
          pickup.lng,
          pickup.lat,
        ],
      },
    },

    destination: {
      address: destination.address,
      location: {
        type: "Point",
        coordinates: [
          destination.lng,
          destination.lat,
        ],
      },
    },

    distance,

    duration,

    fare: {
      baseFare: 0,
      distanceFare: 0,
      timeFare: 0,
      totalFare: selectedFare,
    },

    otp: generateOTP(),
  });

  return ride;
};
  useEffect(() => {
    if (pickupCoordinates && destinationCoordinates) {
      getDistanceTime();
    }
  }, [pickupCoordinates, destinationCoordinates]);
  return (
    <div className="h-screen w-full relative overflow-hidden bg-gray-100">
      {/* Map Placeholder */}
      <div className="h-full w-full">

 <MapView
    pickupCoordinates={pickupCoordinates}
    destinationCoordinates={destinationCoordinates}
    routeCoordinates={routeCoordinates}
    setPickupCoordinates={setPickupCoordinates}
    setDestinationCoordinates={setDestinationCoordinates}
/>

</div>

      {/* Search Panel */}
      <div
        ref={panelRef}
        className="absolute bottom-0 left-0 w-full h-[45vh] bg-white rounded-t-3xl shadow-lg translate-y-full z-20 overflow-y-auto"
      >
        <LocationSearchPanel
          locations={
            activeField === "pickup"
              ? pickupSuggestions
              : destinationSuggestions
          }
          onSelectLocation={handleLocationSelect}
        />
      </div>

      {/* Bottom Sheet */}
     <div
  ref={bottomSheetRef}
  className="absolute bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-xl p-5 z-30"
>
  {fare ? (
    <VehiclePanel
      fare={fare}
      selectedVehicle={selectedVehicle}
      setSelectedVehicle={setSelectedVehicle}
      createRide={createRide}
    />
  ) : (
    <>
      <h2 className="text-2xl font-bold mb-5">
        Where to?
      </h2>

      <div className="absolute left-8 top-[96px] w-1 h-16 bg-gray-800 rounded-full"></div>

      <input
        type="text"
        placeholder="Enter Pickup Location"
        value={pickup}
        onChange={(e) => {
          setPickup(e.target.value);
          searchPickup(e.target.value);
        }}
        onFocus={() => {
          setPanelOpen(true);
          setActiveField("pickup");
        }}
        className="w-full border rounded-lg px-4 py-3 mb-3 outline-none"
      />

      <input
        type="text"
        placeholder="Enter Destination"
        value={destination}
        onChange={(e) => {
          setDestination(e.target.value);
          searchDestination(e.target.value);
        }}
        onFocus={() => {
          setPanelOpen(true);
          setActiveField("destination");
        }}
        className="w-full border rounded-lg px-4 py-3 outline-none"
      />
    </>
  )}
</div>
           
    </div> 
  );
};

export default Home;
