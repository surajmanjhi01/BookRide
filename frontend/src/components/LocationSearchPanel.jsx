import React from "react";

const LocationSearchPanel = ({ locations = [], onSelectLocation }) => {

  return (
    <div>

      {locations.map((place, index) => (

        <div
          key={index}
          onClick={() => onSelectLocation(place)}
          className="p-4 border-b cursor-pointer hover:bg-gray-100"
        >

          <h3 className="font-semibold">
            {place.name}
          </h3>

          <p className="text-sm text-gray-500">
            {place.address}
          </p>

        </div>

      ))}

    </div>
  );
};

export default LocationSearchPanel;