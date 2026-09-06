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

      tiles: [
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],

      tileSize: 256,

      attribution:
        "© OpenStreetMap contributors",
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
//
// MapView handles ONLY map rendering. All API calls,
// GPS logic and ride state live in Home.jsx.
// ==================================================

const MapView = ({
  userLocation,

  pickupCoordinates,
  destinationCoordinates,

  routeCoordinates = [],

  // Nearby online captains
  nearbyCaptains = [],

  // Accepted captain's live location
  captainLocation,

  // Manual map selection mode: null | "pickup" | "destination"
  mapSelectionMode,

  // Fired with { lat, lng } when the user clicks the map
  // while mapSelectionMode is active
  onMapLocationSelect,

  // Coordinate setters (Home may pass wrapped versions that
  // also reverse-geocode and recalculate the route / fare)
  setPickupCoordinates = () => {},
  setDestinationCoordinates = () => {},
}) => {

  // ==================================================
  // MAP REFERENCES
  // ==================================================

  const mapContainer = useRef(null);

  const map = useRef(null);

  // ==================================================
  // MARKERS
  // ==================================================

  // 📍 User GPS
  const userLocationMarker =
    useRef(null);

  // 🟢 Pickup
  const pickupMarker =
    useRef(null);

  // 🔴 Destination
  const destinationMarker =
    useRef(null);

  // 🚖 Accepted captain
  const captainMarker =
    useRef(null);

  // 🚕 Nearby captains — keyed by captain _id so markers are
  // created once and updated in place (never duplicated).
  const nearbyCaptainMarkers =
    useRef(new Map());

  // Always point at the latest onMapLocationSelect callback.
  // This prevents stale closures and guarantees the map-click
  // listener is attached/removed exactly once per mode change.
  const onMapLocationSelectRef =
    useRef(onMapLocationSelect);

  useEffect(() => {
    onMapLocationSelectRef.current = onMapLocationSelect;
  }, [onMapLocationSelect]);

  // ==================================================
  // INITIALIZE MAP — once
  // ==================================================

  useEffect(() => {

    if (map.current) return;

    if (!mapContainer.current) return;

    map.current =
      new maplibregl.Map({

        container:
          mapContainer.current,

        style:
          openStreetMapStyle,

        center: [
          85.324,
          23.3441,
        ],

        zoom: 13,
      });

    // Navigation controls

    map.current.addControl(

      new maplibregl.NavigationControl(),

      "top-right"
    );

    // ==================================================
    // CLEANUP MAP
    // ==================================================

    return () => {

      const removeMarker =
        (marker) => {
          if (marker) marker.remove();
        };

      removeMarker(userLocationMarker.current);
      removeMarker(pickupMarker.current);
      removeMarker(destinationMarker.current);
      removeMarker(captainMarker.current);

      nearbyCaptainMarkers.current.forEach(
        (marker) => marker.remove()
      );

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
  // 📍 USER LIVE LOCATION MARKER
  // ==================================================

  useEffect(() => {

    if (
      !map.current ||
      !userLocation
    ) {
      return;
    }

    const lng =
      Number(userLocation.lng);

    const lat =
      Number(userLocation.lat);

    if (
      Number.isNaN(lng) ||
      Number.isNaN(lat)
    ) {
      return;
    }

    // ------------------------------------------------
    // CREATE USER MARKER
    // ------------------------------------------------

    if (
      !userLocationMarker.current
    ) {

      const markerElement =
        document.createElement("div");

      markerElement.style.width = "18px";
      markerElement.style.height = "18px";
      markerElement.style.background = "#2563EB";
      markerElement.style.border = "3px solid #ffffff";
      markerElement.style.borderRadius = "50%";
      markerElement.style.boxShadow =
        "0 0 0 2px rgba(37, 99, 235, 0.35), 0 2px 6px rgba(0, 0, 0, 0.3)";
      markerElement.style.cursor = "default";

      userLocationMarker.current =
        new maplibregl.Marker({

          element:
            markerElement,

          anchor:
            "center",

        })

          .setLngLat([
            lng,
            lat,
          ])

          .addTo(
            map.current
          );

      // Center the map on the user's first detected position
      map.current.flyTo({

        center: [
          lng,
          lat,
        ],

        zoom: 14,

      });
    }

    // ------------------------------------------------
    // UPDATE USER MARKER
    // ------------------------------------------------

    else {

      userLocationMarker.current.setLngLat([
        lng,
        lat,
      ]);
    }

  }, [
    userLocation,
  ]);

  // ==================================================
  // 🟢 PICKUP MARKER — draggable
  // ==================================================

  useEffect(() => {

    if (
      !map.current ||
      !pickupCoordinates
    ) {
      return;
    }

    const lng =
      Number(pickupCoordinates.lng);

    const lat =
      Number(pickupCoordinates.lat);

    if (
      Number.isNaN(lng) ||
      Number.isNaN(lat)
    ) {
      return;
    }

    // ------------------------------------------------
    // CREATE PICKUP MARKER
    // ------------------------------------------------

    if (
      !pickupMarker.current
    ) {

      pickupMarker.current =
        new maplibregl.Marker({

          color:
            "#16A34A",

          draggable:
            true,

        })

          .setLngLat([
            lng,
            lat,
          ])

          .addTo(
            map.current
          );

      // ----------------------------------------------
      // DRAG PICKUP → update coordinates in Home.
      // Home reverse-geocodes the address and
      // recalculates the route / fare automatically.
      // ----------------------------------------------

      pickupMarker.current.on(

        "dragend",

        () => {

          const position =
            pickupMarker.current?.getLngLat();

          if (!position) return;

          setPickupCoordinates({

            lng:
              position.lng,

            lat:
              position.lat,

          });
        }
      );
    }

    // ------------------------------------------------
    // UPDATE PICKUP MARKER
    // ------------------------------------------------

    else {

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
  // 🔴 DESTINATION MARKER — draggable
  // ==================================================

  useEffect(() => {

    if (
      !map.current ||
      !destinationCoordinates
    ) {
      return;
    }

    const lng =
      Number(destinationCoordinates.lng);

    const lat =
      Number(destinationCoordinates.lat);

    if (
      Number.isNaN(lng) ||
      Number.isNaN(lat)
    ) {
      return;
    }

    // ------------------------------------------------
    // CREATE DESTINATION MARKER
    // ------------------------------------------------

    if (
      !destinationMarker.current
    ) {

      destinationMarker.current =
        new maplibregl.Marker({

          color:
            "#DC2626",

          draggable:
            true,

        })

          .setLngLat([
            lng,
            lat,
          ])

          .addTo(
            map.current
          );

      // ----------------------------------------------
      // DRAG DESTINATION → update coordinates in Home.
      // recalculates the route / fare automatically.
      // ----------------------------------------------

      destinationMarker.current.on(

        "dragend",

        () => {

          const position =
            destinationMarker.current?.getLngLat();

          if (!position) return;

          setDestinationCoordinates({

            lng:
              position.lng,

            lat:
              position.lat,

          });
        }
      );
    }

    // ------------------------------------------------
    // UPDATE DESTINATION MARKER
    // ------------------------------------------------

    else {

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
  // 🚕 NEARBY ONLINE CAPTAINS
  //
  // Markers are stored in a Map keyed by captain _id:
  //  - created once,
  //  - updated in place when a captain moves,
  //  - removed when a captain disappears,
  //  - never duplicated.
  // As soon as an accepted captain is being tracked
  // (captainLocation), ALL nearby markers are removed.
  // ==================================================

  const hasAcceptedCaptain =
    Boolean(captainLocation);

  useEffect(() => {

    if (!map.current) return;

    // ------------------------------------------------
    // Ride accepted → remove all nearby markers
    // ------------------------------------------------

    if (hasAcceptedCaptain) {

      nearbyCaptainMarkers.current.forEach(
        (marker) => marker.remove()
      );

      nearbyCaptainMarkers.current.clear();

      return;
    }

    const seenIds = new Set();

    nearbyCaptains.forEach(
      (captain) => {

        const id =
          captain?._id?.toString();

        const coordinates =
          captain?.location?.coordinates;

        if (
          !id ||
          !coordinates ||
          coordinates.length !== 2
        ) {
          return;
        }

        const [
          lng,
          lat,
        ] = coordinates;

        // GeoJSON: coordinates[0] = longitude,
        //          coordinates[1] = latitude

        if (
          typeof lng !== "number" ||
          typeof lat !== "number"
        ) {
          return;
        }

        seenIds.add(id);

        // ----------------------------------------------
        // Marker already exists → update in place
        // ----------------------------------------------

        const existing =
          nearbyCaptainMarkers.current.get(id);

        if (existing) {

          const position =
            existing.getLngLat();

          if (
            position.lng !== lng ||
            position.lat !== lat
          ) {
            existing.setLngLat([
              lng,
              lat,
            ]);
          }

          return;
        }

        // ----------------------------------------------
        // Create marker element
        // ----------------------------------------------

        const markerElement =
          document.createElement("div");

        markerElement.innerHTML =
          "🚕";

        markerElement.style.fontSize =
          "28px";

        markerElement.style.cursor =
          "pointer";

        markerElement.style.filter =
          "drop-shadow(0px 2px 2px rgba(0,0,0,0.4))";

        // ----------------------------------------------
        // Create marker
        // ----------------------------------------------

        const marker =
          new maplibregl.Marker({

            element:
              markerElement,

            anchor:
              "center",

          })

            .setLngLat([
              lng,
              lat,
            ])

            .setPopup(

              new maplibregl.Popup({

                offset:
                  25,

              })

                .setHTML(`

                  <div style="
                    min-width: 130px;
                    padding: 5px;
                  ">

                    <strong>
                      🚕 ${
                        captain.fullname?.firstname ||
                        "Captain"
                      }
                    </strong>

                    <br/>

                    <span>
                      ${
                        captain.vehicle?.vehicleType ||
                        ""
                      }
                    </span>

                  </div>

                `)
            )

            .addTo(
              map.current
            );

        nearbyCaptainMarkers.current.set(
          id,
          marker
        );
      }
    );

    // ------------------------------------------------
    // Remove markers whose captains disappeared
    // from the latest API response
    // ------------------------------------------------

    nearbyCaptainMarkers.current.forEach(
      (marker, id) => {

        if (!seenIds.has(id)) {

          marker.remove();

          nearbyCaptainMarkers.current.delete(id);
        }
      }
    );
  }, [
    nearbyCaptains,
    hasAcceptedCaptain,
  ]);

// ==================================================
  // 🚖 ACCEPTED CAPTAIN LIVE LOCATION
  //
  // Marker is created once and smoothly moved on each
  // socket update — never recreated per event.
  // ==================================================

  useEffect(() => {

    if (!map.current) return;

    // Captain location cleared → remove marker

    if (!captainLocation) {

      if (captainMarker.current) {

        captainMarker.current.remove();

        captainMarker.current = null;
      }

      return;
    }

    const longitude =
      Number(captainLocation.longitude);

    const latitude =
      Number(captainLocation.latitude);

    if (
      Number.isNaN(longitude) ||
      Number.isNaN(latitude)
    ) {
      return;
    }

    // ------------------------------------------------
    // CREATE CAPTAIN MARKER
    // ------------------------------------------------

    if (
      !captainMarker.current
    ) {

      const captainElement =
        document.createElement(
          "div"
        );

      captainElement.innerHTML =
        "🚖";

      captainElement.style.fontSize =
        "32px";

      captainElement.style.cursor =
        "pointer";

      captainElement.style.filter =
        "drop-shadow(0px 2px 3px rgba(0,0,0,0.5))";

      captainMarker.current =
        new maplibregl.Marker({

          element:
            captainElement,

          anchor:
            "center",

        })

          .setLngLat([
            longitude,
            latitude,
          ])

          .addTo(
            map.current
          );
    }

    // ------------------------------------------------
    // UPDATE CAPTAIN LOCATION
    // ------------------------------------------------

    else {

      captainMarker.current.setLngLat([
        longitude,
        latitude,
      ]);
    }
  }, [
    captainLocation,
  ]);

// ==================================================
  // 🗺️ MAP CLICK → SELECT LOCATION
  //
  // The listener is attached only while mapSelectionMode
  // is active and is always removed on cleanup, so
  // duplicate listeners can never accumulate.
  // ==================================================

  useEffect(() => {

    if (!map.current) return;

    if (
      mapSelectionMode !==
        "pickup" &&

      mapSelectionMode !==
        "destination"
    ) {
      return;
    }

    const handleMapClick =
      (event) => {

        const onSelect =
          onMapLocationSelectRef.current;

        if (
          !onSelect ||
          !event?.lngLat
        ) {
          return;
        }

        // Exactly one map click selects the location.
        // Home resets mapSelectionMode to null
        // immediately after handling this event.
        onSelect({

          lat:
            event.lngLat.lat,

          lng:
            event.lngLat.lng,

        });
      };

    map.current.on(
      "click",
      handleMapClick
    );

    return () => {

      if (
        map.current
      ) {

        map.current.off(
          "click",
          handleMapClick
        );
      }
    };
  }, [
    mapSelectionMode,
  ]);

  // ==================================================
  // 🛣️ DRAW ROUTE
  //
  // GeoJSON source:  "route"
  // Line layer:      "route-line"
  //
  // The source is updated in place with setData()
  // whenever the route changes; duplicate sources or
  // layers are never created.
  // ==================================================

  useEffect(() => {

    if (!map.current) return;

    // ------------------------------------------------
    // REMOVE ROUTE IF EMPTY
    // ------------------------------------------------

    if (
      !routeCoordinates ||
      routeCoordinates.length === 0
    ) {

      if (
        map.current.getLayer(
          "route-line"
        )
      ) {

        map.current.removeLayer(
          "route-line"
        );
      }

      if (
        map.current.getSource(
          "route"
        )
      ) {

        map.current.removeSource(
          "route"
        );
      }

      return;
    }

    // ==================================================
    // DRAW FUNCTION
    // ==================================================

    const drawRoute =
      () => {

        if (
          !map.current
        ) {
          return;
        }

        const geojson = {

          type:
            "Feature",

          properties:
            {},

          geometry: {

            type:
              "LineString",

            coordinates:
              routeCoordinates,

          },
        };

        // ------------------------------------------------
        // UPDATE EXISTING ROUTE
        // ------------------------------------------------

        const source =
          map.current.getSource(
            "route"
          );

        if (
          source
        ) {

          source.setData(
            geojson
          );
        }

        // ------------------------------------------------
        // CREATE NEW ROUTE
        // ------------------------------------------------

        else {

          map.current.addSource(

            "route",

            {

              type:
                "geojson",

              data:
                geojson,

            }
          );
        }

        // ------------------------------------------------
        // CREATE LINE LAYER — exactly once
        // ------------------------------------------------

        if (
          !map.current.getLayer(
            "route-line"
          )
        ) {

          map.current.addLayer({

            id:
              "route-line",

            type:
              "line",

            source:
              "route",

            layout: {

              "line-cap":
                "round",

              "line-join":
                "round",

            },

            paint: {

              "line-color":
                "#2563EB",

              "line-width":
                6,

              "line-opacity":
                0.9,

            },
          });
        }

        // ------------------------------------------------
        // FIT MAP TO ROUTE
        // ------------------------------------------------

        if (
          routeCoordinates.length > 1
        ) {

          const bounds =
            new maplibregl.LngLatBounds();

          routeCoordinates.forEach(
            (coordinate) => {

              bounds.extend(
                coordinate
              );
            }
          );

          map.current.fitBounds(
            bounds,
            {

              padding:
                80,

              duration:
                1000,

            }
          );
        }
      };

    // ==================================================
    // WAIT FOR MAP STYLE
    // ==================================================

    if (
      map.current.isStyleLoaded()
    ) {

      drawRoute();
    }

    else {

      map.current.once(
        "load",
        drawRoute
      );
    }
  }, [
    routeCoordinates,
  ]);

  // ==================================================
  // MAP UI
  // ==================================================

  return (

    <div

      ref={
        mapContainer
      }

      className="
        w-full
        h-full
      "

    />
  );
};

export default MapView;