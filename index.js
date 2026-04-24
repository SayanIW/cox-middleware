import express from "express";

const app = express();
app.use(express.json({ type: ["application/json", "application/*+json"] }));

let vinSolutionsToken = {
  accessToken: null,
  expiresAt: 0,
};

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
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
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

async function fetchInventoryPage(accessToken, query) {
  const url = new URL("https://sandbox.api.vinsolutions.com/gateway/v1/vehicle/getInventory");

  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, item);
      }
      continue;
    }

    if (value !== undefined && value !== null && value !== "") {
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

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = typeof data === "string"
      ? data
      : data?.ErrorMessage || data?.error || "Inventory request failed";
    throw new Error(message);
  }

  if (typeof data === "string") {
    throw new Error("Inventory API returned a non-JSON response");
  }

  return data;
}

app.post("/vinsolutions", async (req, res) => {
  try {
    const response = await fetch(
      "https://sandbox.api.vinsolutions.com/leadSubmissions",
      {
        method: "POST",
        headers: {
          "Accept": "application/vnd.coxauto.v2+json",
          "Content-Type": "application/vnd.coxauto.v2+json",
          "api_key": '6ZprbgiKHq2wWCmUaVlzO13HZDaNmn4L1YNoSElN',
          "Authorization": req.headers.authorization, // dynamic token from GHL
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

async function handleFetchInventory(req, res) {
  try {
    const accessToken = await getVinSolutionsAccessToken();
    const baseQuery = {
      ...req.query,
      dealerId: req.query.dealerId || "18583",
      count: req.query.count || "100",
      page: "1",
    };

    const firstPage = await fetchInventoryPage(accessToken, baseQuery);
    const pageCount = firstPage?.PagingInfo?.PageCount || 1;
    const vehicles = Array.isArray(firstPage?.Vehicles) ? [...firstPage.Vehicles] : [];

    if (pageCount > 1) {
      const remainingPages = await Promise.all(
        Array.from({ length: pageCount - 1 }, (_, index) =>
          fetchInventoryPage(accessToken, {
            ...baseQuery,
            page: String(index + 2),
          })
        )
      );

      for (const pageData of remainingPages) {
        if (Array.isArray(pageData?.Vehicles)) {
          vehicles.push(...pageData.Vehicles);
        }
      }
    }

    res.status(200).json({
      ...firstPage,
      PagingInfo: {
        ...firstPage.PagingInfo,
        PageNumber: 1,
        PageSize: vehicles.length,
        PageCount: pageCount,
        TotalItems: firstPage?.PagingInfo?.TotalItems || vehicles.length,
      },
      Vehicles: vehicles,
      TotalCount: firstPage?.TotalCount || vehicles.length,
      Success: firstPage?.Success ?? true,
      ErrorMessage: firstPage?.ErrorMessage || null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

app.get("/fetch-inventory", handleFetchInventory);
app.get("/fetch_inventory", handleFetchInventory);

// 🔥 NEW ROUTE → parses + flattens JSON
app.post("/vinsolutions/parsed", async (req, res) => {
  try {
    // ✅ JSON is already coming from webhook request
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


    // ✅ Extract values
    const extracted = {
      status: json?.status || null,
      id: record?.id || null,
      firstName:
        contact?.names?.find((n) => n.part === "first")?.value || null,
      lastName:
        contact?.names?.find((n) => n.part === "last")?.value || null,
      email: contact?.emails?.[0]?.value || null,
      phone: contact?.mobilePhone || null,
    };

    // ✅ Send flattened response
    res.status(200).json(extracted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});