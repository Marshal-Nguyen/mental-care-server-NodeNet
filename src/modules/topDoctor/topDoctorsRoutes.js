const express = require('express');
const { getTopDoctors } = require('./topDoctorsController');

const router = express.Router();

router.get('/topdoctors/view', getTopDoctors);

module.exports = router;