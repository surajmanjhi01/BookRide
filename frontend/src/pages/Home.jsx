import React, { useState, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import LocationSearchPanel from "../components/LocationSearchPanel";

const Home = () => {
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const panelRef = useRef(null);
  const panelCloseRef = useRef(null);

  const submitHandler = (e) => {
    e.preventDefault();
  };

 useGSAP(
  () => {
    if (panelOpen) {
      gsap.to(panelRef.current, {
        height: "70%",
        opacity: 1,
        duration: 0.3,
      
      });
      gsap.to(panelCloseRef.current,{
        opacity:1,
      })
    } else {
      gsap.to(panelRef.current, {
        height: "0%",
        opacity: 0,
        duration: 0.3,
      });
      gsap.to(panelCloseRef.current,{
        opacity:0,
      })
    }
  },
  { dependencies: [panelOpen] }
);

  return (
    <div className="h-screen relative">
      {/* Uber Logo */}
      <img
        className="w-16 absolute left-5 top-5 z-10"
        src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Uber_logo_2018.png"
        alt="Uber Logo"
      />

      {/* Background Image */}
      <div className="h-screen w-screen">
        <img
          className="h-full w-full object-cover"
          src="https://miro.medium.com/v2/resize:fit:1400/0*gwMx05pqII5hbfmX.gif"
          alt=""
        />
      </div>

      {/* Bottom Sheet */}
      <div className="flex flex-col justify-end h-screen absolute top-0 w-full">
        <div className="h-[30%] p-6 bg-white relative">
          <h5 ref={panelCloseRef} className="text-2xl font-semibold">Find a trip</h5>

          <form onSubmit={submitHandler}>
            <div className="absolute opacity-0 h-16 w-1 top-[38%] left-10 bg-gray-900 rounded-full"></div>

            <input
              onClick={() => setPanelOpen(true)}
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="bg-gray-100 px-12 py-2 text-base rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full mt-5"
              type="text"
              placeholder="Enter pickup location"
            />

            <input
              onClick={() => setPanelOpen(true)}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="bg-gray-100 px-12 py-2 text-base rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full mt-5"
              type="text"
              placeholder="Enter your destination"
            />
          </form>
        </div>

        {/* Expandable Panel */}
        <div ref={panelRef} className="h-0 not-first: bg-white-500 overflow-hidden ">
               <LocationSearchPanel />
       
      </div>
        </div>
      </div>
  );
};

export default Home; 