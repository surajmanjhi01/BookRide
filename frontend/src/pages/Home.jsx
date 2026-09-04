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

// ============================================================
// REVERSE GEOCODE HELPER
// ============================================================

const reverseGeocode = async (lat, lng) => {
  try {
    const response = await api.get(
      "/api/maps/reverse-geocode",
      {
        params: {
          lat,
          lng,
        },
      }
    );

    return response.data?.data?.address || null;
  } catch (error) {
    console.error(
      "❌ Reverse geocode failed:",
      error.response?.data || error
    );

    return null;
  }
};

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
  // MAP SELECTION MODE
  // ============================================================

  const [mapSelectionMode, setMapSelectionMode] =
    useState(null);

  // ============================================================
  // USER LIVE LOCATION
  // ============================================================

  const [userLocation, setUserLocation] =
    useState(null);

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

  const [rideOtp, setRideOtp] =
    useState("");

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

  // Prevents the auto-detected live location from repeatedly
  // overwriting a pickup the user has manually chosen later.
  const hasInitializedLocation =
    useRef(false);

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
          "Invalid JWT  format"
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
        rideStatus === "requested" ||
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
  // AUTO-DETECT USER LIVE LOCATION (ON INITIAL LOAD ONLY)
  // ============================================================

  useEffect(() => {
    if (hasInitializedLocation.current) return;

    // Claim the slot synchronously so StrictMode double-invocation
    // and remounting do not re-run geolocation repeatedly.
    hasInitializedLocation.current = true;

    if (!navigator.geolocation) {
      console.warn(
        "⚠️ Geolocation is not supported by this browser."
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const latitude =
            position.coords?.latitude;

          const longitude =
            position.coords?.longitude;

          if (
            latitude === undefined ||
            longitude === undefined
          ) {
            return;
          }

          const location = {
            lat: latitude,
            lng: longitude,
          };

          setUserLocation(location);
          setPickupCoordinates(location);

          const address =
            await reverseGeocode(
              latitude,
              longitude
            );

          setPickup(address || "Current location");
        } catch (error) {
          console.error(
            "❌ Auto-detect location error:",
            error
          );
        }
      },

      (error) => {
        console.warn(
          "⚠️ Geolocation permission denied or failed:",
          error?.message || error
        );
      }
    );
  }, []);

  // ============================================================
  // HANDLE MAP LOCATION SELECTION
  // ============================================================

  const handleMapLocationSelect =
    async (coordinates) => {

      if (
        !coordinates ||
        coordinates.lat === undefined ||
        coordinates.lng === undefined
      ) {
        return;
      }

      const { lat, lng } = coordinates;

      if (
        mapSelectionMode ===
        "pickup"
      ) {

        setPickupCoordinates({
          lat,
          lng,
        });

        const address =
          await reverseGeocode(
            lat,
            lng
          );

        setPickup(address || "Selected location");

        setPickupSuggestions([]);
      }

      if (
        mapSelectionMode ===
        "destination"
      ) {

        setDestinationCoordinates({
          lat,
          lng,
        });

        const address =
          await reverseGeocode(
            lat,
            lng
          );

        setDestination(
          address || "Selected destination"
        );

        setDestinationSuggestions([]);
      }

      setPanelOpen(false);
      setMapSelectionMode(null);
    };

  // ============================================================
  // USE MY CURRENT LOCATION
  // ============================================================

  const useCurrentLocation =
    () => {

      if (!navigator.geolocation) {
        console.warn(
          "⚠️ Geolocation is not supported by this browser."
        );

        return;
      }

      const applyLocation =
        (location) => {
          setUserLocation(location);
          setPickupCoordinates(location);

          reverseGeocode(
            location.lat,
            location.lng
          ).then((address) => {
            setPickup(
              address || "Current location"
            );
          });
        };

      // Already resolved on load → use it straight away.
      if (userLocation) {
        applyLocation(userLocation);
        setPanelOpen(false);
        return;
      }

      // Otherwise attempt to grab the GPS position now.
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude =
            position.coords?.latitude;

          const longitude =
            position.coords?.longitude;

          if (
            latitude === undefined ||
            longitude === undefined
          ) {
            return;
          }

          applyLocation({
            lat: latitude,
            lng: longitude,
          });

          setPanelOpen(false);
        },

        (error) => {
          console.warn(
            "⚠️ Geolocation failed:",
            error?.message || error
          );
        }
      );
    };

  // ============================================================
  // PICK PICKUP ON MAP
  // ============================================================

  const handlePickPickupOnMap =
    () => {
      setMapSelectionMode("pickup");
      setPanelOpen(false);
      setPickupSuggestions([]);
      setDestinationSuggestions([]);
    };

  // ============================================================
  // PICK DESTINATION ON MAP
  // ============================================================

  const handlePickDestinationOnMap =
    () => {
      setMapSelectionMode("destination");
      setPanelOpen(false);
      setPickupSuggestions([]);
      setDestinationSuggestions([]);
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

          // Store the OTP so it can be shown to the rider
          // when the captain arrives
          setRideOtp(
            createdRide.otp || ""
          );
        }

        // Reset loading so the confirm button / UI
        // is not stuck in the disabled state.
        setRideLoading(false);

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

      // Clear any previously computed fare / vehicle selection so the
      // recalculation below always reflects the latest locations.
      setFare(null);
      setSelectedVehicle(null);

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

          userLocation={
            userLocation
          }

          mapSelectionMode={
            mapSelectionMode
          }

          onMapLocationSelect={
            handleMapLocationSelect
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
          MAP SELECTION MODE INSTRUCTION
      ====================================================== */}

      {mapSelectionMode && (

        <div
          className="
            absolute
            top-4
            left-1/2
            -translate-x-1/2
            z-[100]
            bg-black
            text-white
            px-4
            py-3
            rounded-xl
            shadow-xl
            flex
            items-center
            gap-3
            max-w-[90%]
          "
        >

          <span className="text-sm font-medium">
            {mapSelectionMode === "pickup"
              ? "📍 Tap anywhere on the map to set Pickup"
              : "🎯 Tap anywhere on the map to set Destination"}
          </span>

          <button
            type="button"
            onClick={() => setMapSelectionMode(null)}
            className="
              ml-auto
              bg-white
              text-black
              text-xs
              font-bold
              px-3
              py-1.5
              rounded-lg
              hover:bg-gray-200
              whitespace-nowrap
            "
          >
            Cancel
          </button>

        </div>
      )}

      {/* ======================================================
          RIDE REQUESTED MESSAGE
      ====================================================== */}

      {rideStatus ===
        "requested" && (

        <div
          className="
            absolute
            top-16
            left-4
            right-4
            z-[100]
            bg-yellow-500
            text-white
            p-4
            rounded-xl
            shadow-xl
          "
        >

          <p className="font-bold">
            🚕 Searching for a Captain
          </p>

          <p className="text-sm mt-1">
            Your ride request has been sent to nearby captains.
          </p>

        </div>
      )}

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
            Captain has arrived. Please provide your OTP to the captain.
          </p>

          {rideOtp && (
            <p className="mt-3 inline-block bg-white text-blue-700 px-4 py-2 rounded-lg text-2xl font-bold tracking-widest">
              {rideOtp}
            </p>
          )}

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
          "requested" ? (

          /* ==================================================
             RIDE REQUESTED / SEARCHING FOR CAPTAIN
          ================================================== */

          <div>

            <h2 className="text-2xl font-bold mb-5">
              🚕 Searching for Captain
            </h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">

              <p className="font-semibold text-yellow-700">
                Ride requested. Looking for nearby captains...
              </p>

              <p className="text-gray-600 mt-2">
                Pickup: {pickup}
              </p>

              <p className="text-gray-600 mt-1">
                Destination: {destination}
              </p>

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
                Captain has arrived. Please provide your OTP to the captain.
              </p>

              <p className="text-gray-600 mt-2">
                Share this OTP with the captain:
              </p>

              {rideOtp && (
                <p className="mt-3 text-4xl font-bold tracking-widest text-blue-700">
                  {rideOtp}
                </p>
              )}

            </div>

          </div>

        ) : rideStatus ===
          "ongoing" ? (

          /* ==================================================
             ONGOING RIDE
          ================================================== */

          <div>

            <h2 className="text-2xl font-bold mb-5">
              🚗 Ride Started
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

            <div className="flex flex-wrap gap-2 mb-3">

              <button
                type="button"
                onClick={useCurrentLocation}
                className="
                  bg-black
                  text-white
                  px-3
                  py-2
                  rounded-lg
                  text-sm
                  font-semibold
                "
              >
                📍 Use My Current Location
              </button>

              <button
                type="button"
                onClick={handlePickPickupOnMap}
                className="
                  border
                  border-gray-300
                  text-gray-700
                  px-3
                  py-2
                  rounded-lg
                  text-sm
                  font-semibold
                "
              >
                🗺 Pick Pickup on Map
              </button>

            </div>

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

            <div className="flex flex-wrap gap-2 mb-3">

              <button
                type="button"
                onClick={handlePickDestinationOnMap}
                className="
                  border
                  border-gray-300
                  text-gray-700
                  px-3
                  py-2
                  rounded-lg
                  text-sm
                  font-semibold
                "
              >
                🗺 Pick Destination on Map
              </button>

            </div>

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