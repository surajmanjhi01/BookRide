const express = require('express');
const router = express.Router();

const { body } = require('express-validator');
const { registerUser } = require('../controllers/user.controller');
router.post('/register', [
    body('fullname.firstname')
        .notEmpty()
        .withMessage('First name is required'),

    body('fullname.lastname')
        .notEmpty()
        .withMessage('Last name is required'),

    body('email')
        .isEmail()
        .withMessage('Valid email is required'),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
], registerUser);

module.exports = router;