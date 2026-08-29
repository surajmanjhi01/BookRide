import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import api from "../services/axios";
import socket from "../services/socket";

const CaptainHome = () => {
  // ==================================================
  // CAPTAIN STATES
  // ==================================================

  const [isOnline, setIsOnline] =
    useState(false);

  const [location, setLocation] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  // ==================================================
  // SOCKET STATES
  // ==================================================

  const [socketConnected, setSocketConnected] =
    useState(false);

  // ==================================================
  // RIDE REQUESTS
  // ==================================================

  const [rideRequests, setRideRequests] =
    useState([]);

  // ==================================================
  // CURRENT RIDE
  // ==================================================

  const [currentRide, setCurrentRide] =
    useState(null);

  const [rideStatus, setRideStatus] =
    useState(null);

  // ==================================================
  // PROCESSING
  // ==================================================

  const [processingRideId, setProcessingRideId] =
    useState(null);

  const [actionError, setActionError] =
    useState(null);

  // ==================================================
  // REFS
  // ==================================================

  const currentRideRef =
    useRef(null);

  // ==================================================
  // SOCKET CONNECTION
  // ==================================================

  useEffect(() => {
    const token =
      localStorage.getItem("token");

    if (!token) {
      console.error(
        "❌ Captain token not found in localStorage"
      );

      console.log(
        "Available localStorage:",
        Object.keys(localStorage)
      );

      return;
    }

    console.log(
      "🔌 Initializing captain socket..."
    );

    // Give JWT to Socket.IO
    socket.auth = {
      token,
    };

    // ==================================================
    // SOCKET CONNECT
    // ==================================================

    const handleConnect = () => {
      console.log(
        "================================="
      );

      console.log(
        "✅ CAPTAIN SOCKET CONNECTED"
      );

      console.log(
        "Socket ID:",
        socket.id
      );

      console.log(
        "================================="
      );

      setSocketConnected(true);

      // -----------------------------------------------
      // Decode JWT
      // -----------------------------------------------

      try {
        const tokenParts =
          token.split(".");

        if (
          tokenParts.length !== 3
        ) {
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

        const captainId =
          payload.id;

        if (!captainId) {
          throw new Error(
            "Captain ID not found inside JWT"
          );
        }

        console.log(
          "🚕 Captain ID:",
          captainId
        );

        // -----------------------------------------------
        // Register captain with backend
        // -----------------------------------------------

        socket.emit(
          "join-captain",
          {
            captainId,
          }
        );

        console.log(
          "✅ join-captain emitted"
        );

      } catch (error) {

        console.error(
          "❌ JWT decode error:",
          error
        );
      }
    };

    // ==================================================
    // SOCKET DISCONNECT
    // ==================================================

    const handleDisconnect = (
      reason
    ) => {

      console.log(
        "❌ CAPTAIN SOCKET DISCONNECTED:",
        reason
      );

      setSocketConnected(false);
    };

    // ==================================================
    // SOCKET CONNECTION ERROR
    // ==================================================

    const handleConnectError = (
      error
    ) => {

      console.error(
        "❌ CAPTAIN SOCKET CONNECTION ERROR:",
        error.message
      );

      setSocketConnected(false);
    };

    // ==================================================
    // NEW RIDE REQUEST
    // ==================================================

    const handleNewRideRequest = (
      ride
    ) => {

      console.log(
        "================================="
      );

      console.log(
        "🚨 NEW RIDE REQUEST RECEIVED"
      );

      console.log(
        "Ride:",
        ride
      );

      console.log(
        "================================="
      );

      // -----------------------------------------------
      // Don't accept new requests during active ride
      // -----------------------------------------------

      if (
        currentRideRef.current
      ) {

        console.log(
          "⚠️ Captain is already on a trip."
        );

        console.log(
          "⚠️ Ignoring new ride request."
        );

        return;
      }

      // -----------------------------------------------
      // Add ride request
      // -----------------------------------------------

      setRideRequests(
        (prevRequests) => {

          const alreadyExists =
            prevRequests.some(
              (request) =>
                request.rideId ===
                ride.rideId
            );

          if (
            alreadyExists
          ) {

            console.log(
              "⚠️ Ride request already exists:",
              ride.rideId
            );

            return prevRequests;
          }

          return [
            ...prevRequests,
            ride,
          ];
        }
      );

      // -----------------------------------------------
      // Browser notification
      // -----------------------------------------------

      if (
        "Notification" in window &&
        Notification.permission ===
          "granted"
      ) {

        new Notification(
          "🚕 New Ride Request",
          {
            body:
              `Pickup: ${
                ride.pickup?.address ||
                "Unknown location"
              }`,
          }
        );
      }
    };

    // ==================================================
    // REGISTER SOCKET LISTENERS
    // ==================================================

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
      "new-ride-request",
      handleNewRideRequest
    );

    // ==================================================
    // CONNECT SOCKET
    // ==================================================

    if (
      !socket.connected
    ) {

      console.log(
        "🔌 Connecting captain socket..."
      );

      socket.connect();

    } else {

      console.log(
        "✅ Socket already connected:",
        socket.id
      );

      handleConnect();
    }

    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {

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
        "new-ride-request",
        handleNewRideRequest
      );

      console.log(
        "🧹 Captain socket listeners removed"
      );
    };

  }, []);

  // ==================================================
  // REQUEST NOTIFICATION PERMISSION
  // ==================================================

  useEffect(() => {

    if (
      "Notification" in window &&
      Notification.permission ===
        "default"
    ) {

      Notification.requestPermission();
    }

  }, []);

  // ==================================================
  // TOGGLE ONLINE / OFFLINE
  // ==================================================

  const toggleOnlineStatus =
    async () => {

      try {

        // ---------------------------------------------
        // Don't go offline during active ride
        // ---------------------------------------------

        if (
          isOnline &&
          currentRideRef.current
        ) {

          console.log(
            "⚠️ Cannot go offline while on a trip"
          );

          alert(
            "You cannot go offline while on an active trip. Complete the ride first."
          );

          return;
        }

        setLoading(true);

        const newStatus =
          isOnline
            ? "inactive"
            : "active";

        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {

          console.error(
            "❌ Captain token not found"
          );

          return;
        }

        const response =
          await api.patch(
            "/api/captains/status",
            {
              status:
                newStatus,
            },
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        console.log(
          "Captain status:",
          response.data
        );

        setIsOnline(
          newStatus === "active"
        );

        // ---------------------------------------------
        // Clear ride requests when offline
        // ---------------------------------------------

        if (
          newStatus ===
          "inactive"
        ) {

          setRideRequests([]);
        }

      } catch (error) {

        console.error(
          "❌ Status update failed:",
          error.response?.data ||
            error
        );

      } finally {

        setLoading(false);
      }
    };

  // ==================================================
  // GPS LOCATION
  // ==================================================

  useEffect(() => {

    if (!isOnline) {

      setLocation(null);

      return;
    }

    if (
      !navigator.geolocation
    ) {

      console.error(
        "❌ Geolocation is not supported by this browser"
      );

      return;
    }

    const token =
      localStorage.getItem(
        "token"
      );

    if (!token) {

      console.error(
        "❌ Captain token not found"
      );

      return;
    }

    console.log(
      "📍 GPS tracking started"
    );

    const watchId =
      navigator.geolocation.watchPosition(

        async (position) => {

          const latitude =
            position.coords.latitude;

          const longitude =
            position.coords.longitude;

          console.log(
            "📍 Captain Location:",
            {
              latitude,
              longitude,
            }
          );

          setLocation({
            latitude,
            longitude,
          });

          try {

            const response =
              await api.patch(
                "/api/captains/location",
                {
                  latitude,
                  longitude,
                },
                {
                  headers: {
                    Authorization:
                      `Bearer ${token}`,
                  },
                }
              );

            console.log(
              "📍 Location updated:",
              response.data
            );

          } catch (error) {

            console.error(
              "❌ Location update failed:",
              error.response?.data ||
                error
            );
          }
        },

        (error) => {

          console.error(
            "❌ GPS Error:",
            error
          );

          switch (
            error.code
          ) {

            case error.PERMISSION_DENIED:

              console.error(
                "❌ Location permission denied."
              );

              break;

            case error.POSITION_UNAVAILABLE:

              console.error(
                "❌ Location unavailable."
              );

              break;

            case error.TIMEOUT:

              console.error(
                "❌ Location request timed out."
              );

              break;

            default:

              console.error(
                "❌ Unknown GPS error."
              );
          }
        },

        {
          enableHighAccuracy:
            true,

          maximumAge:
            5000,

          timeout:
            10000,
        }
      );

    return () => {

      navigator.geolocation.clearWatch(
        watchId
      );

      console.log(
        "📍 GPS tracking stopped"
      );
    };

  }, [isOnline]);

  // ==================================================
  // ACCEPT RIDE
  // ==================================================

  const acceptRide =
    async (rideId) => {

      console.log(
        "================================="
      );

      console.log(
        "🚕 ACCEPTING RIDE"
      );

      console.log(
        "Ride ID:",
        rideId
      );

      console.log(
        "================================="
      );

      setProcessingRideId(
        rideId
      );

      setActionError(
        null
      );

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {

        console.error(
          "❌ Captain token not found"
        );

        setActionError(
          "Authentication error. Please login again."
        );

        setProcessingRideId(
          null
        );

        return;
      }

      try {

        const response =
          await api.patch(
            `/api/riders/${rideId}/accept`,
            {},
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
          "✅ RIDE ACCEPTED"
        );

        console.log(
          "Response:",
          response.data
        );

        console.log(
          "================================="
        );

        // ---------------------------------------------
        // Remove accepted request
        // ---------------------------------------------

        setRideRequests(
          (prevRequests) =>
            prevRequests.filter(
              (ride) =>
                ride.rideId !==
                rideId
            )
        );

        // ---------------------------------------------
        // Store accepted ride
        // ---------------------------------------------

        const acceptedRide =
          response.data.data;

        const rideData = {

          rideId:
            acceptedRide._id?.toString() ||
            rideId,

          pickup:
            acceptedRide.pickup,

          destination:
            acceptedRide.destination,

          distance:
            acceptedRide.distance,

          duration:
            acceptedRide.duration,

          fare:
            acceptedRide.fare,

          vehicleType:
            acceptedRide.vehicleType,

          otp:
            acceptedRide.otp,

          captain:
            acceptedRide.captain,

        };

        setCurrentRide(
          rideData
        );

        currentRideRef.current =
          rideData;

        setRideStatus(
          acceptedRide.status ||
            "accepted"
        );

      } catch (error) {

        console.error(
          "❌ Accept ride failed:",
          error.response?.data ||
            error
        );

        setActionError(
          error.response?.data?.message ||
            "Failed to accept ride. Please try again."
        );

      } finally {

        setProcessingRideId(
          null
        );
      }
    };

  // ==================================================
  // REJECT RIDE
  // ==================================================

  const rejectRide =
    async (rideId) => {

      console.log(
        "================================="
      );

      console.log(
        "❌ REJECTING RIDE"
      );

      console.log(
        "Ride ID:",
        rideId
      );

      console.log(
        "================================="
      );

      setProcessingRideId(
        rideId
      );

      setActionError(
        null
      );

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {

        console.error(
          "❌ Captain token not found"
        );

        setActionError(
          "Authentication error. Please login again."
        );

        setProcessingRideId(
          null
        );

        return;
      }

      try {

        const response =
          await api.patch(
            `/api/riders/${rideId}/reject`,
            {},
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        console.log(
          "❌ Ride rejected:",
          response.data
        );

        setRideRequests(
          (prevRequests) =>
            prevRequests.filter(
              (ride) =>
                ride.rideId !==
                rideId
            )
        );

      } catch (error) {

        console.error(
          "❌ Reject ride failed:",
          error.response?.data ||
            error
        );

        setActionError(
          error.response?.data?.message ||
            "Failed to reject ride. Please try again."
        );

      } finally {

        setProcessingRideId(
          null
        );
      }
    };

  // ==================================================
  // MARK RIDE ARRIVED
  // ==================================================

  const markRideArrived =
    async () => {

      if (
        !currentRide?.rideId
      ) {

        console.error(
          "❌ No current ride found"
        );

        setActionError(
          "No active ride found."
        );

        return;
      }

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {

        console.error(
          "❌ Captain token not found"
        );

        setActionError(
          "Authentication error. Please login again."
        );

        return;
      }

      try {

        setProcessingRideId(
          currentRide.rideId
        );

        setActionError(
          null
        );

        console.log(
          "================================="
        );

        console.log(
          "📍 MARKING RIDE ARRIVED"
        );

        console.log(
          "Ride ID:",
          currentRide.rideId
        );

        console.log(
          "================================="
        );

        const response =
          await api.patch(
            `/api/riders/${currentRide.rideId}/arrived`,
            {},
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
          "✅ CAPTAIN ARRIVED"
        );

        console.log(
          "Response:",
          response.data
        );

        console.log(
          "================================="
        );

        const updatedRide =
          response.data.data;

        // ---------------------------------------------
        // Update current ride
        // ---------------------------------------------

        setCurrentRide(
          (prev) => ({
            ...prev,

            ...updatedRide,

            rideId:
              updatedRide._id?.toString() ||
              prev.rideId,
          })
        );

        currentRideRef.current =
          {
            ...currentRide,
            ...updatedRide,
            rideId:
              updatedRide._id?.toString() ||
              currentRide.rideId,
          };

        // ---------------------------------------------
        // IMPORTANT
        // Use backend status
        // ---------------------------------------------

        setRideStatus(
          updatedRide.status ||
            "arrived"
        );

      } catch (error) {

        console.error(
          "❌ Mark arrived failed:",
          error.response?.data ||
            error
        );

        setActionError(
          error.response?.data?.message ||
            "Failed to mark ride as arrived."
        );

      } finally {

        setProcessingRideId(
          null
        );
      }
    };

  // ==================================================
  // UI
  // ==================================================

  return (
    <div className="min-h-screen bg-gray-100 p-5">

      {/* ================================================
          HEADER
      ================================================ */}

      <div className="flex justify-between items-start mb-6">

        <div>

          <h1 className="text-2xl font-bold">
            Captain Dashboard
          </h1>

          <p className="text-gray-500">
            Manage your availability and location
          </p>

          {/* SOCKET STATUS */}

          <div className="mt-2 flex items-center gap-2">

            <span
              className={`w-2.5 h-2.5 rounded-full ${
                socketConnected
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            />

            <span
              className={`text-sm ${
                socketConnected
                  ? "text-green-600"
                  : "text-red-500"
              }`}
            >

              {socketConnected
                ? "Socket Connected"
                : "Socket Disconnected"}

            </span>

          </div>

        </div>

        {/* ONLINE STATUS */}

        <div
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            isOnline
              ? "bg-green-100 text-green-700"
              : "bg-gray-200 text-gray-600"
          }`}
        >

          {isOnline
            ? "ONLINE"
            : "OFFLINE"}

        </div>

      </div>

      {/* ================================================
          CAPTAIN STATUS
      ================================================ */}

      <div className="bg-white rounded-2xl shadow-md p-6 mb-5">

        <h2 className="text-xl font-semibold mb-2">
          Captain Status
        </h2>

        <p className="text-gray-500 mb-5">

          {isOnline
            ? "You are currently available for rides."
            : "Go online to start receiving ride requests."}

        </p>

        <button
          onClick={
            toggleOnlineStatus
          }
          disabled={loading}
          className={`w-full py-4 rounded-xl text-white font-semibold text-lg transition ${
            isOnline
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          } ${
            loading
              ? "opacity-50 cursor-not-allowed"
              : ""
          }`}
        >

          {loading
            ? "Updating..."
            : isOnline
            ? "Go Offline"
            : "Go Online"}

        </button>

      </div>

      {/* ================================================
          CURRENT RIDE
      ================================================ */}

      {currentRide && (

        <div className="bg-white rounded-2xl shadow-md p-6 mb-5 border-2 border-green-400">

          <div className="flex justify-between items-center mb-5">

            <h2 className="text-xl font-semibold">
              🚗 Current Ride
            </h2>

            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold uppercase">
              {rideStatus}
            </span>

          </div>

          {/* OTP */}

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 text-center">

            <p className="text-sm text-gray-600 mb-1">
              Share this OTP with the rider
            </p>

            <p className="text-4xl font-bold tracking-widest text-green-700">
              {currentRide.otp}
            </p>

          </div>

          {/* PICKUP */}

          <div className="mb-4">

            <p className="text-sm text-gray-500">
              📍 Pickup
            </p>

            <p className="font-medium">
              {currentRide.pickup?.address ||
                "Pickup location"}
            </p>

          </div>

          {/* DESTINATION */}

          <div className="mb-4">

            <p className="text-sm text-gray-500">
              🏁 Destination
            </p>

            <p className="font-medium">
              {currentRide.destination?.address ||
                "Destination"}
            </p>

          </div>

          {/* DISTANCE / DURATION / FARE */}

          <div className="grid grid-cols-3 gap-3 mb-5">

            <div className="bg-gray-100 rounded-lg p-3">

              <p className="text-xs text-gray-500">
                Distance
              </p>

              <p className="font-semibold">
                {currentRide.distance} km
              </p>

            </div>

            <div className="bg-gray-100 rounded-lg p-3">

              <p className="text-xs text-gray-500">
                Duration
              </p>

              <p className="font-semibold">
                {currentRide.duration} min
              </p>

            </div>

            <div className="bg-gray-100 rounded-lg p-3">

              <p className="text-xs text-gray-500">
                Fare
              </p>

              <p className="font-semibold text-green-600">
                ₹
                {currentRide.fare?.totalFare}
              </p>

            </div>

          </div>

          {/* ACTION ERROR */}

          {actionError && (

            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              ⚠️ {actionError}
            </div>

          )}

          {/* ==========================================
              RIDE ACTIONS
          ========================================== */}

          <div className="flex gap-3">

            {/* ACCEPTED → ARRIVED */}

            {rideStatus ===
              "accepted" && (

              <button
                onClick={
                  markRideArrived
                }
                disabled={
                  processingRideId ===
                  currentRide.rideId
                }
                className={`flex-1 text-white py-3 rounded-xl font-semibold transition ${
                  processingRideId ===
                  currentRide.rideId
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >

                {processingRideId ===
                currentRide.rideId
                  ? "Updating..."
                  : "I've Arrived"}

              </button>

            )}

            {/* ARRIVED → START RIDE */}

            {rideStatus ===
              "arrived" && (

              <button
                onClick={() => {
                  console.log(
                    "⚠️ OTP verification not implemented yet"
                  );

                  alert(
                    "Next step: verify OTP before starting the ride."
                  );
                }}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-3 rounded-xl font-semibold transition"
              >
                Start Ride
              </button>

            )}

            {/* ONGOING → COMPLETE */}

            {rideStatus ===
              "ongoing" && (

              <button
                onClick={() => {

                  console.log(
                    "⚠️ Complete ride API not implemented yet"
                  );

                  alert(
                    "Complete Ride will be implemented next."
                  );

                }}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-semibold transition"
              >
                Complete Ride
              </button>

            )}

          </div>

        </div>

      )}

      {/* ================================================
          NEW RIDE REQUESTS
      ================================================ */}

      {rideRequests.length > 0 && (

        <div className="bg-white rounded-2xl shadow-md p-6 mb-5">

          <div className="flex justify-between items-center mb-5">

            <h2 className="text-xl font-semibold">
              🚨 New Ride Requests
            </h2>

            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
              {rideRequests.length}
            </span>

          </div>

          {/* ACTION ERROR */}

          {actionError && (

            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              ⚠️ {actionError}
            </div>

          )}

          <div className="space-y-4">

            {rideRequests.map(
              (ride) => {

                const isProcessing =
                  processingRideId ===
                  ride.rideId;

                return (

                  <div
                    key={ride.rideId}
                    className={`border border-gray-200 rounded-xl p-5 ${
                      isProcessing
                        ? "opacity-60"
                        : ""
                    }`}
                  >

                    {/* VEHICLE */}

                    <div className="flex justify-between items-center mb-4">

                      <div>

                        <p className="text-sm text-gray-500">
                          Vehicle Type
                        </p>

                        <p className="font-bold text-lg capitalize">
                          {ride.vehicleType}
                        </p>

                      </div>

                      <div className="text-right">

                        <p className="text-sm text-gray-500">
                          Fare
                        </p>

                        <p className="font-bold text-xl text-green-600">
                          ₹
                          {ride.fare?.totalFare}
                        </p>

                      </div>

                    </div>

                    {/* PICKUP */}

                    <div className="mb-4">

                      <p className="text-sm text-gray-500">
                        📍 Pickup
                      </p>

                      <p className="font-medium">
                        {ride.pickup?.address ||
                          "Pickup location"}
                      </p>

                    </div>

                    {/* DESTINATION */}

                    <div className="mb-4">

                      <p className="text-sm text-gray-500">
                        🏁 Destination
                      </p>

                      <p className="font-medium">
                        {ride.destination?.address ||
                          "Destination"}
                      </p>

                    </div>

                    {/* DISTANCE / DURATION */}

                    <div className="grid grid-cols-2 gap-3 mb-5">

                      <div className="bg-gray-100 rounded-lg p-3">

                        <p className="text-xs text-gray-500">
                          Distance
                        </p>

                        <p className="font-semibold">
                          {ride.distance} km
                        </p>

                      </div>

                      <div className="bg-gray-100 rounded-lg p-3">

                        <p className="text-xs text-gray-500">
                          Duration
                        </p>

                        <p className="font-semibold">
                          {ride.duration} min
                        </p>

                      </div>

                    </div>

                    {/* BUTTONS */}

                    <div className="flex gap-3">

                      <button
                        onClick={() =>
                          acceptRide(
                            ride.rideId
                          )
                        }
                        disabled={
                          isProcessing
                        }
                        className={`flex-1 text-white py-3 rounded-xl font-semibold transition ${
                          isProcessing
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-500 hover:bg-green-600"
                        }`}
                      >

                        {isProcessing
                          ? "Processing..."
                          : "Accept Ride"}

                      </button>

                      <button
                        onClick={() =>
                          rejectRide(
                            ride.rideId
                          )
                        }
                        disabled={
                          isProcessing
                        }
                        className={`flex-1 text-white py-3 rounded-xl font-semibold transition ${
                          isProcessing
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                      >

                        {isProcessing
                          ? "Processing..."
                          : "Reject"}

                      </button>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </div>

      )}

      {/* ================================================
          NO RIDE REQUEST
      ================================================ */}

      {isOnline &&
        rideRequests.length ===
          0 &&
        !currentRide && (

        <div className="bg-white rounded-2xl shadow-md p-6 mb-5">

          <div className="text-center py-6">

            <div className="text-4xl mb-3">
              🚕
            </div>

            <h2 className="text-lg font-semibold">
              Waiting for ride requests
            </h2>

            <p className="text-gray-500 text-sm mt-1">
              Nearby ride requests will appear here.
            </p>

          </div>

        </div>

      )}

      {/* ================================================
          LOCATION
      ================================================ */}

      <div className="bg-white rounded-2xl shadow-md p-6">

        <h2 className="text-xl font-semibold mb-4">
          Current Location
        </h2>

        {isOnline &&
        location ? (

          <div className="space-y-2">

            <div className="flex justify-between">

              <span className="text-gray-500">
                Latitude
              </span>

              <span className="font-semibold">
                {location.latitude.toFixed(
                  6
                )}
              </span>

            </div>

            <div className="flex justify-between">

              <span className="text-gray-500">
                Longitude
              </span>

              <span className="font-semibold">
                {location.longitude.toFixed(
                  6
                )}
              </span>

            </div>

            <div className="mt-4 flex items-center gap-2 text-green-600">

              <span className="w-3 h-3 bg-green-500 rounded-full" />

              <span className="text-sm">
                GPS tracking active
              </span>

            </div>

          </div>

        ) : (

          <p className="text-gray-500">

            {isOnline
              ? "Waiting for GPS location..."
              : "Go online to start location tracking."}

          </p>

        )}

      </div>

    </div>
  );
};

export default CaptainHome;