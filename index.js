import express from "express";

const app = express();
app.use(express.json({ type: ["application/json", "application/*+json"] }));

let vinSolutionsToken = {
  accessToken: null,
  expiresAt: 0,
};

// ================= TOKEN =================
async function getVinSolutionsAccessToken() {
  const now = Date.now();

  if (vinSolutionsToken.accessToken && now < vinSolutionsToken.expiresAt) {
    return vinSolutionsToken.accessToken;
  }

  const tokenBody = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: "gatew-d5abf439107d43a684f0eb9b24268dab",
    client_secret: "8E29DBB07BD9415FAC17B738DCE79243",
    scope: "PublicAPI",
  });

  const response = await fetch("https://authentication.vinsolutions.com/connect/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Unable to fetch access token");
  }

  vinSolutionsToken = {
    accessToken: data.access_token,
    expiresAt: now + Math.max((data.expires_in || 3600) - 60, 0) * 1000,
  };

  return vinSolutionsToken.accessToken;
}

// ================= FETCH PAGE =================
async function fetchInventoryPage(accessToken, query) {
  const url = new URL("https://sandbox.api.vinsolutions.com/gateway/v1/vehicle/getInventory");

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      value.forEach(v => url.searchParams.append(key, v));
    } else if (value !== undefined && value !== null && value !== "") {
      url.searchParams.append(key, value);
    }
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      api_key: "qugIdk9o3o5M1QZSgDC7z6cTJSN6NYUJ8De8hRIa",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.ErrorMessage || data?.error || "Inventory request failed");
  }

  return data;
}

// ================= FORMATTER (🔥 IMPORTANT) =================
function formatVehicleForAI(vehicle) {
  const core = vehicle.Core || {};
  const pricing = vehicle.Pricing || {};
  const dealer = vehicle.Dealer || {};

  const name = `${core.Year || ""} ${core.Make || ""} ${core.Model || ""} ${core.Trim || ""}`.trim();

  return {
    name,
    text: `
Vehicle: ${name}
Condition: ${core.InventoryType || "N/A"}
Stock Number: ${core.StockNumber || "N/A"}
VIN: ${core.VIN || "N/A"}

Price: $${pricing.Price || "N/A"}
Internet Price: $${pricing.InternetPrice || "N/A"}

Mileage: ${core.Mileage || "N/A"} miles
Engine: ${core.Engine || "N/A"}
Transmission: ${core.Transmission || "N/A"}

Fuel Economy: ${core.CityMPG || "N/A"} MPG city / ${core.HwyMPG || "N/A"} MPG highway

Exterior Color: ${core.ExteriorColor || "N/A"}
Interior Color: ${core.InteriorColor || "N/A"}

Dealer: ${dealer.Name || "N/A"}

FAQs:

Q: What is the price of the ${name}?
A: The price is $${pricing.Price || "N/A"} and the internet price is $${pricing.InternetPrice || "N/A"}.

Q: What is the mileage of the ${name}?
A: It has ${core.Mileage || "N/A"} miles.

Q: Is this vehicle new or used?
A: This vehicle is ${core.InventoryType || "N/A"}.
    `.trim()
  };
}

// ================= MAIN HANDLER =================
async function handleFetchInventory(req, res) {
  try {
    const accessToken = await getVinSolutionsAccessToken();
    const requestedPage = String(req.query.page || "1");

    const baseQuery = {
      ...req.query,
      dealerId: req.query.dealerId || "18583",
      count: req.query.count || "50",
      page: requestedPage,
    };

    const inventoryPage = await fetchInventoryPage(accessToken, baseQuery);
    let vehicles = Array.isArray(inventoryPage?.Vehicles) ? [...inventoryPage.Vehicles] : [];

    // ================= 🔍 FILTER (OPTIONAL BUT RECOMMENDED) =================
    const search = (req.query.search || "").toLowerCase();

    if (search) {
      vehicles = vehicles.filter(v => {
        const core = v.Core || {};
        return `${core.Year} ${core.Make} ${core.Model} ${core.Trim}`
          .toLowerCase()
          .includes(search);
      });
    }

    // ================= 🔥 TRANSFORM =================
    const formattedVehicles = vehicles.map(formatVehicleForAI);

    const combinedText = formattedVehicles.map(v => v.text).join("\n\n---\n\n");

    // ================= RESPONSE =================
    res.status(200).json({
      success: true,
      total: vehicles.length,
      page: Number(inventoryPage?.PagingInfo?.PageNumber || requestedPage),
      pageCount: Number(inventoryPage?.PagingInfo?.PageCount || 1),

      // AI-ready
      formattedVehicles,

      // Optional
      combinedText,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ================= ROUTES =================
app.get("/fetch-inventory", handleFetchInventory);
app.get("/fetch_inventory", handleFetchInventory);

// ================= SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});