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
  const lineRef = useRef(null);

  const submitHandler = (e) => {
    e.preventDefault();
  };

useGSAP(() => {
  if (panelOpen) {
    gsap.to(panelRef.current, {
      height: "70%",
      opacity: 1,
      duration: 0.3,
      ease: "power2.out",
    });
    gsap.to(panelCloseRef.current, {
      opacity: 1,
      duration: 0.3,
    });

    gsap.to(lineRef.current, {
      y:-650,
      duration:0.3,
      ease:"power2.out",
    });
  } else {
    gsap.to(panelRef.current, {
      height: "0%",
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
    });

    gsap.to(panelCloseRef.current, {
      opacity: 0,
      duration: 0.3,
    });
    gsap.to(lineRef.current, {
      y:0,
      duration:0.3,
      ease:"power2.in",
    });
  }
}, [panelOpen]);
  return (
    <div className="h-screen relative">
      {/* Uber Logo */}
      <img
        className="w-16 absolute right-5 top-5 z-10"
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
        <div className="h-[30%] p-6 bg-white ">
          <h5 ref={panelCloseRef} className="text-2xl font-semibold">Find a trip</h5>

          <form onSubmit={submitHandler}>
            <div ref={lineRef} className="line absolute h-18  w-1  top-[80%] left-11 bg-black"></div>

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
       <div
  ref={panelRef}
  
  className="h-0 bg-white overflow-hidden"
>  <LocationSearchPanel />
              
       
      </div>
      <button
  ref={panelCloseRef}
  onClick={() => setPanelOpen(false)}
  className="absolute right-5 top-5 z-20 flex items-center gap-2 bg-white rounded-full px-3 py-2 shadow-md opacity-0"
>
 <i className="ri-arrow-down-line"></i>
  <span className="font-medium">Back</span>
</button>
        </div>
        <div classname='fixed z-10 bottom-0 w-full'>
          <div>
            <img src="https://static.vecteezy.com/system/resources/thumbnails/046/836/811/small/side-view-white-car-png.png" alt="" />
            <div>
              <h4>
                UberGO 
              </h4>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Home;   