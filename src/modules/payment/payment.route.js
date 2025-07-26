const express = require("express");
const paymentController = require("../payment/payment.controller");
const paymentZalo = express.Router();
const {
  authMiddleware,
  restrictTo,
} = require("../../middlewares/auth.middleware");

paymentZalo.post(
  "/pay-booking",
  authMiddleware,
  restrictTo("User", "Manager"),
  paymentController.paymentZalo
);

paymentZalo.post(
  `/callback`,
  paymentController.paymentCallback
);

paymentZalo.get(
  "/check-payment-status/:transId",

  paymentController.checkPayment
);

paymentZalo.get(
  "/",
  authMiddleware,
  restrictTo("User", "Manager"),
  paymentController.getPayment
);

paymentZalo.get(
  "/daily-total",
  authMiddleware,
  restrictTo("User", "Manager"),
  paymentController.getDailyTotal
);
module.exports = paymentZalo;
