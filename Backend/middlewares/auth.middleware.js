const userModel = require('../models/user.model');
const captainModel = require('../models/capatain.model');
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

        const token =
            req.cookies?.token ||
            req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "No token provided"
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const captain = await captainModel.findById(decoded.id);

        if (!captain) {
            return res.status(401).json({
                success: false,
                message: "Captain not found"
            });
        }

        req.captain = captain;

        next();

    } catch (error) {

        res.status(401).json({
            success: false,
            message: "Unauthorized"
        });

    }
};
