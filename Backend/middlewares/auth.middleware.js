const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const jwt = require('jsonwebtoken');


exports.authUser = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await userModel.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({ message: "Unauthorized access" });
  }
};


exports.authCaptain = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header missing",
      });
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    console.log("Captain token:", token);

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const captain = await captainModel.findById(decoded.id);

    if (!captain) {
      return res.status(401).json({
        success: false,
        message: "Captain not found",
      });
    }

    req.captain = captain;

    next();

  } catch (error) {
    console.error("CAPTAIN AUTH ERROR:", error);

    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }
};