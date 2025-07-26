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

const config = {
  app_id: "2553",
  key1: "PcY4iZIKFCIdgZvA6ueMcMHHUbRLYjPL",
  key2: "kLtgPl8HHhfvMuDHPwKfgfsY4Ydm9eIz",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

const paymentZalo = async (req, res) => {
  const { amount, items, patientProfileId } = req.body;

  //visa
  embeddata = {
    preferred_payment_methods: ["international_card"],
    redirecturl: `https://emoeaseai-ruby.vercel.app/payments/callback`,
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
    callback_url: `https://mental-care-server-nodenet.onrender.com/api/payment-zalo/callback`,
    // callback_url: `${process.env.NGROK_URL}/api/payment-zalo/callback`,
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

    return res.status(200).json(response.data);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Payment failed", error: error.message });
  }
};

const paymentCallback = async (req, res) => {
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

    const bookingId = uuidv4();
    const paymentId = uuidv4();
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
      Status: "Booking Success",
    });

    if (bookingErr) {
      result.return_code = 0;
      result.return_message = "Failed to create booking";
      return res.json(result);
    }

    await supabase.from("Payments").insert({
      Id: paymentId,
      PatientProfileId: embed.patientId,
      TotalAmount: amount,
      Status: "Success",
      BookingId: bookingId,
      PaymentMethodId: "ab388a73-94e6-4d54-a546-45888fa28055",
      CreatedAt: new Date().toISOString(),
      CreatedBy: embed.patientId,
      PaymentType: "booking",
    });

    await supabase.from("PaymentDetails").insert({
      Id: uuidv4(),
      PaymentId: paymentId,
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
};

const checkPayment = async (req, res) => {
  const { transId } = req.params;

  console.log(transId);
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
};

const getPayment = async (req, res) => {
  const {
    PageIndex = 1,
    PageSize = 10,
    SortOrder = "desc",
    Status = "Success",
    StartDate,
    EndDate,
    patientId,
    Id,
  } = req.query;

  const pageIndex = parseInt(PageIndex);
  const pageSize = parseInt(PageSize);
  const from = (pageIndex - 1) * pageSize;
  const to = from + pageSize - 1;

  const applyFilters = (query) => {
    if (Status && Status !== "All") query = query.eq("Status", Status);
    if (StartDate) query = query.gte("CreatedAt", `${StartDate}T00:00:00`);
    if (EndDate) query = query.lte("CreatedAt", `${EndDate}T23:59:59.999`);
    if (Id) query = query.eq("Id", Id);
    if (patientId) query = query.eq("PatientProfileId", patientId);
    return query;
  };

  try {
    let paymentQuery = applyFilters(
      supabase
        .from("Payments")
        .select("*", { count: "exact" })
        .order("CreatedAt", { ascending: SortOrder === "asc" })
        .range(from, to)
    );

    const { data: payments, count, error: paymentErr } = await paymentQuery;

    if (paymentErr) {
      return res.status(500).json({
        success: false,
        message: "Lỗi lấy dữ liệu thanh toán",
        error: paymentErr.message,
      });
    }

    const bookingIds = payments.map((p) => p.BookingId).filter(Boolean);
    let bookings = [];
    if (bookingIds.length > 0) {
      const { data, error } = await supabase
        .from("Bookings")
        .select("Id, PatientId, DoctorId, BookingCode")
        .in("Id", bookingIds);
      if (error) throw error;
      bookings = data;
    }

    const patientIds = [...new Set(bookings.map((b) => b.PatientId))];
    let patients = [];
    if (patientIds.length > 0) {
      const { data, error } = await supabase
        .from("PatientProfiles")
        .select("Id, FullName")
        .in("Id", patientIds);
      if (error) throw error;
      patients = data;
    }

    const paymentIds = payments.map((p) => p.Id);
    let paymentDetails = [];
    if (paymentIds.length > 0) {
      const { data, error } = await supabase
        .from("PaymentDetails")
        .select("PaymentId, ExternalTransactionCode")
        .in("PaymentId", paymentIds);
      if (error) throw error;
      paymentDetails = data;
    }

    const transactionCodeMap = Object.fromEntries(
      paymentDetails.map((d) => [d.PaymentId, d.ExternalTransactionCode])
    );

    const totalQuery = applyFilters(
      supabase.from("Payments").select("TotalAmount")
    );
    const { data: totalData, error: totalError } = await totalQuery;
    if (totalError) throw totalError;

    const totalAmount = totalData.reduce((sum, p) => sum + p.TotalAmount, 0);

    const bookingsMap = Object.fromEntries(bookings.map((b) => [b.Id, b]));
    const patientsMap = Object.fromEntries(
      patients.map((p) => [p.Id, p.FullName])
    );

    const result = payments.map((payment) => {
      const booking = bookingsMap[payment.BookingId] || {};
      const patientName = patientsMap[booking.PatientId] || "N/A";
      return {
        id: payment.Id,
        transaction_code: transactionCodeMap[payment.Id] || "N/A",
        amount: payment.TotalAmount,
        status: payment.Status,
        bookingId: payment.BookingId,
        bookingCode: booking.BookingCode || "N/A",
        createdAt: payment.CreatedAt,
        patientName,
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
      totalAmount,
      total: count,
      pageIndex,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: err.message,
    });
  }
};

const getDailyTotal = async (req, res) => {
  const { StartDate, EndDate } = req.query;

  if (!StartDate || !EndDate) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng truyền StartDate và EndDate",
    });
  }

  const start = moment(StartDate, "YYYY-MM-DD");
  const end = moment(EndDate, "YYYY-MM-DD");

  if (!start.isValid() || !end.isValid()) {
    return res.status(400).json({
      success: false,
      message: "Định dạng ngày không hợp lệ. Định dạng hợp lệ: YYYY-MM-DD",
    });
  }

  let totalAmountInRange = 0;
  let totalPaymentsInRange = 0;

  try {
    const { data: allPayments, error } = await supabase
      .from("Payments")
      .select("TotalAmount, CreatedAt")
      .gte("CreatedAt", start.startOf("day").toISOString())
      .lte("CreatedAt", end.endOf("day").toISOString())
      .eq("Status", "Success");

    if (error) throw error;

    const paymentsByDate = {};

    allPayments.forEach((payment) => {
      const date = moment(payment.CreatedAt).format("YYYY-MM-DD");
      if (!paymentsByDate[date]) {
        paymentsByDate[date] = { totalAmount: 0, count: 0 };
      }
      paymentsByDate[date].totalAmount += payment.TotalAmount;
      paymentsByDate[date].count += 1;
      totalAmountInRange += payment.TotalAmount;
      totalPaymentsInRange += 1;
    });

    const totals = [];
    for (let m = start.clone(); m.isSameOrBefore(end); m.add(1, "day")) {
      const dateStr = m.format("YYYY-MM-DD");
      totals.push({
        date: dateStr,
        totalAmount: paymentsByDate[dateStr]?.totalAmount || 0,
        paymentCount: paymentsByDate[dateStr]?.count || 0,
      });
    }

    return res.status(200).json({
      data: totals,
      totalAmountInRange,
      totalPaymentsInRange,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Lỗi server",
      error: err.message,
    });
  }
};

module.exports = {
  getDailyTotal,
  getPayment,
  checkPayment,
  paymentCallback,
  paymentZalo,
};
