import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const openStreetMapStyle = {
  version: 8,

  sources: {
    openstreetmap: {
      type: "raster",
      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },

  layers: [
    {
      id: "openstreetmap",
      type: "raster",
      source: "openstreetmap",
    },
  ],
};

const MapView = ({
  pickupCoordinates,
  destinationCoordinates,
  routeCoordinates = [],
  captainLocation,
  userLocation,
  mapSelectionMode,
  onMapLocationSelect,
  // Kept so the draggable on-map markers can still push coordinate
  // updates back into Home without breaking existing behaviour.
  setPickupCoordinates = () => {},
  setDestinationCoordinates = () => {},
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  // 📍 User's real GPS location marker (blue)
  const userLocationMarker = useRef(null);

  // 🟢 Pickup marker (green)
  const pickupMarker = useRef(null);

  // 🔴 Destination marker (red)
  const destinationMarker = useRef(null);

  // 🚕 Captain marker
  const captainMarker = useRef(null);

  // ==================================================
  // INITIALIZE MAP
  // ==================================================

  useEffect(() => {
    if (map.current) return;

    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: openStreetMapStyle,
      center: [85.324, 23.3441],
      zoom: 13,
    });

    map.current.addControl(
      new maplibregl.NavigationControl(),
      "top-right"
    );

    // NOTE: The user's live GPS location is resolved in Home.jsx and
    // passed in as `userLocation`. We render its marker below instead of
    // resolving it here, so the marker stays pinned at the real GPS
    // position even after the user manually changes the pickup location.

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // ==================================================
  // USER LIVE LOCATION MARKER (BLUE)
  // ==================================================

  useEffect(() => {
    if (!map.current || !userLocation) {
      return;
    }

    const lng = userLocation.lng;
    const lat = userLocation.lat;

    if (!userLocationMarker.current) {
      userLocationMarker.current =
        new maplibregl.Marker({
          color: "#2563EB",
        })
          .setLngLat([lng, lat])
          .addTo(map.current);

      // Center the map on the user's real position only once
      map.current.flyTo({
        center: [lng, lat],
        zoom: 14,
      });
    } else {
      userLocationMarker.current.setLngLat([
        lng,
        lat,
      ]);
    }
  }, [userLocation]);

  // ==================================================
  // PICKUP MARKER
  // ==================================================

  useEffect(() => {
    if (!map.current || !pickupCoordinates) {
      return;
    }

    const lng = pickupCoordinates.lng;
    const lat = pickupCoordinates.lat;

    if (!pickupMarker.current) {
      pickupMarker.current =
        new maplibregl.Marker({
          color: "#16A34A",
          draggable: true,
        })
          .setLngLat([lng, lat])
          .addTo(map.current);

      pickupMarker.current.on(
        "dragend",
        () => {
          const position =
            pickupMarker.current.getLngLat();

          setPickupCoordinates({
            lng: position.lng,
            lat: position.lat,
          });
        }
      );
    } else {
      pickupMarker.current.setLngLat([
        lng,
        lat,
      ]);
    }
  }, [
    pickupCoordinates,
    setPickupCoordinates,
  ]);

  // ==================================================
  // DESTINATION MARKER
  // ==================================================

  useEffect(() => {
    if (
      !map.current ||
      !destinationCoordinates
    ) {
      return;
    }

    const lng =
      destinationCoordinates.lng;

    const lat =
      destinationCoordinates.lat;

    if (!destinationMarker.current) {
      destinationMarker.current =
        new maplibregl.Marker({
          color: "red",
          draggable: true,
        })
          .setLngLat([lng, lat])
          .addTo(map.current);

      destinationMarker.current.on(
        "dragend",
        () => {
          const position =
            destinationMarker.current.getLngLat();

          setDestinationCoordinates({
            lng: position.lng,
            lat: position.lat,
          });
        }
      );
    } else {
      destinationMarker.current.setLngLat([
        lng,
        lat,
      ]);
    }
  }, [
    destinationCoordinates,
    setDestinationCoordinates,
  ]);

  // ==================================================
  // 🚕 CAPTAIN LIVE LOCATION
  // ==================================================

  useEffect(() => {
    if (
      !map.current ||
      !captainLocation
    ) {
      return;
    }

    const {
      latitude,
      longitude,
    } = captainLocation;

    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return;
    }

    console.log(
      "🚕 Updating captain marker:",
      {
        latitude,
        longitude,
      }
    );

    // -----------------------------------------------
    // CREATE CAPTAIN MARKER
    // -----------------------------------------------

    if (!captainMarker.current) {
      captainMarker.current =
        new maplibregl.Marker({
          color: "black",
        })
          .setLngLat([
            longitude,
            latitude,
          ])
          .addTo(map.current);

      console.log(
        "🚕 Captain marker created"
      );
    }

    // -----------------------------------------------
    // MOVE EXISTING CAPTAIN MARKER
    // -----------------------------------------------

    else {
      captainMarker.current.setLngLat([
        longitude,
        latitude,
      ]);

      console.log(
        "🚕 Captain marker moved"
      );
    }

  }, [captainLocation]);

  // ==================================================
  // MAP CLICK → SELECT PICKUP / DESTINATION
  // ==================================================

  useEffect(() => {
    if (!map.current) return;

    // Only enable selection when a mode is explicitly active
    if (
      mapSelectionMode !== "pickup" &&
      mapSelectionMode !== "destination"
    ) {
      return;
    }

    const handleMapClick = (event) => {
      if (!onMapLocationSelect) return;
      if (!event || !event.lngLat) return;

      const { lat, lng } = event.lngLat;

      onMapLocationSelect({ lat, lng });
    };

    map.current.on("click", handleMapClick);

    return () => {
      if (map.current) {
        map.current.off("click", handleMapClick);
      }
    };
  }, [mapSelectionMode, onMapLocationSelect]);

  // ==================================================
  // DRAW ROUTE
  // ==================================================

  useEffect(() => {
    if (
      !map.current ||
      !routeCoordinates ||
      routeCoordinates.length === 0
    ) {
      return;
    }

    const drawRoute = () => {
      if (!map.current) return;

      const geojson = {
        type: "Feature",

        geometry: {
          type: "LineString",
          coordinates: routeCoordinates,
        },
      };

      // -----------------------------------------------
      // UPDATE EXISTING ROUTE
      // -----------------------------------------------

      if (map.current.getSource("route")) {
        map.current
          .getSource("route")
          .setData(geojson);
      }

      // -----------------------------------------------
      // CREATE ROUTE
      // -----------------------------------------------

      else {
        map.current.addSource("route", {
          type: "geojson",
          data: geojson,
        });

        map.current.addLayer({
          id: "route",

          type: "line",

          source: "route",

          layout: {
            "line-cap": "round",
            "line-join": "round",
          },

          paint: {
            "line-color": "#2563EB",
            "line-width": 6,
            "line-opacity": 0.9,
          },
        });
      }

      // -----------------------------------------------
      // FIT MAP TO ROUTE
      // -----------------------------------------------

      const bounds =
        new maplibregl.LngLatBounds();

      routeCoordinates.forEach(
        (coordinate) => {
          bounds.extend(coordinate);
        }
      );

      map.current.fitBounds(bounds, {
        padding: 80,
        duration: 1000,
      });
    };

    if (map.current.isStyleLoaded()) {
      drawRoute();
    } else {
      map.current.once(
        "load",
        drawRoute
      );
    }
  }, [routeCoordinates]);

  // ==================================================
  // UI
  // ==================================================

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
    />
  );
};

export default MapView;