const express = require("express");
const bookingController = require("../../modules/booking/booking.controller");
const requestUser = require("../../middlewares/requireUser");
const bookingRouter = express.Router();

bookingRouter.get("/bookings", bookingController.getBookings);

bookingRouter.post(
  "/createBooking",
  requestUser,
  bookingController.createBooking
);

bookingRouter.post(
  "/updateStatus/:bookingId",
  bookingController.updateBookingStatus
);

module.exports = bookingRouter;
