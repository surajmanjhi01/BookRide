const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Captain",
      default: null,
    },

    pickup: {
      address: {
        type: String,
        required: true,
      },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
        },
      },
    },

    destination: {
      address: {
        type: String,
        required: true,
      },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
          required: true,
        },
      },
    },

    fare: {
      baseFare: {
        type: Number,
        default: 0,
      },
      distanceFare: {
        type: Number,
        default: 0,
      },
      timeFare: {
        type: Number,
        default: 0,
      },
      totalFare: {
        type: Number,
        required: true,
      },
    },

    distance: {
      type: Number, // in kilometers
      required: true,
    },

    duration: {
      type: Number, // in minutes
      required: true,
    },

    otp: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "requested",
        "accepted",
        "arrived",
        "ongoing",
        "completed",
        "cancelled",
      ],
      default: "requested",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

// Geospatial indexes for location queries
rideSchema.index({ "pickup.location": "2dsphere" });
rideSchema.index({ "destination.location": "2dsphere" });

module.exports = mongoose.model("Ride", rideSchema);