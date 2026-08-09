const express=require('express');
const router=express.Router();
const captainController=require('../controllers/captain.controller');
const authMiddleware=require('../middlewares/auth.middleware');

router.post('/register', captainController.registerCaptain);
router.post('/login', captainController.loginCaptain);
router.get('/profile', authMiddleware.authCaptain, captainController.getCaptainProfile);
router.post('/logout', authMiddleware.authCaptain, captainController.logoutCaptain);
router.patch('/location',
     authMiddleware.authCaptain,
      captainController.updateLocation);
router.get('/nearby', authMiddleware.authCaptain, captainController.getNearbyCaptains);
router.patch(
  "/status",
  authMiddleware.authCaptain,
  captainController.updateStatus
);
module.exports=router;
