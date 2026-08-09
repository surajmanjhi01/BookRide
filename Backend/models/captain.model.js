const mongoose = require("mongoose");

const captainSchema = new mongoose.Schema(
  {
    fullname: {
      firstname: {
        type: String,
        required: true,
        minlength: [3, "Firstname must be at least 3 characters long"],
      },
      lastname: {
        type: String,
        required: true,
        minlength: [3, "Lastname must be at least 3 characters long"],
      },
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    socketId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },

    vehicle: {
      color: {
        type: String,
        required: true,
        minlength: [3, "Color must be at least 3 characters long"],
      },

      plate: {
        type: String,
        required: true,
        minlength: [3, "Plate must be at least 3 characters long"],
      },

      capacity: {
        type: Number,
        required: true,
        min: [1, "Capacity must be at least 1"],
      },

      vehicleType: {
        type: String,
        required: true,
        enum: ["car", "bike", "van"],
      },
    },

    // GeoJSON Location
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },
  },
  {
    timestamps: true,
  }
);

// GeoSpatial Index
captainSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Captain", captainSchema);