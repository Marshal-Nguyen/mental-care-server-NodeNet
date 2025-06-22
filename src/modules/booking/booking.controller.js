const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const createBooking = async (req, res) => {
  console.log(req.body);

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

    // const userRole = req.user?.role;
    // console.log("role", userRole);
    // if (userRole !== "User") {
    //   return res.status(403).json({ message: "Only users can make a booking" });
    // }

    // console.log(req.user);

    // Kiểm tra trùng lịch
    const { data: existingBookings, error: fetchError } = await supabase
      .from("Bookings")
      .select("*")
      .eq("DoctorId", doctorId)
      .eq("Date", date)
      .eq("StartTime", startTime)
      .in("Status", ["Pending", "Confirmed"]);

    if (fetchError) throw fetchError;
    if (existingBookings.length > 0) {
      return res
        .status(400)
        .json({ message: "This time slot is already booked." });
    }

    // Tạo mã BookingCode (ngẫu nhiên)
    const bookingCode = `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Tạo lịch hẹn
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
        Status: "Pending",
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

module.exports = createBooking;
