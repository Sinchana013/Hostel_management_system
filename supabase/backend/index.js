import express from "express";
import cors from "cors";
import { supabase } from "./supabaseClient.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/test-db", async (req, res) => {
  const { data, error } = await supabase
    .from("students")
    .select("usn")
    .limit(1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({
    success: true,
    message: "Backend connected to Supabase DB ✅",
    data,
  });
});

app.use("/admin", adminRoutes);

app.listen(5000, () =>
  console.log("Backend running on port 5000")
);
