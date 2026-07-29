import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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

const MapView = ({
  pickupCoordinates,
  destinationCoordinates,
  routeCoordinates,
  setPickupCoordinates,
  setDestinationCoordinates,
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const currentMarker = useRef(null);
  const pickupMarker = useRef(null);
  const destinationMarker = useRef(null);

  // -------------------- Initialize Map --------------------
  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: openStreetMapStyle,
      center: [85.324, 23.3441], // Ranchi
      zoom: 13,
    });

    map.current.addControl(
      new maplibregl.NavigationControl(),
      "top-right"
    );

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lng = position.coords.longitude;
        const lat = position.coords.latitude;

        currentMarker.current = new maplibregl.Marker({
          color: "green",
        })
          .setLngLat([lng, lat])
          .addTo(map.current);

        map.current.flyTo({
          center: [lng, lat],
          zoom: 14,
        });
      },
      (err) => console.log(err)
    );
  }, []);

  // -------------------- Pickup Marker --------------------
  useEffect(() => {
    if (!map.current || !pickupCoordinates) return;

    if (!pickupMarker.current) {
      pickupMarker.current = new maplibregl.Marker({
        color: "blue",
        draggable: true,
      })
        .setLngLat([
          pickupCoordinates.lng,
          pickupCoordinates.lat,
        ])
        .addTo(map.current);

      pickupMarker.current.on("dragend", () => {
        const pos = pickupMarker.current.getLngLat();

        setPickupCoordinates({
          lng: pos.lng,
          lat: pos.lat,
        });
      });
    } else {
      pickupMarker.current.setLngLat([
        pickupCoordinates.lng,
        pickupCoordinates.lat,
      ]);
    }
  }, [pickupCoordinates]);

  // -------------------- Destination Marker --------------------
  useEffect(() => {
    if (!map.current || !destinationCoordinates) return;

    if (!destinationMarker.current) {
      destinationMarker.current = new maplibregl.Marker({
        color: "red",
        draggable: true,
      })
        .setLngLat([
          destinationCoordinates.lng,
          destinationCoordinates.lat,
        ])
        .addTo(map.current);

      destinationMarker.current.on("dragend", () => {
        const pos = destinationMarker.current.getLngLat();

        setDestinationCoordinates({
          lng: pos.lng,
          lat: pos.lat,
        });
      });
    } else {
      destinationMarker.current.setLngLat([
        destinationCoordinates.lng,
        destinationCoordinates.lat,
      ]);
    }
  }, [destinationCoordinates]);

  // -------------------- Draw Route --------------------
  useEffect(() => {
    if (!map.current || routeCoordinates.length === 0) return;

    const drawRoute = () => {
      const geojson = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: routeCoordinates,
        },
      };

      if (map.current.getSource("route")) {
        map.current.getSource("route").setData(geojson);
      } else {
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

      // Fit map to route
      const bounds = new maplibregl.LngLatBounds();

      routeCoordinates.forEach((coord) => {
        bounds.extend(coord);
      });

      map.current.fitBounds(bounds, {
        padding: 80,
        duration: 1000,
      });
    };

    if (map.current.isStyleLoaded()) {
      drawRoute();
    } else {
      map.current.once("load", drawRoute);
    }
  }, [routeCoordinates]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
    />
  );
};

export default MapView;
