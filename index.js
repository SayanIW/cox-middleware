import express from "express";

const app = express();
app.use(express.json({ type: ["application/json", "application/*+json"] }));

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