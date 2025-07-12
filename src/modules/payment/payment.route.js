const express = require("express");
const paymentController = require("../payment/payment.controller");
const paymentZalo = express.Router();
paymentZalo.post("/pay-booking", paymentController.paymentZalo);

paymentZalo.post(`/callback`, paymentController.paymentCallback);

paymentZalo.get(
  "/check-payment-status/:transId",
  paymentController.checkPayment
);

paymentZalo.get("/", paymentController.getPayment);

paymentZalo.get("/daily-total", paymentController.getDailyTotal);
module.exports = paymentZalo;
