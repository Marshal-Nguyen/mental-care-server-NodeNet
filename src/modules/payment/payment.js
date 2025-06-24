const express = require("express");
const axios = require("axios");
const moment = require("moment");
const CryptoJS = require("crypto-js");

const paymentZalo = express.Router();

const config = {
  app_id: "2553",
  key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

paymentZalo.post("/pay-booking", async (req, res) => {
  const { amount, items } = req.body;

  console.log(items);
  //visa
  const embeddata = {
    preferred_payment_methods: ["international_card"],
    redirecturl: `http://localhost:5173/EMO/booking/${items[0]?.doctorId}?paymentMethod=zalopay`,
  };

  const transID = Math.floor(Math.random() * 1000000);

  const order = {
    app_id: config.app_id,
    app_trans_id: `${moment().format("YYMMDD")}_${transID}`,
    app_user: "user123",
    app_time: Date.now(),
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embeddata),
    amount: amount,
    description: "ZaloPay Integration Demo",
    bank_code: "",
  };

  const data =
    config.app_id +
    "|" +
    order.app_trans_id +
    "|" +
    order.app_user +
    "|" +
    order.amount +
    "|" +
    order.app_time +
    "|" +
    order.embed_data +
    "|" +
    order.item;
  order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  try {
    await axios.post(config.endpoint, null, { params: order }).then((data) => {
      return res.status(200).json(data.data);
    });
  } catch (error) {
    return res.status(500).json({ mess: "payment fail" });
  }
});

module.exports = paymentZalo;
