const express=require('express');
const router=express.Router();
 
const mapController=require('../controllers/maps.controller');
const authMiddleware=require('../middlewares/auth.middleware');

router.get('/coordinates',authMiddleware.authUser,mapController.getCoordinates);
router.get(
    "/distance-time",
    // authMiddleware.authUser,
    mapController.getDistanceAndTime
);
module.exports=router;