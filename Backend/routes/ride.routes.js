const express = require("express");

const router = express.Router();

const rideController =
  require("../controllers/ride.controller");

const authMiddleware =
  require("../middlewares/auth.middleware");


router.post(
  "/create",
  authMiddleware.authUser,
  rideController.createRide
);

router.patch(
  "/:rideId/accept",
  authMiddleware.authCaptain,
  rideController.acceptRide
);
router.patch(
    "/:rideId/reject",
    authMiddleware.authCaptain,
    rideController.rejectRide
);
router.patch(
  "/:rideId/arrived",
  authMiddleware.authCaptain,
  rideController.markRideArrived
);
router.post(
  "/:rideId/verify-otp",
  authMiddleware.authCaptain,
  rideController.verifyOTP
);
router.patch(
  "/:rideId/complete",
  authMiddleware.authCaptain,
  rideController.completeRide
);
module.exports = router;