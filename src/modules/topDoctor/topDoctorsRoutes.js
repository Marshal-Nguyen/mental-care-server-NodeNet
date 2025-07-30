const express = require('express');
const { getTopDoctors, getBookingStats } = require('./topDoctorsController');

const router = express.Router();

router.get('/topdoctors/view', getTopDoctors);
router.get("/topdoctors/stats", getBookingStats);
module.exports = router;