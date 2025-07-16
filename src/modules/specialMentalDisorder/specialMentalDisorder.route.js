const express = require('express');
const router = express.Router();
const SpecificMentalDisordersController = require('./specialMentalDisorder.controller');

router.get('/', SpecificMentalDisordersController.getAllSpecificMentalDisorders);

module.exports = router;