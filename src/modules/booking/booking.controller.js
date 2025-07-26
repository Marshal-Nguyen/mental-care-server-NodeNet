const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const createBooking = async (req, res) => {
  try {
    const {
      doctorId,
      patientId,
      date,
      startTime,
      duration,
      price,
      promoCodeId,
      giftCodeId,
    } = req.body;

    const { data: existingBookings, error: fetchError } = await supabase
      .from("Bookings")
      .select("*")
      .eq("DoctorId", doctorId)
      .eq("Date", date)
      .eq("StartTime", startTime)
      .in("Status", "Booking Success");

    if (fetchError) throw fetchError;
    if (existingBookings.length > 0) {
      return res
        .status(400)
        .json({ message: "This time slot is already booked." });
    }

    const bookingCode = `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error: insertError } = await supabase.from("Bookings").insert([
      {
        Id: crypto.randomUUID(),
        BookingCode: bookingCode,
        DoctorId: doctorId,
        PatientId: patientId,
        Date: date,
        StartTime: startTime,
        Duration: duration,
        Price: price,
        PromoCodeId: promoCodeId || null,
        GiftCodeId: giftCodeId || null,
        Status: "Booking Success",
      },
    ]);

    if (insertError) throw insertError;

    return res
      .status(201)
      .json({ message: "Booking created successfully", bookingCode });
  } catch (error) {
    console.error("Error creating booking:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getBookings = async (req, res) => {
  const {
    StartDate,
    EndDate,
    PageIndex = 1,
    PageSize = 10,
    Search = "",
    SortBy = "Date",
    SortOrder = "desc",
    Status,
    doctorId,
    patientId,
    Id,
  } = req.query;

  const pageIndex = parseInt(PageIndex);
  const pageSize = parseInt(PageSize);
  const from = (pageIndex - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    let query = supabase
      .from("Bookings")
      .select("*", { count: "exact" })
      .order("Date", { ascending: SortOrder === "asc" })
      .range(from, to);

    if (Status && Status !== "All") {
      query = query.eq("Status", Status);
    }

    if (StartDate) {
      query = query.gte("Date", StartDate);
    }

    if (EndDate) {
      query = query.lte("Date", EndDate);
    }

    if (Id) {
      query = query.eq("Id", Id);
    }

    if (doctorId) {
      query = query.eq("DoctorId", doctorId);
    }

    if (patientId) {
      query = query.eq("PatientId", patientId);
    }

    if (Search) {
      query = query.ilike("BookingCode", `%${Search}%`);
    }

    query = query
      .order(SortBy, { ascending: SortOrder.toLowerCase() === "asc" })
      .range(from, to);

    const { data: bookings, count, error } = await query;

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Không thể lấy danh sách booking",
        error: error.message,
        data: [],
      });
    }

    const doctorIds = [...new Set(bookings.map((b) => b.DoctorId))];
    const patientIds = [...new Set(bookings.map((b) => b.PatientId))];

    const [{ data: doctors }, { data: patients }] = await Promise.all([
      supabase
        .from("DoctorProfiles")
        .select("Id, FullName")
        .in("Id", doctorIds),
      supabase
        .from("PatientProfiles")
        .select("Id, FullName")
        .in("Id", patientIds),
    ]);

    const doctorMap = Object.fromEntries(
      doctors.map((d) => [d.Id, d.FullName])
    );
    const patientMap = Object.fromEntries(
      patients.map((p) => [p.Id, p.FullName])
    );

    const result = bookings.map((booking) => ({
      ...booking,
      doctorName: doctorMap[booking.DoctorId] || "N/A",
      patientName: patientMap[booking.PatientId] || "N/A",
    }));

    const { data: statusCounts, error: statusError } = await supabase
      .from("Bookings")
      .select("Status, count:Id", { groupBy: "Status" });

    const statusSummary = {};
    statusCounts.forEach((s) => {
      const status = s.Status;
      statusSummary[status] = (statusSummary[status] || 0) + 1;
    });

    return res.status(200).json({
      data: result,

      totalCount: count,
      statusSummary: {
        statusSummary: {
          totalBookingSuccess: statusSummary["Booking Success"] || 0,
          totalCheckIn: statusSummary["CheckIn"] || 0,
          totalCheckOut: statusSummary["CheckOut"] || 0,
          totalCancelled: statusSummary["Cancelled"] || 0,
        },
      },
      pageIndex,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: err.message,
      data: [],
    });
  }
};

const updateBookingStatus = async (req, res) => {
  const { bookingId } = req.params;
  const { status } = req.body;

  if (!bookingId || !status) {
    return res.status(400).json({
      success: false,
      message: "Thiếu bookingId hoặc status cần cập nhật",
    });
  }

  try {
    const { data, error } = await supabase
      .from("Bookings")
      .update({ Status: status })
      .eq("Id", bookingId)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Không thể cập nhật trạng thái booking",
        error: error.message,
      });
    }

    return res.status(200).json({
      message: "Cập nhật trạng thái thành công",
      data,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: err.message,
    });
  }
};

const cancelBooking = async (req, res) => {
  const { bookingId } = req.params;

  if (!bookingId) {
    return res.status(400).json({
      success: false,
      message: "Thiếu bookingId",
    });
  }

  try {
    const { data: booking, error: bookingError } = await supabase
      .from("Bookings")
      .select("Id, Date, StartTime")
      .eq("Id", bookingId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy booking",
      });
    }

    const { data: payment, error: paymentError } = await supabase
      .from("Payments")
      .select("Id, TotalAmount")
      .eq("BookingId", booking.Id)
      .maybeSingle();

    const scheduleDate = new Date(booking.Date);
    const [hours, minutes, seconds] = booking.StartTime.split(":").map(Number);
    scheduleDate.setHours(hours, minutes, seconds || 0);

    const now = new Date();

    const diffInHours = (scheduleDate - now) / (1000 * 60 * 60);

    const { data: updatedBooking, error: updateBookingError } = await supabase
      .from("Bookings")
      .update({ Status: "Cancelled" })
      .eq("Id", bookingId)
      .select()
      .single();

    if (updateBookingError) {
      return res.status(500).json({
        success: false,
        message: "Không thể cập nhật trạng thái booking",
        error: updateBookingError.message,
      });
    }

    let updatedPrice = false;

    if (diffInHours >= 24 && payment?.Id) {
      const { error: updatePaymentError } = await supabase
        .from("Payments")
        .update({ TotalAmount: payment.TotalAmount * 0.5 })
        .eq("Id", payment.Id);

      if (updatePaymentError) {
        return res.status(500).json({
          success: false,
          message: "Huỷ thành công nhưng lỗi khi cập nhật tiền",
          error: updatePaymentError.message,
        });
      }

      updatedPrice = true;
    }

    return res.status(200).json({
      success: true,
      message: updatedPrice
        ? "Đã huỷ và bạn sẽ nhận được tiền hoàn sau 2 ngày (trước 1 ngày)"
        : "Đã huỷ (do huỷ trễ hơn 1 ngày, không hoàn tiền)",
      updatedBooking,
      updatedPrice,
      newAmount: updatedPrice ? 100000 : null,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi máy chủ",
      error: err.message,
    });
  }
};

const autoCancelBookings = async (req, res) => {
  try {
    const now = new Date();
    const toCancel = [];

    const { data: bookings, error } = await supabase
      .from("Bookings")
      .select("Id, Date, StartTime, Status")
      .eq("Status", "Booking Success");

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách booking",
        error: error.message,
      });
    }

    for (const booking of bookings) {
      const scheduleTime = new Date(booking.Date);
      const [hours, minutes, seconds] =
        booking.StartTime.split(":").map(Number);
      scheduleTime.setHours(hours, minutes, seconds || 0);

      const diffInMinutes = (now - scheduleTime) / (1000 * 60);

      if (diffInMinutes >= 15) {
        toCancel.push(booking.Id);
      }
    }

    if (toCancel.length > 0) {
      const { error: updateError } = await supabase
        .from("Bookings")
        .update({ Status: "Cancelled" })
        .in("Id", toCancel);

      if (updateError) {
        return res.status(500).json({
          success: false,
          message: "Lỗi khi huỷ booking",
          error: updateError.message,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `${toCancel.length} booking đã bị huỷ tự động.`,
      cancelledIds: toCancel,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
      error: err.message,
    });
  }
};

module.exports = {
  createBooking,
  getBookings,
  updateBookingStatus,
  cancelBooking,
  autoCancelBookings,
};
