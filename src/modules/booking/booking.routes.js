const express = require("express");
const createBooking = require("./booking.controller");
const requestUser = require("../../middlewares/requireUser");
const bookingRouter = express.Router();

bookingRouter.post("/createBooking", requestUser, createBooking);

module.exports = bookingRouter;
