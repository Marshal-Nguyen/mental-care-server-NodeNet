const express = require("express");
const bookingController = require("../../modules/booking/booking.controller");
const {
  authMiddleware,
  restrictTo,
} = require("../../middlewares/auth.middleware");

const bookingRouter = express.Router();

bookingRouter.get(
  "/bookings",
  authMiddleware,
  restrictTo("Doctor", "User", "Manager"),
  bookingController.getBookings
);

bookingRouter.post(
  "/createBooking",
  authMiddleware,
  restrictTo("Doctor", "User", "Manager"),
  bookingController.createBooking
);

bookingRouter.post(
  "/updateStatus/:bookingId",
  authMiddleware,
  restrictTo("Doctor", "User", "Manager"),
  bookingController.updateBookingStatus
);

bookingRouter.post(
  "/cancelBooking/:bookingId",
  authMiddleware,
  restrictTo("Doctor", "User", "Manager"),
  bookingController.cancelBooking
);

bookingRouter.post(
  "/autoCancelBooking",
  // authMiddleware,
  restrictTo("Doctor", "User", "Manager"),
  bookingController.autoCancelBookings
);

module.exports = bookingRouter;
