import React, {
  useState,
  useRef,
  useEffect,
} from "react";

import LocationSearchPanel from "../components/LocationSearchPanel";
import VehiclePanel from "../components/VehiclePanel";
import api from "../services/axios";
import MapView from "../components/MapView";
import socket from "../services/riderSocket";

import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import polyline from "@mapbox/polyline";

gsap.registerPlugin(useGSAP);

const Home = () => {
  // ============================================================
  // LOCATION STATES
  // ============================================================

  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");

  const [pickupSuggestions, setPickupSuggestions] =
    useState([]);

  const [destinationSuggestions, setDestinationSuggestions] =
    useState([]);

  const [pickupCoordinates, setPickupCoordinates] =
    useState(null);

  const [destinationCoordinates, setDestinationCoordinates] =
    useState(null);

  const [activeField, setActiveField] =
    useState("");

  // ============================================================
  // CAPTAIN LOCATION
  // ============================================================

  const [captainLocation, setCaptainLocation] =
    useState(null);

  // ============================================================
  // RIDE STATES
  // ============================================================

  const [distance, setDistance] =
    useState(null);

  const [duration, setDuration] =
    useState(null);

  const [routeCoordinates, setRouteCoordinates] =
    useState([]);

  const [fare, setFare] =
    useState(null);

  const [selectedVehicle, setSelectedVehicle] =
    useState(null);

  // ============================================================
  // RIDE STATUS
  // ============================================================

  const [ride, setRide] =
    useState(null);

  const [rideStatus, setRideStatus] =
    useState(null);

  const [rideLoading, setRideLoading] =
    useState(false);

  // ============================================================
  // SOCKET STATUS
  // ============================================================

  const [socketConnected, setSocketConnected] =
    useState(false);

  // ============================================================
  // UI STATES
  // ============================================================

  const [panelOpen, setPanelOpen] =
    useState(false);

  // ============================================================
  // REFS
  // ============================================================

  const panelRef =
    useRef(null);

  const bottomSheetRef =
    useRef(null);

  // ============================================================
  // RIDER SOCKET CONNECTION
  // ============================================================

  useEffect(() => {
    const token =
      localStorage.getItem("user");

    // ------------------------------------------------------------
    // Check token
    // ------------------------------------------------------------

    if (!token) {
      console.error(
        "❌ Rider token not found in localStorage"
      );

      console.log(
        "Available localStorage keys:",
        Object.keys(localStorage)
      );

      return;
    }

    // ------------------------------------------------------------
    // Decode JWT
    // ------------------------------------------------------------

    let userId;

    try {
      const tokenParts =
        token.split(".");

      if (tokenParts.length !== 3) {
        throw new Error(
          "Invalid JWT format"
        );
      }

      const base64Payload =
        tokenParts[1]
          .replace(/-/g, "+")
          .replace(/_/g, "/");

      const payload =
        JSON.parse(
          atob(base64Payload)
        );

      userId = payload.id;

      if (!userId) {
        throw new Error(
          "User ID not found inside JWT"
        );
      }

      console.log(
        "================================="
      );

      console.log(
        "👤 RIDER JWT DECODED"
      );

      console.log(
        "Rider ID:",
        userId
      );

      console.log(
        "================================="
      );

    } catch (error) {
      console.error(
        "❌ Failed to decode rider JWT:",
        error
      );

      return;
    }

    // ------------------------------------------------------------
    // Give JWT to Socket.IO
    // ------------------------------------------------------------

    socket.auth = {
      token,
    };

    console.log(
      "================================="
    );

    console.log(
      "👤 RIDER SOCKET INITIALIZATION"
    );

    console.log(
      "Rider ID:",
      userId
    );

    console.log(
      "Socket connected:",
      socket.connected
    );

    console.log(
      "Socket ID:",
      socket.id
    );

    console.log(
      "================================="
    );

    // ==========================================================
    // SOCKET CONNECT
    // ==========================================================

    const handleConnect = () => {
      console.log(
        "================================="
      );

      console.log(
        "🚀 RIDER SOCKET CONNECTED"
      );

      console.log(
        "Socket ID:",
        socket.id
      );

      console.log(
        "Rider ID:",
        userId
      );

      console.log(
        "Socket connected:",
        socket.connected
      );

      setSocketConnected(true);

      // --------------------------------------------------------
      // IMPORTANT:
      // Register rider with backend
      // --------------------------------------------------------

      socket.emit(
        "join-rider",
        {
          userId: userId.toString(),
        }
      );

      console.log(
        "📡 join-rider emitted"
      );

      console.log(
        "User ID sent:",
        userId.toString()
      );

      console.log(
        "Socket ID:",
        socket.id
      );

      console.log(
        "================================="
      );
    };

    // ==========================================================
    // SOCKET DISCONNECT
    // ==========================================================

    const handleDisconnect = (
      reason
    ) => {
      console.log(
        "================================="
      );

      console.log(
        "❌ RIDER SOCKET DISCONNECTED"
      );

      console.log(
        "Reason:",
        reason
      );

      console.log(
        "Socket ID:",
        socket.id
      );

      console.log(
        "================================="
      );

      setSocketConnected(false);
    };

    // ==========================================================
    // SOCKET ERROR
    // ==========================================================

    const handleConnectError = (
      error
    ) => {
      console.error(
        "================================="
      );

      console.error(
        "❌ RIDER SOCKET CONNECTION ERROR"
      );

      console.error(
        "Message:",
        error.message
      );

      console.error(
        "Error:",
        error
      );

      console.error(
        "================================="
      );

      setSocketConnected(false);
    };

    // ==========================================================
    // RIDE ACCEPTED
    // ==========================================================

    const handleRideAccepted = (
      data
    ) => {
      console.log(
        "================================="
      );

      console.log(
        "🚕 RIDE ACCEPTED BY CAPTAIN"
      );

      console.log(
        "Rider ID:",
        userId
      );

      console.log(
        "Socket ID:",
        socket.id
      );

      console.log(
        "Ride accepted data:",
        data
      );

      console.log(
        "================================="
      );

      // --------------------------------------------------------
      // Backend sends:
      //
      // {
      //   rideId,
      //   captainId,
      //   status,
      //   captain: {...}
      // }
      //
      // --------------------------------------------------------

      const acceptedRide = {
        ...(data?.ride || data),
        rideId:
          data?.rideId ||
          data?.ride?._id ||
          data?.ride?.rideId,
        captainId:
          data?.captainId ||
          data?.ride?.captainId,
        status:
          data?.status ||
          data?.ride?.status ||
          "accepted",
        captain:
          data?.captain ||
          data?.ride?.captain,
      };

      setRide(
        acceptedRide
      );

      setRideStatus(
        "accepted"
      );

      setRideLoading(false);

      console.log(
        "✅ Rider UI updated with accepted ride"
      );

      console.log(
        "Accepted Ride:",
        acceptedRide
      );
    };

    // ==========================================================
    // CAPTAIN ARRIVED
    // ==========================================================

    const handleCaptainArrived = (
      data
    ) => {
      console.log(
        "================================="
      );

      console.log(
        "📍 CAPTAIN ARRIVED"
      );

      console.log(
        "Captain arrived data:",
        data
      );

      console.log(
        "================================="
      );

      setRideStatus(
        data?.status ||
        "arrived"
      );

      setRide((prev) => ({
        ...prev,
        ...data,
      }));
    };

    // ==========================================================
    // RIDE STARTED
    // ==========================================================

    const handleRideStarted = (
      data
    ) => {
      console.log(
        "================================="
      );

      console.log(
        "🚀 RIDE STARTED"
      );

      console.log(
        "Ride started data:",
        data
      );

      console.log(
        "================================="
      );

      setRideStatus(
        data?.status ||
        "ongoing"
      );

      setRide((prev) => ({
        ...prev,
        ...data,
      }));
    };

    // ==========================================================
    // CAPTAIN LOCATION
    // ==========================================================

    const handleCaptainLocation = (
      data
    ) => {
      console.log(
        "📍 Captain location received:",
        data
      );

      if (
        data?.latitude === undefined ||
        data?.longitude === undefined
      ) {
        console.log(
          "⚠️ Invalid captain location received"
        );

        return;
      }

      const latitude =
        Number(data.latitude);

      const longitude =
        Number(data.longitude);

      if (
        Number.isNaN(latitude) ||
        Number.isNaN(longitude)
      ) {
        console.log(
          "⚠️ Captain coordinates are not numbers"
        );

        return;
      }

      setCaptainLocation({
        latitude,
        longitude,
      });

      console.log(
        "✅ Captain location updated:",
        {
          latitude,
          longitude,
        }
      );
    };

    // ==========================================================
    // REGISTER SOCKET LISTENERS
    // ==========================================================

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "connect_error",
      handleConnectError
    );

    socket.on(
      "ride-accepted",
      handleRideAccepted
    );

    socket.on(
      "captain-arrived",
      handleCaptainArrived
    );

    socket.on(
      "ride-started",
      handleRideStarted
    );

    socket.on(
      "captain-location",
      handleCaptainLocation
    );

    socket.on(
      "captain-location-update",
      handleCaptainLocation
    );

    // ==========================================================
    // CONNECT SOCKET
    // ==========================================================

    if (!socket.connected) {
      console.log(
        "🔌 Connecting rider socket..."
      );

      socket.connect();

    } else {
      console.log(
        "✅ Rider socket already connected"
      );

      // --------------------------------------------------------
      // If socket was already connected,
      // register rider immediately
      // --------------------------------------------------------

      handleConnect();
    }

    // ==========================================================
    // CLEANUP
    // ==========================================================

    return () => {
      console.log(
        "🧹 Cleaning rider socket listeners"
      );

      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "connect_error",
        handleConnectError
      );

      socket.off(
        "ride-accepted",
        handleRideAccepted
      );

      socket.off(
        "captain-arrived",
        handleCaptainArrived
      );

      socket.off(
        "ride-started",
        handleRideStarted
      );

      socket.off(
        "captain-location",
        handleCaptainLocation
      );

      socket.off(
        "captain-location-update",
        handleCaptainLocation
      );

      // IMPORTANT:
      // Do NOT call socket.disconnect() here.
      //
      // This socket is shared and disconnecting it
      // can remove the rider from the backend map.
    };

  }, []);

  // ============================================================
  // GSAP ANIMATION
  // ============================================================

  useGSAP(
    () => {
      const panel =
        panelRef.current;

      const bottomSheet =
        bottomSheetRef.current;

      if (
        !panel ||
        !bottomSheet
      ) {
        return;
      }

      // --------------------------------------------------------
      // SEARCH PANEL
      // --------------------------------------------------------

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

      // --------------------------------------------------------
      // BOTTOM SHEET HEIGHT
      // --------------------------------------------------------

      let targetHeight =
        "28vh";

      if (panelOpen) {
        targetHeight =
          "40vh";
      }

      if (
        fare &&
        !panelOpen
      ) {
        targetHeight =
          "55vh";
      }

      if (
        rideStatus === "accepted" ||
        rideStatus === "arrived" ||
        rideStatus === "ongoing"
      ) {
        targetHeight =
          "32vh";
      }

      gsap.to(
        bottomSheet,
        {
          height:
            targetHeight,
          duration: 0.45,
          ease: "power3.inOut",
        }
      );
    },
    {
      dependencies: [
        panelOpen,
        fare,
        rideStatus,
      ],
    }
  );

  // ============================================================
  // SEARCH PICKUP
  // ============================================================

  const searchPickup =
    async (query) => {

      if (!query.trim()) {
        setPickupSuggestions([]);
        return;
      }

      try {
        const token =
          localStorage.getItem(
            "user"
          );

        const response =
          await api.get(
            `/api/maps/search?query=${encodeURIComponent(
              query
            )}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        setPickupSuggestions(
          response.data.data ||
          []
        );

      } catch (error) {
        console.error(
          "❌ Pickup search failed:",
          error.response?.data ||
          error
        );
      }
    };

  // ============================================================
  // SEARCH DESTINATION
  // ============================================================

  const searchDestination =
    async (query) => {

      if (!query.trim()) {
        setDestinationSuggestions([]);
        return;
      }

      try {
        const token =
          localStorage.getItem(
            "user"
          );

        const response =
          await api.get(
            `/api/maps/search?query=${encodeURIComponent(
              query
            )}`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        setDestinationSuggestions(
          response.data.data ||
          []
        );

      } catch (error) {
        console.error(
          "❌ Destination search failed:",
          error.response?.data ||
          error
        );
      }
    };

  // ============================================================
  // SELECT LOCATION
  // ============================================================

  const handleLocationSelect =
    (place) => {

      console.log(
        "📍 Selected Place:",
        place
      );

      if (
        activeField ===
        "pickup"
      ) {

        setPickup(
          place.address
        );

        setPickupCoordinates({
          lat: Number(
            place.latitude
          ),

          lng: Number(
            place.longitude
          ),
        });

        setPickupSuggestions([]);

      }

      if (
        activeField ===
        "destination"
      ) {

        setDestination(
          place.address
        );

        setDestinationCoordinates({
          lat: Number(
            place.latitude
          ),

          lng: Number(
            place.longitude
          ),
        });

        setDestinationSuggestions([]);
      }

      setPanelOpen(false);
    };

  // ============================================================
  // GET DISTANCE + TIME
  // ============================================================

  const getDistanceTime =
    async () => {

      if (
        !pickupCoordinates ||
        !destinationCoordinates
      ) {
        return;
      }

      try {

        const token =
          localStorage.getItem(
            "user"
          );

        const response =
          await api.post(
            "/api/maps/distance-time",
            {
              pickup:
                pickupCoordinates,

              destination:
                destinationCoordinates,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        console.log(
          "Distance Response:",
          response.data
        );

        const data =
          response.data.data;

        setDistance(
          data.distance
        );

        setDuration(
          data.duration
        );

        // ------------------------------------------------------
        // Decode route
        // ------------------------------------------------------

        if (
          data.geometry
        ) {

          const decoded =
            polyline.decode(
              data.geometry
            );

          const coordinates =
            decoded.map(
              ([lat, lng]) => [
                lng,
                lat,
              ]
            );

          setRouteCoordinates(
            coordinates
          );
        }

        // ------------------------------------------------------
        // Get fare
        // ------------------------------------------------------

        await getFare();

      } catch (error) {

        console.error(
          "❌ Distance request failed:",
          error.response?.data ||
          error
        );
      }
    };

  // ============================================================
  // GET FARE
  // ============================================================

  const getFare =
    async () => {

      if (
        !pickupCoordinates ||
        !destinationCoordinates
      ) {
        return;
      }

      try {

        const token =
          localStorage.getItem(
            "user"
          );

        const response =
          await api.post(
            "/api/maps/fare",
            {
              pickup:
                pickupCoordinates,

              destination:
                destinationCoordinates,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        console.log(
          "Fare Response:",
          response.data
        );

        setFare(
          response.data.data.fare
        );

      } catch (error) {

        console.error(
          "❌ Fare request failed:",
          error.response?.data ||
          error
        );
      }
    };

  // ============================================================
  // CREATE RIDE
  // ============================================================

  const createRide =
    async () => {

      if (!selectedVehicle) {
        alert(
          "Please select a vehicle"
        );

        return;
      }

      if (
        !pickupCoordinates ||
        !destinationCoordinates
      ) {
        alert(
          "Pickup and destination are required"
        );

        return;
      }

      // --------------------------------------------------------
      // Make sure rider socket is connected
      // --------------------------------------------------------

      if (!socket.connected) {
        alert(
          "Rider socket is not connected. Please wait a moment and try again."
        );

        console.error(
          "❌ Cannot create ride: rider socket disconnected"
        );

        return;
      }

      try {

        const token =
          localStorage.getItem(
            "user"
          );

        if (!token) {
          alert(
            "Authentication token not found"
          );

          return;
        }

        // ------------------------------------------------------
        // Decode JWT for debugging
        // ------------------------------------------------------

        try {

          const tokenParts =
            token.split(".");

          const base64Payload =
            tokenParts[1]
              .replace(/-/g, "+")
              .replace(/_/g, "/");

          const payload =
            JSON.parse(
              atob(base64Payload)
            );

          console.log(
            "================================="
          );

          console.log(
            "🚕 CREATING RIDE"
          );

          console.log(
            "Rider ID:",
            payload.id
          );

          console.log(
            "Socket ID:",
            socket.id
          );

          console.log(
            "Socket connected:",
            socket.connected
          );

          console.log(
            "Selected vehicle:",
            selectedVehicle
          );

          console.log(
            "================================="
          );

        } catch (
          decodeError
        ) {

          console.error(
            "❌ JWT decode error:",
            decodeError
          );
        }

        setRideLoading(true);

        // ------------------------------------------------------
        // Create ride
        // ------------------------------------------------------

        const response =
          await api.post(
            "/api/riders/create",
            {
              pickup: {
                address:
                  pickup,

                location: {
                  type:
                    "Point",

                  coordinates: [
                    pickupCoordinates.lng,
                    pickupCoordinates.lat,
                  ],
                },
              },

              destination: {
                address:
                  destination,

                location: {
                  type:
                    "Point",

                  coordinates: [
                    destinationCoordinates.lng,
                    destinationCoordinates.lat,
                  ],
                },
              },

              distance,
              duration,

              vehicleType:
                selectedVehicle,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        console.log(
          "================================="
        );

        console.log(
          "✅ RIDE CREATED"
        );

        console.log(
          "Ride Response:",
          response.data
        );

        console.log(
          "================================="
        );

        // ------------------------------------------------------
        // Store created ride
        // ------------------------------------------------------

        const createdRide =
          response.data?.data;

        if (createdRide) {

          setRide(
            createdRide
          );

          setRideStatus(
            createdRide.status ||
            "requested"
          );
        }

      } catch (error) {

        console.error(
          "❌ Create Ride Error:",
          error.response?.data ||
          error
        );

        setRideLoading(false);

        alert(
          error.response?.data?.message ||
          "Failed to create ride"
        );
      }
    };

  // ============================================================
  // GET DISTANCE WHEN BOTH LOCATIONS EXIST
  // ============================================================

  useEffect(() => {

    if (
      pickupCoordinates &&
      destinationCoordinates
    ) {
      getDistanceTime();
    }

  }, [
    pickupCoordinates,
    destinationCoordinates,
  ]);

  // ============================================================
  // HANDLE PICKUP FOCUS
  // ============================================================

  const handlePickupFocus =
    () => {

      setActiveField(
        "pickup"
      );

      if (fare) {
        setFare(null);

        setSelectedVehicle(
          null
        );
      }

      setPanelOpen(true);
    };

  // ============================================================
  // HANDLE DESTINATION FOCUS
  // ============================================================

  const handleDestinationFocus =
    () => {

      setActiveField(
        "destination"
      );

      if (fare) {
        setFare(null);

        setSelectedVehicle(
          null
        );
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
          pickupCoordinates={
            pickupCoordinates
          }

          destinationCoordinates={
            destinationCoordinates
          }

          routeCoordinates={
            routeCoordinates
          }

          captainLocation={
            captainLocation
          }

          setPickupCoordinates={
            setPickupCoordinates
          }

          setDestinationCoordinates={
            setDestinationCoordinates
          }
        />

      </div>

      {/* ======================================================
          SOCKET STATUS
      ====================================================== */}

      <div
        className="
          absolute
          top-4
          right-4
          z-[100]
          bg-white
          px-3
          py-2
          rounded-full
          shadow-md
          text-sm
          font-semibold
        "
      >

        <span
          className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${
            socketConnected
              ? "bg-green-500"
              : "bg-red-500"
          }`}
        />

        {socketConnected
          ? "Connected"
          : "Disconnected"}

      </div>

      {/* ======================================================
          RIDE ACCEPTED MESSAGE
      ====================================================== */}

      {rideStatus ===
        "accepted" && (

        <div
          className="
            absolute
            top-16
            left-4
            right-4
            z-[100]
            bg-green-500
            text-white
            p-4
            rounded-xl
            shadow-xl
          "
        >

          <p className="font-bold">
            🚕 Captain Accepted Your Ride
          </p>

          <p className="text-sm mt-1">
            Your captain is on the way.
          </p>

        </div>
      )}

      {/* ======================================================
          CAPTAIN ARRIVED MESSAGE
      ====================================================== */}

      {rideStatus ===
        "arrived" && (

        <div
          className="
            absolute
            top-16
            left-4
            right-4
            z-[100]
            bg-blue-500
            text-white
            p-4
            rounded-xl
            shadow-xl
          "
        >

          <p className="font-bold">
            📍 Captain Has Arrived
          </p>

          <p className="text-sm mt-1">
            Please provide your OTP to the captain.
          </p>

        </div>
      )}

      {/* ======================================================
          RIDE STARTED MESSAGE
      ====================================================== */}

      {rideStatus ===
        "ongoing" && (

        <div
          className="
            absolute
            top-16
            left-4
            right-4
            z-[100]
            bg-indigo-500
            text-white
            p-4
            rounded-xl
            shadow-xl
          "
        >

          <p className="font-bold">
            🚗 Ride Started
          </p>

          <p className="text-sm mt-1">
            You are now on your way.
          </p>

        </div>
      )}

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
            activeField ===
            "pickup"
              ? pickupSuggestions
              : destinationSuggestions
          }

          onSelectLocation={
            handleLocationSelect
          }
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
          height:
            "28vh",
        }}
      >

        {/* ==================================================
            ACCEPTED RIDE
        ================================================== */}

        {rideStatus ===
          "accepted" ? (

          <div>

            <h2 className="text-2xl font-bold mb-5">
              🚕 Your Ride
            </h2>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4">

              <p className="font-semibold text-green-700">
                Captain is coming
              </p>

              <p className="text-gray-600 mt-2">
                Pickup: {pickup}
              </p>

              <p className="text-gray-600 mt-1">
                Destination: {destination}
              </p>

              {ride?.captain && (
                <div className="mt-3">

                  <p className="font-semibold">
                    Captain
                  </p>

                  <p className="text-gray-600">
                   {ride.captain.fullname?.firstname}{" "}
  {ride.captain.fullname?.lastname}
                  </p>

                </div>
              )}

              {captainLocation && (
                <p className="text-sm text-gray-500 mt-3">
                  📍 Captain location is updating on the map.
                </p>
              )}

            </div>

          </div>

        ) : rideStatus ===
          "arrived" ? (

          /* ==================================================
             CAPTAIN ARRIVED
          ================================================== */

          <div>

            <h2 className="text-2xl font-bold mb-5">
              📍 Captain Arrived
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">

              <p className="font-semibold text-blue-700">
                Your captain has arrived.
              </p>

              <p className="text-gray-600 mt-2">
                Please share your OTP with the captain.
              </p>

            </div>

          </div>

        ) : rideStatus ===
          "ongoing" ? (

          /* ==================================================
             ONGOING RIDE
          ================================================== */

          <div>

            <h2 className="text-2xl font-bold mb-5">
              🚗 Ride In Progress
            </h2>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">

              <p className="font-semibold text-indigo-700">
                Your ride has started.
              </p>

              <p className="text-gray-600 mt-2">
                Destination: {destination}
              </p>

              {captainLocation && (
                <p className="text-sm text-gray-500 mt-3">
                  📍 Captain location is updating on the map.
                </p>
              )}

            </div>

          </div>

        ) : fare ? (

          /* ==================================================
             VEHICLE PANEL
          ================================================== */

          <VehiclePanel
            fare={fare}

            selectedVehicle={
              selectedVehicle
            }

            setSelectedVehicle={
              setSelectedVehicle
            }

            createRide={
              createRide
            }

            rideLoading={
              rideLoading
            }
          />

        ) : (

          /* ==================================================
             WHERE TO UI
          ================================================== */

          <div>

            <h2 className="text-2xl font-bold mb-5">
              Where to?
            </h2>

            {/* ------------------------------------------------
                PICKUP
            ------------------------------------------------ */}

            <input
              type="text"
              placeholder="Enter Pickup Location"
              value={pickup}

              onChange={(e) => {

                setPickup(
                  e.target.value
                );

                searchPickup(
                  e.target.value
                );

              }}

              onFocus={
                handlePickupFocus
              }

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
              "
            />

            {/* ------------------------------------------------
                DESTINATION
            ------------------------------------------------ */}

            <input
              type="text"
              placeholder="Enter Destination"
              value={
                destination
              }

              onChange={(e) => {

                setDestination(
                  e.target.value
                );

                searchDestination(
                  e.target.value
                );

              }}

              onFocus={
                handleDestinationFocus
              }

              className="
                w-full
                border
                border-gray-300
                rounded-lg
                px-4
                py-3
                outline-none
                focus:border-black
              "
            />

            {/* ------------------------------------------------
                DISTANCE / DURATION
            ------------------------------------------------ */}

            {distance !== null &&
              duration !== null && (

              <div className="mt-4 flex gap-3">

                <div className="bg-gray-100 rounded-lg px-4 py-2">

                  <p className="text-xs text-gray-500">
                    Distance
                  </p>

                  <p className="font-semibold">
                    {distance} km
                  </p>

                </div>

                <div className="bg-gray-100 rounded-lg px-4 py-2">

                  <p className="text-xs text-gray-500">
                    Duration
                  </p>

                  <p className="font-semibold">
                    {duration} min
                  </p>

                </div>

              </div>
            )}

          </div>
        )}

      </div>

    </div>
  );
};

export default Home;