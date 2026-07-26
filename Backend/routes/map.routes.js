const express=require('express');
const router=express.Router();
 
const mapController=require('../controllers/maps.controller');
const authMiddleware=require('../middlewares/auth.middleware');

router.get('/coordinates',authMiddleware.authUser,mapController.getCoordinates);
router.post(
    "/distance-time",
     authMiddleware.authUser,
    mapController.getDistanceAndTime
);
router.post(
    "/fare",
    //  authMiddleware.authUser,
    mapController.getFare
);
router.get(
    "/search",
    // authMiddleware.authUser,
    mapController.searchPlaces
);
module.exports=router;
