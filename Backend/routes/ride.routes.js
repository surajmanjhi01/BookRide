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

module.exports = router;