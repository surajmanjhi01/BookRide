import React from "react";

/**
 * Loader - a lightweight CSS-only spinner.
 *
 * Example:
 *   <Loader size={20} color="#ffffff" label="Logging in..." />
 *
 * Props:
 *   size      - spinner diameter in px (default 28)
 *   color     - spinner/track color (default #ffffff)
 *   label     - optional text shown next to the spinner
 *   className - extra classes for the wrapper
 */
const Loader = ({
  size = 28,
  color = "#ffffff",
  label = "",
  className = "",
}) => {
  const spinnerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    border: `${Math.max(2, Math.round(size / 7))}px solid ${color}`,
    borderRightColor: "transparent",
    borderRadius: "50%",
    animation: "loader-spin 0.7s linear infinite",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label || "Loading"}
    >
      <span style={spinnerStyle} />
      {label ? <span>{label}</span> : null}
    </span>
  );
};

export default Loader;