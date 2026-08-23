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
  setPickupCoordinates,
  setDestinationCoordinates,
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const currentMarker = useRef(null);
  const pickupMarker = useRef(null);
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

    // ==================================================
    // CURRENT USER LOCATION
    // ==================================================

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!map.current) return;

          const lng =
            position.coords.longitude;

          const lat =
            position.coords.latitude;

          // Don't create duplicate current marker
          if (!currentMarker.current) {
            currentMarker.current =
              new maplibregl.Marker({
                color: "green",
              })
                .setLngLat([lng, lat])
                .addTo(map.current);
          }

          map.current.flyTo({
            center: [lng, lat],
            zoom: 14,
          });
        },

        (error) => {
          console.log(
            "Current location error:",
            error
          );
        }
      );
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

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
          color: "blue",
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