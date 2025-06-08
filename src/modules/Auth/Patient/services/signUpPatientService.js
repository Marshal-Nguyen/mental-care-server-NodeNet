const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const getPatientRoleId = async () => {
  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "Patient")
    .single();

  if (error || !data) throw new Error("Không tìm thấy role Patient");
  return data.id;
};

module.exports = {
  getPatientRoleId,
};
