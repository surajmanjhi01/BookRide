import { useEffect, useRef } from "react";
import { Map, Marker, NavigationControl } from "maplibre-gl";

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
  destinationCoordinates
}) => {

  const mapContainer = useRef(null);
  const map = useRef(null);


  useEffect(() => {

    if (map.current) return;


    // Default Ranchi location
    const defaultLocation = [
      85.3096,
      23.3441
    ];


    map.current = new Map({
      container: mapContainer.current,
      style: openStreetMapStyle,
      center: defaultLocation,
      zoom: 13,
    });

    // Navigation controls
    map.current.addControl(
      new NavigationControl(),
      "top-right"
    );


    // Get user's current location
    navigator.geolocation.getCurrentPosition(
      (position)=>{

        const lng =
          position.coords.longitude;

        const lat =
          position.coords.latitude;


        map.current.flyTo({

          center:[
            lng,
            lat
          ],

          zoom:14,

          duration:2000

        });


        new Marker({
          color:"green"
        })
        .setLngLat([
          lng,
          lat
        ])
        .addTo(map.current);


      },

      (error)=>{
        console.log(
          "Location error:",
          error
        );
      }

    );


  }, []);



  // Add pickup marker
  useEffect(()=>{

    if(
      !map.current ||
      !pickupCoordinates
    )
    return;


    new Marker({
      color:"blue"
    })
    .setLngLat([
      pickupCoordinates.lng,
      pickupCoordinates.lat
    ])
    .addTo(map.current);


    map.current.flyTo({

      center:[
        pickupCoordinates.lng,
        pickupCoordinates.lat
      ],

      zoom:15,

      duration:1500

    });


  },[pickupCoordinates]);



  // Add destination marker
  useEffect(()=>{

    if(
      !map.current ||
      !destinationCoordinates
    )
    return;


    new Marker({
      color:"red"
    })
    .setLngLat([
      destinationCoordinates.lng,
      destinationCoordinates.lat
    ])
    .addTo(map.current);



  },[destinationCoordinates]);



  return (

    <div
      ref={mapContainer}
      className="w-full h-full"
    />

  );

};


export default MapView;
