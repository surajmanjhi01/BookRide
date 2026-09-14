import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";

import LocationSearchPanel from "../components/LocationSearchPanel";
import VehiclePanel from "../components/VehiclePanel";
import api from "../services/axios";
import MapView from "../components/MapView";
import socket from "../services/riderSocket";
import { RIDER_STORAGE_KEYS } from "../constants/riderStorage";

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
      "Reverse geocode failed:",
      error.response?.data || error
    );

    return null;
  }
};

// ============================================================
// LOCALSTORAGE HELPERS (PAGE REFRESH PERSISTENCE)
// ============================================================

// Safely read a plain-text value; never throws.
const readStoredText = (key) => {
  try {
    return localStorage.getItem(key) || "";
  } catch (error) {
    console.error(
      `Failed to read ${key} from localStorage:`,
      error
    );

    return "";
  }
};

// Safely read + validate a { lat, lng } coordinate object.
const readStoredCoordinates = (key) => {
  try {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);

    if (
      parsed &&
      typeof parsed.lat === "number" &&
      typeof parsed.lng === "number"
    ) {
      return {
        lat: parsed.lat,
        lng: parsed.lng,
      };
    }

    return null;
  } catch (error) {
    console.error(
      `Failed to parse ${key} from localStorage:`,
      error
    );

    return null;
  }
};

// Safely read + parse any JSON object stored under a key; never throws.
const readStoredObject = (key) => {
  try {
    const raw =
      localStorage.getItem(key);
 
    if (!raw) {
      return null;
    }
 
    const parsed =
      JSON.parse(raw);
 
    if (
      parsed &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
    ) {
      return parsed;
    }
 
    return null;
  } catch (error) {
    console.error(
      `Failed to parse ${key} from localStorage:`,
      error
    );
 
    return null;
  }
};

// Persist a value; empty/null values remove the key entirely.
const persistValue = (key, value) => {
  try {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(
        key,
        typeof value === "string"
          ? value
          : JSON.stringify(value)
      );
    }
  } catch (error) {
    console.error(
      `Failed to persist ${key} to localStorage:`,
      error
    );
  }
};

