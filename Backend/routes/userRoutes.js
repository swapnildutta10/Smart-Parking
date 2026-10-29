const { requireCaptcha } = require('../middleware/loginCaptcha');
const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const createRateLimiter = require('../middleware/rateLimit');
const { register, login, googleLogin, getProfile, updateProfile } = require('../controllers/userController');

const registrationLimit = createRateLimiter({ max: 8 });
const authenticationLimit = createRateLimiter({ max: 12 });

router.post('/', registrationLimit, register);
router.post('/register', registrationLimit, register);
router.post('/login', authenticationLimit, requireCaptcha('user'), login);
router.post('/google', authenticationLimit, googleLogin);
router.get('/profile', requireAuth('user'), getProfile);
router.patch('/profile', requireAuth('user'), updateProfile);

module.exports = router;
