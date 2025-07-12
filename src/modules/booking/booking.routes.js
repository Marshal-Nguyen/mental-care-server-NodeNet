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

bookingRouter.post(
  "/cancelBooking/:bookingId",
  bookingController.cancelBooking
);

bookingRouter.post("/autoCancelBooking", bookingController.autoCancelBookings);

module.exports = bookingRouter;
