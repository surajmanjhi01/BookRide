
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ==================================================
// OPENSTREETMAP STYLE
// ==================================================

const openStreetMapStyle = {
  version: 8,
  sources: {
    openstreetmap: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
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

// ==================================================
// MAP VIEW
// ==================================================

const MapView = ({
  userLocation,
  pickupCoordinates,
  destinationCoordinates,
  routeCoordinates = [],
  nearbyCaptains = [],
  captainLocation,
  mapSelectionMode,
  onMapLocationSelect,
  setPickupCoordinates = () => {},
  setDestinationCoordinates = () => {},
  readOnly = false,
}) => {
  // ==================================================
  // MAP REFERENCES
  // ==================================================

  const mapContainer = useRef(null);
  const map = useRef(null);

  // ==================================================
  // MARKERS
  // ==================================================

  const userLocationMarker = useRef(null);
  const pickupMarker = useRef(null);
  const destinationMarker = useRef(null);
  const captainMarker = useRef(null);
  const nearbyCaptainMarkers = useRef(new Map());

  // Always use the latest map-click callback.
  const onMapLocationSelectRef = useRef(onMapLocationSelect);

  useEffect(() => {
    onMapLocationSelectRef.current = onMapLocationSelect;
  }, [onMapLocationSelect]);

  // ==================================================
  // INITIALIZE MAP — once
  // ==================================================

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

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

    return () => {
      const removeMarker = (marker) => {
        if (marker) marker.remove();
      };

      removeMarker(userLocationMarker.current);
      removeMarker(pickupMarker.current);
      removeMarker(destinationMarker.current);
      removeMarker(captainMarker.current);

      nearbyCaptainMarkers.current.forEach((marker) => marker.remove());
      nearbyCaptainMarkers.current.clear();

      userLocationMarker.current = null;
      pickupMarker.current = null;
      destinationMarker.current = null;
      captainMarker.current = null;

      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // ==================================================
  // USER LIVE LOCATION MARKER
  // ==================================================

  useEffect(() => {
    if (!map.current || !userLocation) return;

    const lng = Number(userLocation.lng);
    const lat = Number(userLocation.lat);

    if (Number.isNaN(lng) || Number.isNaN(lat)) return;

    if (!userLocationMarker.current) {
      const markerElement = document.createElement("div");

      markerElement.style.width = "18px";
      markerElement.style.height = "18px";
      markerElement.style.background = "#2563EB";
      markerElement.style.border = "3px solid #ffffff";
      markerElement.style.borderRadius = "50%";
      markerElement.style.boxShadow =
        "0 0 0 2px rgba(37, 99, 235, 0.35), 0 2px 6px rgba(0, 0, 0, 0.3)";
      markerElement.style.cursor = "default";

      userLocationMarker.current = new maplibregl.Marker({
        element: markerElement,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .addTo(map.current);

      // Center on the user's first detected position.
      map.current.flyTo({
        center: [lng, lat],
        zoom: 14,
      });
    } else {
      userLocationMarker.current.setLngLat([lng, lat]);
    }
  }, [userLocation]);

  // ==================================================
  // PICKUP MARKER
  // Draggable for riders; read-only for captains.
  // ==================================================

  useEffect(() => {
    if (!map.current || !pickupCoordinates) return;

    const lng = Number(pickupCoordinates.lng);
    const lat = Number(pickupCoordinates.lat);

    if (Number.isNaN(lng) || Number.isNaN(lat)) return;

    if (!pickupMarker.current) {
      pickupMarker.current = new maplibregl.Marker({
        color: "#16A34A",
        draggable: !readOnly,
      })
        .setLngLat([lng, lat])
        .addTo(map.current);

      pickupMarker.current.on("dragend", () => {
        // Extra guard: never update coordinates in read-only mode.
        if (readOnly) return;

        const position = pickupMarker.current?.getLngLat();
        if (!position) return;

        setPickupCoordinates({
          lng: position.lng,
          lat: position.lat,
        });
      });
    } else {
      // Also handles readOnly changing after the marker is created.
      pickupMarker.current.setDraggable(!readOnly);
      pickupMarker.current.setLngLat([lng, lat]);
    }
  }, [pickupCoordinates, setPickupCoordinates, readOnly]);

  // ==================================================
  // DESTINATION MARKER
  // Draggable for riders; read-only for captains.
  // ==================================================

  useEffect(() => {
    if (!map.current || !destinationCoordinates) return;

    const lng = Number(destinationCoordinates.lng);
    const lat = Number(destinationCoordinates.lat);

    if (Number.isNaN(lng) || Number.isNaN(lat)) return;

    if (!destinationMarker.current) {
      destinationMarker.current = new maplibregl.Marker({
        color: "#DC2626",
        draggable: !readOnly,
      })
        .setLngLat([lng, lat])
        .addTo(map.current);

      destinationMarker.current.on("dragend", () => {
        // Extra guard: never update coordinates in read-only mode.
        if (readOnly) return;

        const position = destinationMarker.current?.getLngLat();
        if (!position) return;

        setDestinationCoordinates({
          lng: position.lng,
          lat: position.lat,
        });
      });
    } else {
      // Also handles readOnly changing after the marker is created.
      destinationMarker.current.setDraggable(!readOnly);
      destinationMarker.current.setLngLat([lng, lat]);
    }
  }, [destinationCoordinates, setDestinationCoordinates, readOnly]);

  // ==================================================
  // NEARBY ONLINE CAPTAINS
  // ==================================================

  const hasAcceptedCaptain = Boolean(captainLocation);

  useEffect(() => {
    if (!map.current) return;

    // Ride accepted: remove all nearby-captain markers.
    if (hasAcceptedCaptain) {
      nearbyCaptainMarkers.current.forEach((marker) => marker.remove());
      nearbyCaptainMarkers.current.clear();
      return;
    }

    const seenIds = new Set();

    nearbyCaptains.forEach((captain) => {
      const id = captain?._id?.toString();
      const coordinates = captain?.location?.coordinates;

      if (!id || !coordinates || coordinates.length !== 2) return;

      // GeoJSON: coordinates[0] = longitude, coordinates[1] = latitude.
      const [lng, lat] = coordinates;

      if (typeof lng !== "number" || typeof lat !== "number") return;

      seenIds.add(id);

      const existing = nearbyCaptainMarkers.current.get(id);

      if (existing) {
        const position = existing.getLngLat();

        if (position.lng !== lng || position.lat !== lat) {
          existing.setLngLat([lng, lat]);
        }

        return;
      }

      const markerElement = document.createElement("div");
      markerElement.innerHTML = "🚕";
      markerElement.style.fontSize = "28px";
      markerElement.style.cursor = "pointer";
      markerElement.style.filter =
        "drop-shadow(0px 2px 2px rgba(0,0,0,0.4))";

      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: "center",
      })
        .setLngLat([lng, lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 }).setHTML(`
            <div style="min-width: 130px; padding: 5px;">
              <strong>
                🚕 ${captain.fullname?.firstname || "Captain"}
              </strong>
              <br />
              <span>${captain.vehicle?.vehicleType || ""}</span>
            </div>
          `)
        )
        .addTo(map.current);

      nearbyCaptainMarkers.current.set(id, marker);
    });

    // Remove markers for captains absent from the latest response.
    nearbyCaptainMarkers.current.forEach((marker, id) => {
      if (!seenIds.has(id)) {
        marker.remove();
        nearbyCaptainMarkers.current.delete(id);
      }
    });
  }, [nearbyCaptains, hasAcceptedCaptain]);

  // ==================================================
  // ACCEPTED CAPTAIN LIVE LOCATION
  // ==================================================

  useEffect(() => {
    if (!map.current) return;

    // Captain location cleared: remove its marker.
    if (!captainLocation) {
      if (captainMarker.current) {
        captainMarker.current.remove();
        captainMarker.current = null;
      }

      return;
    }

    const longitude = Number(captainLocation.longitude);
    const latitude = Number(captainLocation.latitude);

    if (Number.isNaN(longitude) || Number.isNaN(latitude)) return;

    if (!captainMarker.current) {
      const captainElement = document.createElement("div");
      captainElement.innerHTML = "🚖";
      captainElement.style.fontSize = "32px";
      captainElement.style.cursor = "pointer";
      captainElement.style.filter =
        "drop-shadow(0px 2px 3px rgba(0,0,0,0.5))";

      captainMarker.current = new maplibregl.Marker({
        element: captainElement,
        anchor: "center",
      })
        .setLngLat([longitude, latitude])
        .addTo(map.current);
    } else {
      captainMarker.current.setLngLat([longitude, latitude]);
    }
  }, [captainLocation]);

  //polyline 
  // Add inside MapView, alongside your other useEffect hooks.
// Assumes pickupCoordinates and destinationCoordinates are { lng, lat }.

useEffect(() => {
  const mapInstance = map.current;

  if (!mapInstance || !pickupCoordinates || !destinationCoordinates) {
    return;
  }

  const pickup = [
    Number(pickupCoordinates.lng),
    Number(pickupCoordinates.lat),
  ];

  const destination = [
    Number(destinationCoordinates.lng),
    Number(destinationCoordinates.lat),
  ];

  if (
    !pickup.every(Number.isFinite) ||
    !destination.every(Number.isFinite)
  ) {
    return;
  }

  const sourceId = "pickup-destination-route";
  const layerId = "pickup-destination-route-line";

  const updateRouteLine = () => {
    if (!mapInstance.getSource(sourceId)) {
      mapInstance.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [pickup, destination],
          },
        },
      });
    } else {
      mapInstance.getSource(sourceId).setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [pickup, destination],
        },
      });
    }

    if (!mapInstance.getLayer(layerId)) {
      mapInstance.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#2563EB",
          "line-width": 5,
          "line-opacity": 0.85,
        },
      });
    }
  };

  if (mapInstance.isStyleLoaded()) {
    updateRouteLine();
  } else {
    mapInstance.once("load", updateRouteLine);
  }

  return () => {
    mapInstance.off("load", updateRouteLine);
  };
}, [pickupCoordinates, destinationCoordinates]);

  // ==================================================
  // MAP CLICK — SELECT LOCATION
  // ==================================================

  useEffect(() => {
    if (!map.current) return;

    if (
      mapSelectionMode !== "pickup" &&
      mapSelectionMode !== "destination"
    ) {
      return;
    }

    const handleMapClick = (event) => {
      const onSelect = onMapLocationSelectRef.current;

      if (!onSelect || !event?.lngLat) return;

      onSelect({
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
      });
    };

    map.current.on("click", handleMapClick);

    return () => {
      if (map.current) {
        map.current.off("click", handleMapClick);
      }
    };
  }, [mapSelectionMode]);

  // ==================================================
  // DRAW ROUTE
  // ==================================================

  useEffect(() => {
    if (!map.current) return;

    // Remove route if no route coordinates are provided.
    if (!routeCoordinates || routeCoordinates.length === 0) {
      if (map.current.getLayer("route-line")) {
        map.current.removeLayer("route-line");
      }

      if (map.current.getSource("route")) {
        map.current.removeSource("route");
      }

      return;
    }

    const drawRoute = () => {
      if (!map.current) return;

      const geojson = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routeCoordinates,
        },
      };

      // Update the existing route source.
      const source = map.current.getSource("route");

      if (source) {
        source.setData(geojson);
      } else {
        map.current.addSource("route", {
          type: "geojson",
          data: geojson,
        });
      }

      // Create the route layer once.
      if (!map.current.getLayer("route-line")) {
        map.current.addLayer({
          id: "route-line",
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

      // Fit the map to the route.
      if (routeCoordinates.length > 1) {
        const bounds = new maplibregl.LngLatBounds();

        routeCoordinates.forEach((coordinate) => {
          bounds.extend(coordinate);
        });

        map.current.fitBounds(bounds, {
          padding: 80,
          duration: 1000,
        });
      }
    };

    // Wait until the map style is ready.
    if (map.current.isStyleLoaded()) {
      drawRoute();
    } else {
      map.current.once("load", drawRoute);
    }
  }, [routeCoordinates]);

  // ==================================================
  // MAP UI
  // ==================================================

  return <div ref={mapContainer} className="w-full h-full" />;
};

export default MapView;