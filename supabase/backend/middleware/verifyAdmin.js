import { supabase } from "../supabaseClient.js";

export async function verifyAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return res.status(401).json({ error: "Missing access token" });
    }

    // 🔥 Correct way using service role
    const { data: { user }, error } =
      await supabase.auth.admin.getUserById(
        (await supabase.auth.getUser(token)).data.user.id
      );

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // ✅ Use auth_id OR id consistently
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id) // correct FK
      .single();

    if (profileError || profile.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("verifyAdmin error", err);
    res.status(500).json({ error: "Failed to verify admin" });
  }
}
