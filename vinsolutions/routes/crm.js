import { getVinSolutionsAccessToken } from "../utils/token.js";
import { fetchInventoryPage } from "../utils/inventory.js";
import { formatVehicleForAI } from "../utils/formatter.js";

export async function handleFetchInventory(req, res) {
  try {
    const accessToken = await getVinSolutionsAccessToken();
    const {
      page: _ignoredPage,
      search: _localSearch,
      stockNumber,
      ...remainingQuery
    } = req.query;

    const baseQuery = {
      ...remainingQuery,
      dealerId: req.query.dealerId || "18583",
      ...(stockNumber ? { stockNumber } : {}),
      count: req.query.count || "50",
      page: "1",
    };

    const firstPage = await fetchInventoryPage(accessToken, baseQuery);
    const pageCount = firstPage?.PagingInfo?.PageCount || 1;
    let vehicles = Array.isArray(firstPage?.Vehicles) ? [...firstPage.Vehicles] : [];

    if (pageCount > 1) {
      const remainingPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) =>
          fetchInventoryPage(accessToken, {
            ...baseQuery,
            page: String(index + 2),
          })
        )
      );

      remainingPages.forEach((pageData) => {
        if (Array.isArray(pageData?.Vehicles)) {
          vehicles.push(...pageData.Vehicles);
        }
      });
    }

    // Filter (optional but recommended)
    const search = (req.query.search || "").toLowerCase();

    if (search) {
      vehicles = vehicles.filter(v => {
        const core = v.Core || {};
        return `${core.Year} ${core.Make} ${core.Model} ${core.Trim}`
          .toLowerCase()
          .includes(search);
      });
    }

    // Transform
    const formattedVehicles = vehicles.map(formatVehicleForAI);

    const combinedText = formattedVehicles.map(v => v.text).join("\n\n---\n\n");

    // Response
    return res.status(200).type("text/plain").send(combinedText);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export function setupInventoryRoutes(app) {
  app.get("/fetch-inventory", handleFetchInventory);
  app.get("/fetch_inventory", handleFetchInventory);

  app.post("/vinsolutions", async (req, res) => {
    try {
      const response = await fetch(
        "https://sandbox.api.vinsolutions.com/leadSubmissions",
        {
          method: "POST",
          headers: {
            "Accept": "application/vnd.coxauto.v2+json",
            "Content-Type": "application/vnd.coxauto.v2+json",
            "api_key": "",
            "Authorization": req.headers.authorization,
          },
          body: JSON.stringify(req.body),
        }
      );

      const data = await response.json();
      res.status(response.status).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/vinsolutions/parsed", async (req, res) => {
    try {
      const json = req.body;
      const record = Array.isArray(json) ? json[0] : json?.data?.[0] || null;
      const contact = record?.prospect?.customer?.contact || null;
      console.log("🔥 Content-Type:", req.headers["content-type"]);
      console.log("🔥 req.is('application/json'):", req.is("application/json"));
      console.log("🔥 req.is('application/*+json'):", req.is("application/*+json"));
      console.log("🔥 typeof req.body:", typeof req.body);
      console.log("🔥 req.body is array:", Array.isArray(req.body));
      console.log(
        "🔥 top-level keys:",
        req.body && typeof req.body === "object" ? Object.keys(req.body) : "not-an-object"
      );
      console.log("🔥 Incoming Body:");
      console.log(JSON.stringify(req.body, null, 2));
      console.log("🔥 json.data type:", typeof json?.data);
      console.log("🔥 json.data is array:", Array.isArray(json?.data));
      console.log("🔥 selected record:", JSON.stringify(record, null, 2));
      console.log("🔥 contact path:", JSON.stringify(contact, null, 2));

      const extracted = {
        status: json?.status || null,
        id: record?.id || null,
        firstName: contact?.names?.find((n) => n.part === "first")?.value || null,
        lastName: contact?.names?.find((n) => n.part === "last")?.value || null,
        email: contact?.emails?.[0]?.value || null,
        phone: contact?.mobilePhone || null,
      };

      res.status(200).json(extracted);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}
