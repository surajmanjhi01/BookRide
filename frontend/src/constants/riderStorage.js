// ============================================================
// SHARED RIDER localStorage KEYS
//
// Home.jsx persists pickup / destination + coordinates so an
// accidental page refresh restores what the rider was typing.
// A stale destination from a previous session must never leak
// into a new login, so the login / signup pages clear these
// same keys (clearRiderRideState) before navigating to the
// fresh home page. Keeping the keys here guarantees the login
// pages and Home.jsx always agree on the key names.
// ============================================================

export const RIDER_STORAGE_KEYS = {
  pickup: "uber_pickup",
  destination: "uber_destination",
  pickupCoordinates: "uber_pickup_coordinates",
  destinationCoordinates: "uber_destination_coordinates",
};

export const RIDER_RIDE_STATE_KEYS =
  Object.values(RIDER_STORAGE_KEYS);

// Remove every persisted pickup / destination key so the home
// page always starts fresh after a rider logs in or signs up.
export const clearRiderRideState = () => {
  try {
    RIDER_RIDE_STATE_KEYS.forEach((key) =>
      localStorage.removeItem(key)
    );
  } catch (error) {
    console.error(
      "Failed to clear rider ride state:",
      error
    );
  }
};