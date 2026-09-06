const captainModel = require("../models/captain.model");
const bcrypt = require("bcrypt");
const generateToken = require("../utils/generateToken");
const captainService = require("../services/captain.services");

exports.registerCaptain = async (req, res) => {
    try {
        const {
    fullname,
    email,
    password,
    vehicle
} = req.body;

const { firstname, lastname } = fullname;
const { color, plate, capacity, vehicleType } = vehicle;

        const existingUser = await captainModel.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Captain already exists"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = await captainModel.create({
            fullname: {
                firstname,
                lastname
            },
            email,
            password: hashedPassword,
            vehicle: {
                color,
                plate,
                capacity,
                vehicleType
            }
        });

        const token = generateToken(user._id, "captain");

        res.status(201).json({
            success: true,
            token,
            data: {
                _id: user._id,
                fullname: user.fullname,
                email: user.email,
                vehicle: user.vehicle
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

exports.loginCaptain = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await captainModel
            .findOne({ email })
            .select("+password");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = generateToken(user._id, "captain");

        res.status(200).json({
            success: true,
            token
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
exports.getCaptainProfile = async (req, res,next) => {
  res.status(200).json(req.captain);
};
exports.logoutCaptain = async (req, res) => {
  try {
    res.clearCookie("token");
    res.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const Ride = require("../models/ride.model");

exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (
      latitude === undefined ||
      longitude === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    // -----------------------------------------
    // Validate coordinates
    // -----------------------------------------

    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid latitude or longitude",
      });
    }

    // -----------------------------------------
    // Update captain location
    // -----------------------------------------

    const captain = await captainService.updateLocation(
      req.captain._id,
      longitude,
      latitude
    );

    // -----------------------------------------
    // Find active ride of this captain
    // -----------------------------------------

    const activeRide = await Ride.findOne({
      captain: req.captain._id,
      status: {
        $in: [
          "accepted",
          "arrived",
          "ongoing",
        ],
      },
    });

    // -----------------------------------------
    // Send location to rider
    // -----------------------------------------

    if (activeRide) {
      const io = req.app.get("io");
      const userSockets = req.app.get("userSockets");

      if (io && userSockets) {
        const userId =
          activeRide.user.toString();

        const socketId =
          userSockets.get(userId);

        if (socketId) {
          io.to(socketId).emit(
            "captain-location-update",
            {
              rideId: activeRide._id,
              captainId: req.captain._id,
              latitude,
              longitude,
            }
          );

          console.log(
            `📍 Captain location sent to rider ${userId}`
          );
        } else {
          console.log(
            `⚠️ Rider ${userId} has no active socket`
          );
        }
      }
    }

    // -----------------------------------------
    // Response
    // -----------------------------------------

    return res.status(200).json({
      success: true,
      message: "Captain location updated",
      data: {
        latitude,
        longitude,
      },
    });

  } catch (error) {
    console.error(
      "Update Captain Location Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==================================================
// GET ACTIVE RIDE
// ==================================================

exports.getActiveRide = async (req, res) => {
  try {
    if (!req.captain || !req.captain._id) {
      return res.status(401).json({
        success: false,
        message: "Captain authentication required.",
      });
    }

    const ride = await Ride.findOne({
      captain: req.captain._id,
      status: {
        $in: [
          "accepted",
          "arrived",
          "ongoing",
        ],
      },
      // Defensive:
      // Ignore abandoned rides that were never completed or
      // cancelled (e.g. leftovers from interrupted testing).
      // Without this, an ancient "accepted"/"arrived" ride is
      // restored on every page load, shows a ghost ride card on
      // the captain dashboard, and blocks ALL new ride requests.
      createdAt: {
        $gte: new Date(
          Date.now() - 6 * 60 * 60 * 1000
        ),
      },
    }).select("-otp");

    return res.status(200).json({
      success: true,
      message: ride
        ? "Active ride found"
        : "No active ride",
      data: ride,
    });

  } catch (error) {
    console.error(
      "❌ Get Active Ride Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getNearbyCaptains = async (req, res) => {
  try {
    const { lng, lat } = req.query;

    if (lng===undefined || lat===undefined) {
      return res.status(400).json({
        success: false,
        message: "Longitude and latitude are required",
      });
    }

    const captains = await captainService.findNearbyCaptains(
      Number(lng),
      Number(lat)
    );

    return res.status(200).json({
      success: true,
      count: captains.length,
      data: captains,
    });
  } catch (error) {
    console.error("Nearby Captain Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const captain = await captainModel.findByIdAndUpdate(
      req.captain._id,
      {
        status,
      },
      {
        returnDocument: "after",
      }
    );

    if (!captain) {
      return res.status(404).json({
        success: false,
        message: "Captain not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Captain is now ${status}`,
      data: {
        status: captain.status,
      },
    });
  } catch (error) {
    console.error("Update Captain Status Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
