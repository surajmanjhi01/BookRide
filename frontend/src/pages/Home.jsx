import React, { useState, useRef } from "react";
import LocationSearchPanel from "../components/LocationSearchPanel";
import api from "../services/axios";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const Home = () => {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState([]);
  const [pickupCoordinates, setPickupCoordinates]=useState(null);
  const[destinationCoordinates, setDestinationCoordinates]=useState(null);
  const[activeField,setActiveField]=useState("");
  const panelRef = useRef(null);
  const bottomSheetRef = useRef(null);
    
  useGSAP(() => {
    if (panelOpen) {
      gsap.to(panelRef.current, {
        y: 0,
        duration: 0.4,
        ease: "power2.out",
      });

      gsap.to(bottomSheetRef.current, {
        height: "35vh",
        duration: 0.4,
      });
    } else {
      gsap.to(panelRef.current, {
        y: "100%",
        duration: 0.4,
        ease: "power2.in",
      });

      gsap.to(bottomSheetRef.current, {
        height: "28vh",
        duration: 0.4,
      });
    }
  }, [panelOpen]);

  // Search Pickup Locations
  const searchPickup = async (query) => {
    if (!query) {
      setPickupSuggestions([]);
      return;
    }

    try {
      const token = localStorage.getItem("token");

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
  const handleLocationSelect=(place)=>{
    if(activeField=="pickup"){
      setPickup(place.address);

      setPickupCoordinates({
        lat:place.lattitude,
        lng:place.longitude
      });
    }else{
      setDestination(place.address);
      setDestinationCoordinates({
        lat:place.lattitude,
        lng:place.longitude
      });
    }
    setPanelOpen(false);
  }   
  

  return (
    <div className="h-screen w-full relative overflow-hidden bg-gray-100">
      {/* Map Placeholder */}
      <div className="h-full w-full bg-gray-300 flex items-center justify-center">
        <h1 className="text-2xl font-semibold text-gray-600">
          Map Placeholder
        </h1>
      </div>

      {/* Search Panel */}
      <div
        ref={panelRef}
        className="absolute bottom-0 left-0 w-full h-[45vh] bg-white rounded-t-3xl shadow-lg translate-y-full z-20 overflow-y-auto"
      >
        <LocationSearchPanel locations={pickupSuggestions} />
      </div>

      {/* Bottom Sheet */}
      <div
        ref={bottomSheetRef}
        className="absolute bottom-0 left-0 w-full h-[28vh] bg-white rounded-t-3xl shadow-xl p-5 z-30"
      >
        <h2 className="text-2xl font-bold mb-5">Where to?</h2>

        {/* Vertical Line */}
        <div className="absolute left-8 top-[96px] w-1 h-16 bg-gray-400 rounded-full"></div>

        {/* Pickup */}
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

        {/* Destination */}
        <input
          type="text"
          placeholder="Enter Destination"
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
          }}
          onFocus={() => {
            setPanelOpen(true);
            setActiveField("destination");
          }}
          className="w-full border rounded-lg px-4 py-3 outline-none"
        />
      </div>
    </div>
  );
};

export default Home;
