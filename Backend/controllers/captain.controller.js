const captainModel = require("../models/capatain.model");
const bcrypt = require("bcrypt");
const generateToken = require("../utils/generateToken");

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
  res.status(200).json(req.user);
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
