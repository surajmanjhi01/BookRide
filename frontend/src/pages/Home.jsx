import React, { useState, useRef, useEffect } from "react";
import LocationSearchPanel from "../components/LocationSearchPanel";
import VehiclePanel from "../components/VehiclePanel";
import api from "../services/axios";
import MapView from "../components/MapView";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import polyline from "@mapbox/polyline";

gsap.registerPlugin(useGSAP);

const Home = () => {
  // =========================
  // LOCATION STATES
  // =========================
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);

  const [pickupCoordinates, setPickupCoordinates] = useState(null);
  const [destinationCoordinates, setDestinationCoordinates] = useState(null);

  const [activeField, setActiveField] = useState("");
  //Captain Location 
  const [captainLocation, setCaptainLocation] = useState(null);
  // =========================
  // RIDE STATES
  // =========================
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  const [fare, setFare] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // =========================
  // UI STATES
  // =========================
  const [panelOpen, setPanelOpen] = useState(false);

  // =========================
  // REFS
  // =========================
  const panelRef = useRef(null);
  const bottomSheetRef = useRef(null);
   //for socket connection
   socket.on("captain-location", (data)=>{
    setCaptainLocation({
      latitude:data.latitude,
      longitude:data.longitude, 
    });
   }); 
  // ============================================================
  // GSAP ANIMATION
  // ============================================================

  useGSAP(
    () => {
      const panel = panelRef.current;
      const bottomSheet = bottomSheetRef.current;

      if (!panel || !bottomSheet) return;

      // --------------------------------
      // LOCATION SEARCH PANEL
      // --------------------------------
      if (panelOpen) {
        gsap.to(panel, {
          y: 0,
          duration: 0.45,
          ease: "power3.out",
        });
      } else {
        gsap.to(panel, {
          y: "100%",
          duration: 0.4,
          ease: "power3.inOut",
        });
      }

      let targetHeight = "28vh";

      // When location search is open
      if (panelOpen) {
        targetHeight = "40vh";
      }

      // When fare is available
      if (fare && !panelOpen) {
        targetHeight = "55vh";
      }

      gsap.to(bottomSheet, {
        height: targetHeight,
        duration: 0.45,
        ease: "power3.inOut",
      });
    },
    {
      dependencies: [panelOpen, fare],
    },
  );

  // ============================================================
  // SEARCH PICKUP
  // ============================================================

  const searchPickup = async (query) => {
    if (!query.trim()) {
      setPickupSuggestions([]);
      return;
    }

    try {
      const token = localStorage.getItem("user");

      const response = await api.get(
        `/api/maps/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setPickupSuggestions(response.data.data || []);
    } catch (error) {
      console.error("Pickup search failed:", error.response?.data || error);
    }
  };

  // ============================================================
  // SEARCH DESTINATION
  // ============================================================

  const searchDestination = async (query) => {
    if (!query.trim()) {
      setDestinationSuggestions([]);
      return;
    }

    try {
      const token = localStorage.getItem("user");

      const response = await api.get(
        `/api/maps/search?query=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setDestinationSuggestions(response.data.data || []);
    } catch (error) {
      console.error(
        "Destination search failed:",
        error.response?.data || error,
      );
    }
  };

  // ============================================================
  // SELECT LOCATION
  // ============================================================

  const handleLocationSelect = (place) => {
    console.log("Selected Place:", place);

    if (activeField === "pickup") {
      setPickup(place.address);

      setPickupCoordinates({
        lat: Number(place.latitude),
        lng: Number(place.longitude),
      });

      setPickupSuggestions([]);
    }

    if (activeField === "destination") {
      setDestination(place.address);

      setDestinationCoordinates({
        lat: Number(place.latitude),
        lng: Number(place.longitude),
      });

      setDestinationSuggestions([]);
    }

    // Close search panel
    setPanelOpen(false);
  };

  // ============================================================
  // GET DISTANCE + TIME
  // ============================================================

  const getDistanceTime = async () => {
    if (!pickupCoordinates || !destinationCoordinates) {
      return;
    }

    try {
      const token = localStorage.getItem("user");

      const response = await api.post(
        "/api/maps/distance-time",
        {
          pickup: pickupCoordinates,
          destination: destinationCoordinates,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("Distance Response:", response.data);

      const data = response.data.data;

      setDistance(data.distance);
      setDuration(data.duration);

      // --------------------------------
      // Decode route
      // --------------------------------

      if (data.geometry) {
        const decoded = polyline.decode(data.geometry);

        const coordinates = decoded.map(([lat, lng]) => [lng, lat]);

        console.log("Route Coordinates:", coordinates);

        setRouteCoordinates(coordinates);
      }

      // --------------------------------
      // Get fare
      // --------------------------------

      await getFare();
    } catch (error) {
      console.error("Distance request failed:", error.response?.data || error);
    }
  };

  // ============================================================
  // GET FARE
  // ============================================================

  const getFare = async () => {
    if (!pickupCoordinates || !destinationCoordinates) {
      return;
    }

    try {
      const token = localStorage.getItem("user");

      const response = await api.post(
        "/api/maps/fare",
        {
          pickup: pickupCoordinates,
          destination: destinationCoordinates,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("Fare Response:", response.data);

      setFare(response.data.data.fare);
    } catch (error) {
      console.error("Fare request failed:", error.response?.data || error);
    }
  };
  //get ride
  const createRide = async () => {
    if (!selectedVehicle) {
      alert("Please select a vehicle");
      return;
    }

    if (!pickupCoordinates || !destinationCoordinates) {
      alert("Pickup and destination are required");
      return;
    }

    try {
      const response = await api.post(
        "/api/riders/create",
        {
          pickup: {
            address: pickup,
            location: {
              type: "Point",
              coordinates: [pickupCoordinates.lng, pickupCoordinates.lat],
            },
          },

          destination: {
            address: destination,
            location: {
              type: "Point",
              coordinates: [
                destinationCoordinates.lng,
                destinationCoordinates.lat,
              ],
            },
          },

          distance,
          duration,

          vehicleType: selectedVehicle,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("user")}`,
          },
        },
      );

      console.log("Ride Created Successfully:", response.data);
    } catch (error) {
      console.error("Create Ride Error:", error.response?.data || error);
    }
  };

  // ============================================================
  // GET DISTANCE WHEN BOTH LOCATIONS ARE AVAILABLE
  // ============================================================

  useEffect(() => {
    if (pickupCoordinates && destinationCoordinates) {
      getDistanceTime();
    }
  }, [pickupCoordinates, destinationCoordinates]);

  // ============================================================
  // HANDLE PICKUP FOCUS
  // ============================================================

  const handlePickupFocus = () => {
    setActiveField("pickup");

    // If fare already exists, reset it because
    // user is changing the route.
    if (fare) {
      setFare(null);
      setSelectedVehicle(null);
    }

    setPanelOpen(true);
  };

  // ============================================================
  // HANDLE DESTINATION FOCUS
  // ============================================================

  const handleDestinationFocus = () => {
    setActiveField("destination");

    if (fare) {
      setFare(null);
      setSelectedVehicle(null);
    }

    setPanelOpen(true);
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="h-screen w-full relative overflow-hidden bg-gray-100">
      {/* ======================================================
          MAP
      ====================================================== */}

      <div className="absolute inset-0">
        <MapView
          pickupCoordinates={pickupCoordinates}
          destinationCoordinates={destinationCoordinates}
          routeCoordinates={routeCoordinates}
          setPickupCoordinates={setPickupCoordinates}
          setDestinationCoordinates={setDestinationCoordinates}
        />
      </div>

      {/* ======================================================
          LOCATION SEARCH PANEL
      ====================================================== */}

      <div
        ref={panelRef}
        className="
          absolute
          bottom-0
          left-0
          w-full
          h-[45vh]
          bg-white
          rounded-t-3xl
          shadow-2xl
          z-40
          translate-y-full
          overflow-y-auto
        "
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

      {/* ======================================================
          BOTTOM SHEET
      ====================================================== */}

      <div
        ref={bottomSheetRef}
        className="
          absolute
          bottom-0
          left-0
          w-full
          bg-white
          rounded-t-3xl
          shadow-2xl
          p-5
          z-50
          overflow-y-auto
        "
        style={{
          height: "28vh",
        }}
      >
        {/* ==================================================
            VEHICLE PANEL
        ================================================== */}

        {fare ? (
          <VehiclePanel
            fare={fare}
            selectedVehicle={selectedVehicle}
            setSelectedVehicle={setSelectedVehicle}
            createRide={createRide}
          />
        ) : (
          /* ==================================================
             WHERE TO UI
          ================================================== */

          <div>
            <h2 className="text-2xl font-bold mb-5">Where to?</h2>

            {/* Vertical Line */}

            <div
              className="
                absolute
                left-8
                top-[96px]
                w-1
                h-16
                bg-gray-800
                rounded-full
              "
            />

            {/* Pickup */}

            <input
              type="text"
              placeholder="Enter Pickup Location"
              value={pickup}
              onChange={(e) => {
                setPickup(e.target.value);
                searchPickup(e.target.value);
              }}
              onFocus={handlePickupFocus}
              className="
                w-full
                border
                border-gray-300
                rounded-lg
                px-4
                py-3
                mb-3
                outline-none
                focus:border-black
                transition
              "
            />

            {/* Destination */}

            <input
              type="text"
              placeholder="Enter Destination"
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                searchDestination(e.target.value);
              }}
              onFocus={handleDestinationFocus}
              className="
                w-full
                border
                border-gray-300
                rounded-lg
                px-4
                py-3
                outline-none
                focus:border-black
                transition
              "
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