const Home = () => {
  // ============================================================
  // LOCATION STATES
  // ============================================================

  const [pickup, setPickup] = useState(() =>
    readStoredText(RIDER_STORAGE_KEYS.pickup)
  );

  const [destination, setDestination] = useState(() =>
    readStoredText(RIDER_STORAGE_KEYS.destination)
  );

  const [pickupSuggestions, setPickupSuggestions] =
    useState([]);

  const [destinationSuggestions, setDestinationSuggestions] =
    useState([]);

  const [pickupCoordinates, setPickupCoordinates] =
    useState(() =>
      readStoredCoordinates(
        RIDER_STORAGE_KEYS.pickupCoordinates
      )
    );

  const [destinationCoordinates, setDestinationCoordinates] =
    useState(() =>
      readStoredCoordinates(
        RIDER_STORAGE_KEYS.destinationCoordinates
      )
    );

  const [activeField, setActiveField] =
    useState("");

  const[nearbyCaptains, setNearbyCaptains] =
    useState([]);

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
    useState(() =>
      readStoredText(RIDER_STORAGE_KEYS.selectedVehicle) || null
    );

  // ============================================================
  // RIDE STATUS
  // ============================================================

  const [ride, setRide] =
    useState(() =>
      readStoredObject(RIDER_STORAGE_KEYS.ride)
    );

  const [rideOtp, setRideOtp] =
    useState(() =>
      readStoredText(RIDER_STORAGE_KEYS.rideOtp)
    );

  const [rideStatus, setRideStatus] =
    useState(() =>
      readStoredText(RIDER_STORAGE_KEYS.rideStatus) || null
    );

  const [rideLoading, setRideLoading] =
    useState(false);

  const [rideCancelling, setRideCancelling] =
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

  // Becomes true ONLY when the rider actively chooses a destination
  // in this session. It prevents the fare / vehicle panel from being
  // computed automatically on login just because the previous
  // session's destination was restored from localStorage — which
  // previously blocked entering pickup / destination on login.
  const hasUserChosenDestination =
    useRef(false);

  // Tracks the accepted ride's captain id so the socket handler
  // (registered once on mount) can clear the LIVE captain marker
  // the moment that captain goes offline mid-trip.
  const rideCaptainIdRef =
    useRef(null);

  useEffect(() => {
    rideCaptainIdRef.current =
      ride?.captainId?.toString?.() || null;
  }, [ride]);

  // ============================================================
  // PERSIST RIDER STATE ACROSS PAGE REFRESHES
  //
  // Each of these effects mirrors state into localStorage so a
  // refresh restores pickup / destination / coordinates. When a
  // value is cleared ("" or null) the stored key is removed so we
  // never restore stale selections.
  // ============================================================

  useEffect(() => {
    persistValue(RIDER_STORAGE_KEYS.pickup, pickup);
  }, [pickup]);

  useEffect(() => {
    persistValue(RIDER_STORAGE_KEYS.destination, destination);
  }, [destination]);

  useEffect(() => {
    persistValue(
      RIDER_STORAGE_KEYS.pickupCoordinates,
      pickupCoordinates
    );
  }, [pickupCoordinates]);

  useEffect(() => {
    persistValue(
      RIDER_STORAGE_KEYS.destinationCoordinates,
      destinationCoordinates
    );
  }, [destinationCoordinates]);

  // ----------------------------------------------------------
  // RIDE STATE (searching / accepted and ride screens)
  // ----------------------------------------------------------

  useEffect(() => {
    persistValue(RIDER_STORAGE_KEYS.ride, ride);
  }, [ride]);

  useEffect(() => {
    persistValue(
      RIDER_STORAGE_KEYS.rideStatus,
      rideStatus || ""
    );
  }, [rideStatus]);

  useEffect(() => {
    persistValue(
      RIDER_STORAGE_KEYS.rideOtp,
      rideOtp
    );
  }, [rideOtp]);

  useEffect(() => {
    persistValue(
      RIDER_STORAGE_KEYS.selectedVehicle,
      selectedVehicle || ""
    );
  }, [selectedVehicle]);

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
         "RIDER SOCKET CONNECTED"
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
    // RIDE COMPLETED
    // ==========================================================

    const handleRideCompleted = (
      data
    ) => {
      console.log(
        "================================="
      );

      console.log(
        "🏁 RIDE COMPLETED"
      );

      console.log(
        "Ride completed data:",
        data
      );

      console.log(
        "================================="
      );

      // --------------------------------------------------------
      // Reset the rider UI back to the initial "Where to?" state
      // so a new trip can be booked right away.
      // --------------------------------------------------------

      setRide(null);
      setRideStatus(null);
      setRideOtp("");
      setCaptainLocation(null);
      setNearbyCaptains([]);
      setRouteCoordinates([]);
      setDistance(null);
      setDuration(null);
      setFare(null);
      setSelectedVehicle(null);
      setMapSelectionMode(null);
      setPanelOpen(false);

      // --------------------------------------------------------
      // Wipe pickup / destination (and their coordinates). The
      // persistValue effects below then remove the matching
      // localStorage keys, so the next login / refresh starts
      // clean instead of auto-restoring the completed trip's
      // destination — which is what auto-opened the vehicle panel.
      // --------------------------------------------------------

      setPickup("");
      setDestination("");
      setPickupCoordinates(null);
      setDestinationCoordinates(null);

      // The destination is gone → no fare should ever be re-triggered
      // from stale restored state in this session.
      hasUserChosenDestination.current = false;
    };

    // ==========================================================
    // CAPTAIN WENT OFFLINE
    // ==========================================================

    const handleCaptainOffline = (
      data
    ) => {
      const captainId =
        data?.captainId;

      if (!captainId) {
        return;
      }

      console.log(
        "🚫 Captain went offline:",
        captainId
      );

      // Instantly drop the marker from the nearby list.
      // No need to wait for the next /api/captains/nearby poll.
      setNearbyCaptains(
        (prev) =>
          prev.filter(
            (captain) =>
              captain?._id?.toString() !==
              captainId
          )
      );

      // If this captain was the accepted one, remove
      // their live-tracking marker too.
      if (
        rideCaptainIdRef.current ===
        captainId
      ) {
        setCaptainLocation(null);
      }
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

    socket.on(
      "ride-completed",
      handleRideCompleted
    );

    socket.on(
      "captain-offline",
      handleCaptainOffline
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

      socket.off(
        "ride-completed",
        handleRideCompleted
      );

      socket.off(
        "captain-offline",
        handleCaptainOffline
      );

      // IMPORTANT:
      // Do NOT call socket.disconnect() here.
      //
      // This socket is shared and disconnecting it
      // can remove the rider from the backend map.
    };

  }, []);

  // ============================================================
  // NEARBY ONLINE CAPTAINS
  //
  // Fetches GET /api/captains/nearby around the PICKUP location.
  //
  // Runs only when:
  //   - a pickup exists, and
  //   - the ride is NOT accepted / arrived / ongoing
  //
  // Debounced (400 ms) + aborted on cleanup — the API is never
  // hammered on every render and re-fetch loops are impossible.
  // When the ride is accepted (or later), nearbyCaptains is
  // cleared and polling stops so the rider only sees the
  // accepted captain's live marker.
  // ============================================================

  useEffect(() => {

    // Ride accepted / arrived / ongoing → remove all nearby
    // captains and stop fetching.
    if (
      rideStatus === "accepted" ||
      rideStatus === "arrived" ||
      rideStatus === "ongoing"
    ) {
      setNearbyCaptains([]);
      return;
    }

    // No pickup — nothing to search around.
    if (!pickupCoordinates) {
      setNearbyCaptains([]);
      return;
    }

    let active = true;

    const controller = new AbortController();

    const fetchNearbyCaptains =
      async () => {

        try {

          const response = await api.get(
            "/api/captains/nearby",
            {
              params: {
                lng: pickupCoordinates.lng,
                lat: pickupCoordinates.lat,
              },
              signal: controller.signal,
            }
          );

          if (!active) return;

          console.log(
            "🚕 Nearby captains:",
            response.data
          );

          setNearbyCaptains(response.data?.data || []);
        } catch (error) {

          if (active && !controller.signal.aborted) {
            console.error(
              "❌ Failed to fetch nearby captains:",
              error.response?.data || error
            );
          }
        }
      };

    // Debounce the first fetch so typing/animations settle.
    const timer = setTimeout(
      fetchNearbyCaptains,
      400
    );

    // Refresh periodically: if a captain goes offline/moves,
    // the rider's map must reflect it even when nothing else
    // on the page changes. Otherwise offline captains stay
    // visible as if they were still online.
    const interval = setInterval(
      fetchNearbyCaptains,
      10000
    );

    return () => {
      active = false;
      clearTimeout(timer);
      clearInterval(interval);
      controller.abort();
    };
  }, [
    pickupCoordinates,
    rideStatus,
  ]);

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

        // The rider actively picked a destination — from now on the
        // fare / vehicle panel may be shown for this session.
        hasUserChosenDestination.current = true;

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

    // If a pickup was restored from localStorage, do NOT overwrite
    // it with the browser's automatic GPS position — the user
    // explicitly chose that pickup before refreshing.
    if (pickupCoordinates) {
      console.log(
        "📍 Pickup restored from storage — skipping auto GPS pickup."
      );

      return;
    }

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
  }, [pickupCoordinates]);

  // ============================================================
  // COORDINATE UPDATE HELPERS (used by MapView marker drag)
  // ============================================================

  // Wrapped setters passed to MapView. When the user drags the
  // pickup / destination marker, MapView calls these so Home can
  // keep the address text in sync via reverse geocoding. The
  // route / fare recalculation happens automatically in the
  // "both locations exist" effect below.

  const handlePickupCoordinatesChange =
    useCallback((coordinates) => {

      if (!coordinates) return;

      setPickupCoordinates(coordinates);

      reverseGeocode(
        coordinates.lat,
        coordinates.lng
      ).then((address) => {
        setPickup(address || "Selected location");
      });
    }, []);

  const handleDestinationCoordinatesChange =
    useCallback((coordinates) => {

      if (!coordinates) return;

      setDestinationCoordinates(coordinates);

      // Dragging the destination marker is an active destination
      // choice for this session — allow the fare / vehicle panel
      // to be (re)computed afterwards.
      hasUserChosenDestination.current = true;

      reverseGeocode(
        coordinates.lat,
        coordinates.lng
      ).then((address) => {
        setDestination(address || "Selected destination");
      });
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

        // The rider actively picked a destination — from now on the
        // fare / vehicle panel may be shown for this session.
        hasUserChosenDestination.current = true;

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

      // Already resolved on load — use it straight away.
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
  // REUSABLE RIDE FLOW RESETS
  // ============================================================
 
  // Clears every in-progress ride UI state (but keeps the chosen
  // pickup / destination so the rider can rebook the same trip
  // quickly after cancelling).
  const resetRideFlowState = () => {
    setRide(null);
    setRideStatus(null);
    setRideOtp("");
    setRideLoading(false);
    setCaptainLocation(null);
    setNearbyCaptains([]);
    setRouteCoordinates([]);
    setDistance(null);
    setDuration(null);
    setFare(null);
    setSelectedVehicle(null);
    setMapSelectionMode(null);
    setPanelOpen(false);
  };
 
  // Used when the restored ride turns out to no longer exist on the
  // backend (cancelled / completed / stale) - wipes everything,
  // including pickup / destination, just like handleRideCompleted.

  const resetAllRideState = () => {
    resetRideFlowState();
    setPickup("");
    setDestination("");
    setPickupCoordinates(null);
    setDestinationCoordinates(null);
    hasUserChosenDestination.current = false;
  };
 
  // ============================================================
  // CANCEL RIDE
  // ============================================================
 
  const handleCancelRide =
    async () => {
 
      const rideId =
        ride?._id?.toString() ||
        ride?.rideId;
 
      if (!rideId) {
        alert(
          "Ride ID not found. Please refresh the page."
        );
 
        return;
      }
 
      if (
        !window.confirm(
          "Are you sure you want to cancel this ride?"
        )
      ) {
        return;
      }
 
      setRideCancelling(true);
 
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
 
        await api.patch(
          `/api/riders/${rideId}/cancel`,
          {},
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );
 
        // Backend cancelled - reset the rider UI back to the normal
        // flow. Pickup / destination + map are kept so the rider can
        // quickly rebook the same trip inspirit of the real Uber app.

        resetRideFlowState();
 
        // The rider still deliberately chose a destination this
        // session-flow, so future edits may re-open the fare panel.

        hasUserChosenDestination.current = true;
 
        console.log(
          "Ride cancelled successfully",
        );
 
      } catch (error) {
 
        console.error(
          "Cancel Ride Error:",
          error.response?.data || error
        );
 
        alert(
          error.response?.data?.message ||
          "Failed to cancel ride. Please try again."
        );
      } finally {
        setRideCancelling(false);
      }
    };
 
  // ============================================================
  // GET DISTANCE WHEN BOTH LOCATIONS EXIST
  // ============================================================

  useEffect(() => {

    if (
      !pickupCoordinates ||
      !destinationCoordinates
    ) {

      // Either location was removed — clear stale route / fare so
      // the map does not keep showing an outdated polyline.
      setRouteCoordinates([]);
      setDistance(null);
      setDuration(null);
      setFare(null);
      setSelectedVehicle(null);
      return;
    }

    // Never auto-compute the fare on login / refresh purely from
    // restored state — that made the vehicle panel open immediately
    // and blocked entering pickup + destination. Only an active
    // destination choice in this session may trigger it.
    if (!hasUserChosenDestination.current) {
      return;
    }

    // Clear any previously computed fare / vehicle selection so the
    // recalculation below always reflects the latest locations.
    setFare(null);
    setSelectedVehicle(null);

    getDistanceTime();

  }, [
    pickupCoordinates,
    destinationCoordinates,
  ]);

  // ============================================================
  // RESTORE ACTIVE RIDE AFTER PAGE REFRESH
  //
  // pickup / destination + coordinates are restored synchronously
  // from localStorage, but the ride status / ride object are not
  // enough: a captain may have accepted the ride WHILE the rider
  // was refreshing. So on mount we ask the backend for the rider's
  // freshest active ride and re-sync every ride screen. If the stored
  // ride no longer exists (cancelled / completed / stale), we clear
  // all traces of the old trip so the page starts clean.

  useEffect(() => {
 
    // Only relevant when a ride was persisted from a previous page
    // load; otherwise there is nothing to re-validate.

    if (!ride) {
      return;
    }
 
    let active = true;
 
    const restoreActiveRide =
      async () => {
 
        try {
 
          const token =
            localStorage.getItem(
              "user"
            );
 
          if (!token) {
            return;
          }
 
          const response =
            await api.get(
              "/api/riders/active-ride",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );
 
          if (!active) {
            return;
          }
 
          const activeRide =
            response.data?.data;
 
          if (activeRide) {
 
            // The backend still has an in-progress ride - restore the
            // exact screen the rider saw before refreshing(and keep
            // listening for "ride-accepted" via the reconnected socket).
 
            const restoredRide = {
              ...activeRide,
              rideId:
                activeRide._id?.toString() ||
                activeRide.rideId,
            };
 
            setRide(restoredRide);
            setRideStatus(activeRide.status);
            setRideOtp(activeRide.otp || "");
 
            // An in-progress ride means the rider HAD chosen a destination
            // in a previous page load - allow the fare / route to be
            // recomputed so the refreshed map shows the same route polyline.

            hasUserChosenDestination.current = true;
 
            if (
              pickupCoordinates &&
              destinationCoordinates
            ) {
              getDistanceTime();
            }
 
          } else {
 
            // Stored ride is gone (cancelled / completed / stale) -
            // wipe every trace of the old trip.
 
            resetAllRideState();
          }
 
        } catch (error) {
 
          if (active) {
            console.error(
              "Restore active ride failed:",
              error.response?.data || error
            );
          }
        }
      };
 
    restoreActiveRide();
 
    return () => {
      active = false;
    };
 
  }, []);
 
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
        userLocation={userLocation}
        pickupCoordinates={pickupCoordinates}
        destinationCoordinates={destinationCoordinates}
        routeCoordinates={routeCoordinates}
        nearbyCaptains={nearbyCaptains}
        captainLocation={captainLocation}
        mapSelectionMode={mapSelectionMode}
        onMapLocationSelect={handleMapLocationSelect}
        setPickupCoordinates={handlePickupCoordinatesChange}
        setDestinationCoordinates={handleDestinationCoordinatesChange}
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

          <button
            type="button"
            onClick={handleCancelRide}
            disabled={rideCancelling}
            className="
              mt-3
              bg-white
              text-red-600
              px-3
              py-1.5
              rounded-lg
              text-sm
              font-bold
              hover:bg-gray-100
              disabled:opacity-50
              disabled:cursor-not-allowed
            "
          >
            {rideCancelling
              ? "Cancelling..."
              : "Cancel Ride"}
          </button>

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

            <button
              type="button"
              onClick={handleCancelRide}
              disabled={rideCancelling}
              className="
                mt-4
                w-full
                bg-red-500
                text-white
                py-3
                rounded-xl
                font-semibold
                hover:bg-red-600
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {rideCancelling
                ? "Cancelling..."
                : "Cancel Ride"}
            </button>

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

          <div>

            {/* --------------------------------------------------
                BACK / EDIT
                If the vehicle panel is open, let the rider go
                back and change pickup / destination instead of
                being locked into the fare selection screen.
            -------------------------------------------------- */}

            <button
              type="button"
              onClick={() => {
                setFare(null);
                setSelectedVehicle(null);
              }}
              className="
                mb-3
                bg-gray-100
                text-gray-700
                text-sm
                font-semibold
                px-3
                py-2
                rounded-lg
                hover:bg-gray-200
              "
            >
              ← Edit Pickup / Destination
            </button>

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

          </div>

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
                📍 Select Pickup on Map
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
                🎯 Select Destination on Map
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
