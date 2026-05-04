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
}
