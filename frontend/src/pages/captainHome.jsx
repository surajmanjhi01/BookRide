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

  // Set when the browser can't provide a GPS fix
  // (permission denied / unavailable / timeout). When this is
  // set while the captain is online, ride requests can never
  // reach the captain because his location is unknown/missing,
  // so we must surface it instead of failing silently.
  const [gpsError, setGpsError] =
    useState(null);

  // Manual location fallback — used when the browser denies GPS.
  // Lets the captain still go online and receive ride requests
  // (needs a known location) without granting browser permission.
  const [manualLat, setManualLat] =
    useState("");

  const [manualLng, setManualLng] =
    useState("");

  // Where the current location came from: "gps" | "manual" | null
  const [locationSource, setLocationSource] =
    useState(null);

  // Bump this to force the GPS effect to re-run (e.g. after the
  // user grants location permission in browser settings).
  const [gpsRetryTrigger, setGpsRetryTrigger] =
    useState(0);

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

  const [otpInput, setOtpInput] =
    useState("");

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
  // RESTORE ACTIVE RIDE AFTER PAGE REFRESH
  // ==================================================

  useEffect(() => {
    let cancelled = false;

    const restoreActiveRide =
      async () => {

        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          return;
        }

        try {

          const response =
            await api.get(
              "/api/captains/active-ride",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          const activeRide =
            response.data?.data;

          if (
            cancelled ||
            !activeRide
          ) {
            return;
          }

          // ---------------------------------------------
          // Defensive:
          // Never restore a ride that is hours old and was
          // never completed/cancelled. Otherwise the captain
          // dashboard would permanently show a ghost ride and
          // block every new ride request (the frontend ignores
          // requests while currentRideRef.current is set).
          // ---------------------------------------------

          const STALE_RIDE_MS =
            6 * 60 * 60 * 1000;

          if (activeRide.createdAt) {

            const ageMs =
              Date.now() -
              new Date(
                activeRide.createdAt
              ).getTime();

            if (ageMs > STALE_RIDE_MS) {

              console.log(
                "⚠️ Ignoring stale active ride created at:",
                new Date(
                  activeRide.createdAt
                ).toISOString()
              );

              return;
            }
          }

          console.log(
            "🔄 Restored active ride:",
            activeRide._id?.toString()
          );

          console.log(
            "Ride status:",
            activeRide.status
          );

          // ---------------------------------------------
          // SECURITY:
          // Never store the OTP on the captain side even
          // when restoring a ride
          // ---------------------------------------------

          const safeRide =
            { ...activeRide };

          delete safeRide.otp;

          const restoredRide = {
            ...safeRide,

            rideId:
              activeRide._id?.toString() ||
              activeRide.rideId,
          };

          setCurrentRide(
            restoredRide
          );

          currentRideRef.current =
            restoredRide;

          setRideStatus(
            activeRide.status ||
              "accepted"
          );

        } catch (error) {

          console.error(
            "❌ Restore active ride failed:",
            error.response?.data ||
              error
          );
        }
      };

    restoreActiveRide();

    return () => {
      cancelled = true;
    };

  }, []);

  // ==================================================
  // RESTORE ONLINE/OFFLINE STATUS AFTER PAGE REFRESH
  //
  // The backend captain document is the source of truth:
  //   GET /api/captains/profile  →  { status: "active" | "inactive", ... }
  //
  // A refresh must NOT force an online captain offline. If the
  // backend still says "active", we keep them online — which also
  // restarts GPS tracking (the GPS effect depends on isOnline) and
  // lets them keep receiving ride requests on the reconnected
  // socket.
  // ==================================================

  const statusRestoreRef =
    useRef(false);

  useEffect(() => {

    // Guard against React StrictMode double-invocation so the
    // profile is only fetched once per mount.
    if (statusRestoreRef.current) return;

    statusRestoreRef.current = true;

    let cancelled = false;

    const restoreStatus =
      async () => {

        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          return;
        }

        try {

          const response =
            await api.get(
              "/api/captains/profile",
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (cancelled) return;

          // getCaptainProfile responds with the captain document
          // directly (NOT wrapped in { data: ... }).
          const captain =
            response.data;

          const status =
            captain?.status;

          console.log(
            "🔄 Restored captain status:",
            status
          );

          setIsOnline(
            status === "active"
          );

        } catch (error) {

          console.error(
            "❌ Restore captain status failed:",
            error.response?.data ||
              error
          );

          // GPS permission errors / profile failures must NOT
          // crash the page or force a captain offline — keep the
          // existing UI state and show graceful feedback.
        }
      };

    restoreStatus();

    return () => {
      cancelled = true;
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
  // MANUAL LOCATION FALLBACK
  //
  // If the browser denies GPS access, the captain can still
  // type a latitude/longitude so the backend knows where he is
  // and can deliver nearby ride requests.
  // ==================================================

  const saveManualLocation =
    async () => {

      const latitude =
        Number(manualLat);

      const longitude =
        Number(manualLng);

      if (
        Number.isNaN(latitude) ||
        Number.isNaN(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {

        alert(
          "Enter a valid latitude (-90 to 90) and longitude (-180 to 180)."
        );

        return;
      }

      const token =
        localStorage.getItem(
          "token"
        );

      if (!token) {

        alert(
          "Captain token not found. Please login again."
        );

        return;
      }

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
          "📍 Manual location saved:",
          response.data
        );

        setLocation({
          latitude,
          longitude,
        });

        setLocationSource(
          "manual"
        );

        setGpsError(null);

        alert(
          "Manual location saved. You will now receive ride requests near this location."
        );

      } catch (error) {

        console.error(
          "❌ Manual location update failed:",
          error.response?.data ||
            error
        );

        alert(
          error.response?.data?.message ||
            "Failed to save manual location"
        );
      }
    };

  // ==================================================
  // GPS LOCATION
  // ==================================================

  useEffect(() => {

    if (!isOnline) {

      setLocation(null);

      setLocationSource(null);

      setGpsError(null);

      return;
    }

    if (
      !navigator.geolocation
    ) {

      const message =
        "Geolocation is not supported by this browser.";

      console.error(
        "❌ Geolocation is not supported by this browser"
      );

      setGpsError(message);

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

    // Starting a fresh GPS attempt → clear the previous error so
    // a "Retry GPS" click shows "Waiting for location…" again.
    setGpsError(null);

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

          // A GPS fix is available now — clear any previous error
          setGpsError(null);

          setLocationSource(
            "gps"
          );

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

          let message =
            "Could not get your location.";

          switch (
            error.code
          ) {

            case error.PERMISSION_DENIED:

              console.error(
                "❌ Location permission denied."
              );

              message =
                "Location permission was denied. " +
                "Allow location access for this site, " +
                "then reload to start receiving ride requests.";

              break;

            case error.POSITION_UNAVAILABLE:

              console.error(
                "❌ Location unavailable."
              );

              message =
                "Location is currently unavailable. " +
                "Check your device's GPS / network connection.";

              break;

            case error.TIMEOUT:

              console.error(
                "❌ Location request timed out."
              );

              message =
                "Location request timed out. " +
                "Try toggling offline/online or reloading the page.";

              break;

            default:

              console.error(
                "❌ Unknown GPS error."
              );
          }

          setGpsError(message);
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

  }, [isOnline, gpsRetryTrigger]);

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

          status:
            acceptedRide.status,

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
        // SECURITY:
        // The backend returns the full ride document,
        // which includes the OTP. Never store it on the
        // captain side - strip it out.
        // ---------------------------------------------

        const safeUpdatedRide =
          { ...updatedRide };

        delete safeUpdatedRide.otp;

        // ---------------------------------------------
        // Update current ride
        // ---------------------------------------------

        setCurrentRide(
          (prev) => ({
            ...prev,

            ...safeUpdatedRide,

            rideId:
              updatedRide._id?.toString() ||
              prev.rideId,
          })
        );

        currentRideRef.current =
          {
            ...currentRide,
            ...safeUpdatedRide,
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
  // VERIFY RIDE OTP
  // ==================================================

  const verifyRideOtp =
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

      if (
        !otpInput ||
        otpInput.length !== 4
      ) {

        setActionError(
          "Please enter the 4-digit OTP."
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
          "🔑 VERIFYING RIDE OTP"
        );

        console.log(
          "Ride ID:",
          currentRide.rideId
        );

        console.log(
          "================================="
        );

        const response =
          await api.post(
            `/api/riders/${currentRide.rideId}/verify-otp`,
            {
              otp: otpInput,
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
          "✅ OTP VERIFIED - RIDE STARTED"
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
        // SECURITY:
        // Strip OTP from the response before storing it
        // ---------------------------------------------

        const safeUpdatedRide =
          { ...updatedRide };

        delete safeUpdatedRide.otp;

        setCurrentRide(
          (prev) => ({
            ...prev,

            ...safeUpdatedRide,

            rideId:
              updatedRide._id?.toString() ||
              prev.rideId,
          })
        );

        currentRideRef.current =
          {
            ...currentRide,
            ...safeUpdatedRide,
            rideId:
              updatedRide._id?.toString() ||
              currentRide.rideId,
          };

        // ---------------------------------------------
        // IMPORTANT:
        // Use backend status ("ongoing")
        // ---------------------------------------------

        setRideStatus(
          updatedRide.status ||
            "ongoing"
        );

        // Clear the OTP input
        setOtpInput("");

      } catch (error) {

        console.error(
          "❌ OTP verification failed:",
          error.response?.data ||
            error
        );

        // ---------------------------------------------
        // Keep the ride in "arrived" state and show the
        // backend error message
        // ---------------------------------------------

        setActionError(
          error.response?.data?.message ||
            "Invalid OTP. Please try again."
        );

      } finally {

        setProcessingRideId(
          null
        );
      }
    };

  // ==================================================
  // COMPLETE RIDE
  // ==================================================

  const completeRide =
    async () => {

      if (
        !currentRide?.rideId
      ) {

        console.error(
          "❌ No current ride found"
        );

        setActionError(
          "No current ride found."
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
          "🏁 COMPLETING RIDE"
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
            `/api/riders/${currentRide.rideId}/complete`,
            {},
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        console.log(
          "✅ Ride completed:",
          response.data
        );

        // -----------------------------------------
        // Clear active ride.
        // The backend is the source of truth and has
        // already moved the ride to "completed".
        // -----------------------------------------

        setCurrentRide(null);

        currentRideRef.current =
          null;

        setRideStatus(null);

        // Clear any leftover ride requests so the
        // captain sees fresh ones.
        setRideRequests([]);

        console.log(
          "🚕 Captain is now available for new rides"
        );

      } catch (error) {

        console.error(
          "❌ Complete ride failed:",
          error.response?.data ||
            error
        );

        setActionError(
          error.response?.data?.message ||
            "Failed to complete ride."
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
          STATUS ALERTS
          (surface silent failures — if these are hidden the
          captain cannot tell why no ride requests arrive)
      ================================================ */}

      {isOnline &&
        gpsError && (

          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 mb-5">

            <p className="font-semibold text-red-700">
              ⚠️ Location unavailable — you won't receive ride requests
            </p>

            <p className="text-sm text-red-600 mt-1">
              {gpsError}
            </p>

            {/* ------------------------------------------
                RETRY GPS
            ------------------------------------------ */}

            <button
              onClick={() =>
                setGpsRetryTrigger(
                  (n) => n + 1
                )
              }
              className="mt-3 w-full py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold"
            >
              🔄 Retry GPS
            </button>

            {/* ------------------------------------------
                MANUAL LOCATION FALLBACK
            ------------------------------------------ */}

            <div className="mt-4 border-t-2 border-red-200 pt-4">

              <p className="text-sm font-semibold text-red-700 mb-2">
                Or set your location manually:
              </p>

              <div className="flex gap-2">

                <input
                  type="number"
                  step="any"
                  value={manualLat}
                  onChange={(e) =>
                    setManualLat(
                      e.target.value
                    )
                  }
                  placeholder="Latitude (e.g. 23.384)"
                  className="w-1/2 rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none"
                />

                <input
                  type="number"
                  step="any"
                  value={manualLng}
                  onChange={(e) =>
                    setManualLng(
                      e.target.value
                    )
                  }
                  placeholder="Longitude (e.g. 85.309)"
                  className="w-1/2 rounded-lg border border-red-300 px-3 py-2 text-sm focus:outline-none"
                />

              </div>

              <button
                onClick={saveManualLocation}
                className="mt-2 w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
              >
                📍 Save Manual Location
              </button>

            </div>

          </div>

        )}

      {isOnline &&
        !location &&
        !gpsError && (

          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5 mb-5">

            <p className="font-semibold text-yellow-800">
              ⏳ Waiting for your location…
            </p>

            <p className="text-sm text-yellow-700 mt-1">
              Ride requests are only sent to captains whose location
              is known. If this message stays, allow location access
              in your browser.
            </p>

          </div>

        )}

      {isOnline &&
        !socketConnected && (

          <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-5 mb-5">

            <p className="font-semibold text-orange-700">
              ⚠️ Socket disconnected — reconnecting…
            </p>

            <p className="text-sm text-orange-600 mt-1">
              Ride requests cannot reach you while the connection is
              down. Keep this tab open.
            </p>

          </div>

        )}

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
              {rideStatus ||
                currentRide?.status}
            </span>

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

            {(rideStatus ===
              "accepted" ||
              currentRide?.status ===
                "accepted") && (

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

            {/* ARRIVED → VERIFY OTP & START */}

            {(rideStatus ===
              "arrived" ||
              currentRide?.status ===
                "arrived") && (

              <div className="w-full">

                <p className="text-sm text-gray-600 mb-2">
                  Ask the rider for the 4-digit OTP and enter it below.
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Enter 4-digit OTP"
                  value={otpInput}
                  onChange={(e) =>
                    setOtpInput(
                      e.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-3 text-center text-2xl font-bold tracking-widest outline-none focus:border-indigo-500"
                />

                <button
                  onClick={verifyRideOtp}
                  disabled={
                    processingRideId ===
                    currentRide.rideId ||
                    otpInput.length !== 4
                  }
                  className={`w-full text-white py-3 rounded-xl font-semibold transition ${
                    processingRideId ===
                    currentRide.rideId ||
                    otpInput.length !== 4
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-indigo-500 hover:bg-indigo-600"
                  }`}
                >
                  {processingRideId ===
                  currentRide.rideId
                    ? "Verifying..."
                    : "Verify OTP & Start Ride"}
                </button>

              </div>

            )}

            {/* ONGOING → COMPLETE */}

            {(rideStatus ===
              "ongoing" ||
              currentRide?.status ===
                "ongoing") && (

              <button
                onClick={completeRide}
                disabled={
                  processingRideId ===
                  currentRide?.rideId
                }
                className={`flex-1 text-white py-3 rounded-xl font-semibold transition ${
                  processingRideId ===
                  currentRide?.rideId
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-500 hover:bg-green-600"
                }`}
              >

                {processingRideId ===
                currentRide?.rideId
                  ? "Completing..."
                  : "Complete Ride"}

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
                {locationSource === "manual"
                  ? "Manual location set"
                  : "GPS tracking active"}
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