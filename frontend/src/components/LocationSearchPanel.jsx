import React from "react";

const LocationSearchPanel = ({ locations = [], onSelectLocation }) => {
  return (
    <div className="w-full">
      {locations.length === 0 ? (
        <p className="text-center text-gray-500 py-4">
          Search for a location...
        </p>
      ) : (
        locations.map((place, index) => (
          <div
            key={index}
            onClick={() => onSelectLocation && onSelectLocation(place)}
            className="flex items-start gap-3 p-4 border-b cursor-pointer hover:bg-gray-100 transition"
          >
            {/* Location Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200">
              📍
            </div>

            {/* Location Details */}
            <div>
              <h3 className="font-semibold text-gray-800">
                {place.name}
              </h3>

              <p className="text-sm text-gray-500">
                {place.address}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default LocationSearchPanel;