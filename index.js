import express from "express";
import { setupInventoryRoutes } from "./vinsolutions/routes/crm.js";
import { setupDealership360Routes } from "./dealership360/routes/crm.js";

const app = express();
app.use(express.json({ type: ["application/json", "application/*+json"] }));

// ================= ROUTES SETUP =================
setupInventoryRoutes(app);
setupDealership360Routes(app);

// ================= SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});