const express = require("express");
const axios = require("axios");
const moment = require("moment");
const CryptoJS = require("crypto-js");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const paymentZalo = express.Router();

const config = {
  app_id: "2553",
  key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

paymentZalo.post("/pay-booking", async (req, res) => {
  const { amount, items, patientProfileId } = req.body;

  //visa
  embeddata = {
    preferred_payment_methods: ["international_card"],
    redirecturl: `http://localhost:5173/payments/callback`,
    doctorId: items[0]?.doctorId,
    patientId: items[0]?.patientId,
    date: items[0]?.date,
    startTime: items[0]?.startTime,
    duration: items[0]?.duration,
  };

  const transID = Math.floor(Math.random() * 1000000);

  const order = {
    app_id: config.app_id,
    app_trans_id: `${moment().format("YYMMDD")}_${transID}`,
    app_user: patientProfileId,
    app_time: Date.now(),
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embeddata),
    amount: amount,
    description: "ZaloPay Integration",
    bank_code: "",
    callback_url: `${process.env.NGROK_URL}/api/payment-zalo/callback`,
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
    const response = await axios.post(config.endpoint, null, { params: order });

    if (!items || !items.length || !items[0].patientId) {
      return res
        .status(400)
        .json({ message: "Thiếu thông tin bệnh nhân (patientId)" });
    }
    const { error } = await supabase.from("Payments").insert({
      Id: uuidv4(),
      PatientProfileId: items[0]?.patientId,
      TotalAmount: amount,
      Status: "Pending",
      PaymentMethodId: "ab388a73-94e6-4d54-a546-45888fa28055",
      CreatedAt: new Date().toISOString(),
      CreatedBy: items[0]?.patientId,
      PaymentType: "booking",
    });

    if (error) {
      console.error("Insert Payments error:", error);
      return res
        .status(500)
        .json({ message: "DB insert error", error: error.message });
    }

    return res.status(200).json(response.data);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Payment failed", error: error.message });
  }
});

paymentZalo.post(`/callback`, async (req, res) => {
  let result = {};

  try {
    let dataStr = req.body.data;
    let reqMac = req.body.mac;

    let mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();

    if (reqMac !== mac) {
      result.return_code = -1;
      result.return_message = "mac not equal";
      return res.json(result);
    }

    const dataJson = JSON.parse(dataStr);
    const { app_trans_id, app_user, amount, embed_data } = dataJson;
    const embed = JSON.parse(embed_data);

    const { data: payment, error: paymentErr } = await supabase
      .from("Payments")
      .select("Id")
      .eq("TotalAmount", amount)
      .eq("PatientProfileId", app_user)
      .eq("Status", "Pending")
      .order("CreatedAt", { ascending: false })
      .limit(1)
      .single();

    if (paymentErr || !payment) {
      result.return_code = 0;
      result.return_message = "Payment not found";
      return res.json(result);
    }

    const bookingId = uuidv4();
    const bookingCode = "BK" + Math.floor(Math.random() * 1000000);

    const { error: bookingErr } = await supabase.from("Bookings").insert({
      Id: bookingId,
      BookingCode: bookingCode,
      DoctorId: embed.doctorId,
      PatientId: embed.patientId,
      Date: embed.date,
      StartTime: embed.startTime,
      Duration: embed.duration,
      Price: amount,
      Status: "Confirmed",
    });

    if (bookingErr) {
      result.return_code = 0;
      result.return_message = "Failed to create booking";
      return res.json(result);
    }

    await supabase
      .from("Payments")
      .update({
        Status: "Success",
        BookingId: bookingId,
        LastModified: new Date().toISOString(),
        LastModifiedBy: embed.patientId,
      })
      .eq("Id", payment.Id);

    await supabase.from("PaymentDetails").insert({
      Id: uuidv4(),
      PaymentId: payment.Id,
      Amount: amount,
      ExternalTransactionCode: app_trans_id,
      Status: "Completed",
      CreatedAt: new Date().toISOString(),
    });

    result.return_code = 1;
    result.return_message = "success";
  } catch (err) {
    result.return_code = 0;
    result.return_message = err.message;
  }

  return res.json(result);
});

paymentZalo.get("/check-payment-status/:transId", async (req, res) => {
  const { transId } = req.params;

  try {
    const { data: paymentDetail, error: detailErr } = await supabase
      .from("PaymentDetails")
      .select("PaymentId, Status, Amount, CreatedAt")
      .eq("ExternalTransactionCode", transId)
      .single();

    if (detailErr || !paymentDetail) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy giao dịch" });
    }

    // Lấy thêm thông tin từ bảng Payments
    const { data: payment, error: paymentErr } = await supabase
      .from("Payments")
      .select("BookingId, Status")
      .eq("Id", paymentDetail.PaymentId)
      .single();

    if (paymentErr || !payment) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy thanh toán" });
    }

    return res.status(200).json({
      success: true,
      status: payment.Status,
      bookingId: payment.BookingId,
      amount: paymentDetail.Amount,
      timestamp: paymentDetail.CreatedAt,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Lỗi máy chủ", error: err.message });
  }
});

module.exports = paymentZalo;
