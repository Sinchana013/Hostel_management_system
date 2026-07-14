import { Router } from "express";
import { supabase } from "../supabaseClient.js";
import { verifyAdmin } from "../middleware/verifyAdmin.js";

const router = Router();

/**
 * ============================
 * HELPER: COUNT ROWS (v2 SAFE)
 * ============================
 */
async function countRows(table, filters = {}) {
  let query = supabase
    .from(table)
    .select("*", { head: true, count: "exact" });

  Object.entries(filters).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * ============================
 * ADMIN OVERVIEW (WORKING)
 * ============================
 */
router.get("/overview", verifyAdmin, async (req, res) => {
  try {
    const [
      students,
      managers,
      totalLeaves,
      pending,
      approved,
      rejected,
      emergencyFlags,
    ] = await Promise.all([
      countRows("students"),
      countRows("manager"),
      countRows("leave_requests"),
      countRows("leave_requests", { status: "requested" }),
      countRows("leave_requests", { status: "approved" }),
      countRows("leave_requests", { status: "rejected" }),
      countRows("leave_requests", { emergency: true }),
    ]);

    res.json({
      students,
      managers,
      totalLeaves,
      leaves: {
        pending,
        approved,
        rejected,
      },
      emergencyFlags,
    });
  } catch (err) {
    console.error("Admin overview error:", err);
    res.status(500).json({ error: "Failed to load admin overview" });
  }
});

/**
 * ============================
 * MANAGE MANAGERS (ADD)
 * ============================
 */
router.post("/managers", verifyAdmin, async (req, res) => {
  try {
    const { name, email, phone } = req.body || {};

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const managerName = name.trim();
    const managerEmail = email.trim().toLowerCase();
    const phoneNo = phone ? phone.trim() : null;

    // check if manager already exists
    const { data: existing, error: existsError } = await supabase
      .from("manager")
      .select("id")
      .eq("email", managerEmail)
      .maybeSingle();

    if (existsError) throw existsError;

    if (existing) {
      return res.status(409).json({ error: "Manager already exists" });
    }

    // insert manager (MATCHES YOUR SCHEMA)
    const { data, error } = await supabase
      .from("manager")
      .insert({
        manager_name: managerName,
        email: managerEmail,
        phoneno: phoneNo,
      })
      .select("id, manager_name, email, phoneno")
      .single();

    if (error) throw error;

    res.status(201).json({
      message: "Manager added successfully",
      manager: data,
    });
  } catch (err) {
    console.error("Add manager error:", err);
    res.status(500).json({ error: "Failed to add manager" });
  }
});

/**
 * ============================
 * USER DIRECTORY (READ ONLY)
 * ============================
 */
router.get("/users", verifyAdmin, async (req, res) => {
  try {
    const [students, managers] = await Promise.all([
      supabase
        .from("students")
        .select("usn, name, email, course, semester, room_no")
        .order("name"),
      supabase
        .from("manager")
        .select("id, manager_name, email, phoneno")
        .order("manager_name"),
    ]);

    if (students.error) throw students.error;
    if (managers.error) throw managers.error;

    res.json({
      students: students.data ?? [],
      managers: managers.data ?? [],
    });
  } catch (err) {
    console.error("User directory error:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

/**
 * ============================
 * LEAVE MONITOR (READ ONLY)
 * ============================
 */
router.get("/leaves", verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("leave_requests")
      .select(
        `
        id,
        std_usn,
        leave_from_date,
        leave_to_date,
        status,
        emergency,
        created_at
        `
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw error;

    res.json({
      leaves: data ?? [],
    });
  } catch (err) {
    console.error("Leave monitor error:", err);
    res.status(500).json({ error: "Failed to load leave monitor" });
  }
});


export default router;
