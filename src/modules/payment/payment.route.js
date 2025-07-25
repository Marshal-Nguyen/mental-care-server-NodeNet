const express = require("express");
const paymentController = require("../payment/payment.controller");
const paymentZalo = express.Router();
const { authMiddleware, restrictTo } = require('../../middlewares/auth.middleware');

paymentZalo.post("/pay-booking", authMiddleware, restrictTo('User', 'Manager'), paymentController.paymentZalo);

paymentZalo.post(`/callback`, authMiddleware, restrictTo('User', 'Manager'), paymentController.paymentCallback);

paymentZalo.get("/check-payment-status/:transId", authMiddleware, restrictTo('User', 'Manager'), paymentController.checkPayment);

paymentZalo.get("/", authMiddleware, restrictTo('User', 'Manager'), paymentController.getPayment);

paymentZalo.get("/daily-total", authMiddleware, restrictTo('User', 'Manager'), paymentController.getDailyTotal);
module.exports = paymentZalo;
