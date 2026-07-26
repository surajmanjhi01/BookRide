import React from "react";

const SearchPanel = ({ setPanelOpen }) => {
  return (
    <div className="absolute bottom-40 left-0 w-full h-[45vh] bg-white rounded-t-3xl shadow-lg p-5">

      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-semibold">
          Search Results
        </h2>

        <button
          onClick={() => setPanelOpen(false)}
          className="text-2xl"
        >
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-3 cursor-pointer hover:bg-gray-100">
          Ranchi Railway Station
        </div>

        <div className="border rounded-lg p-3 cursor-pointer hover:bg-gray-100">
          Lalpur
        </div>

        <div className="border rounded-lg p-3 cursor-pointer hover:bg-gray-100">
          Airport
        </div>
      </div>

    </div>
  );
};

export default SearchPanel;