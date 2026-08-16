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

    rejectedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Captain",
        default: [],
      },
    ],

    vehicleType: {
      type: String,
      enum: ["bike", "auto", "car"],
      required: true,
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
          type: [Number],
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
          type: [Number],
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
      type: Number,
      required: true,
    },

    duration: {
      type: Number,
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

rideSchema.index({ "pickup.location": "2dsphere" });
rideSchema.index({ "destination.location": "2dsphere" });

module.exports = mongoose.model("Ride", rideSchema);