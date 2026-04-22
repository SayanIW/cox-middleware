import express from "express";

const app = express();
app.use(express.json());

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

    const data = await response.text();
    res.status(response.status).send(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔥 NEW ROUTE → parses + flattens JSON
app.post("/vinsolutions/parsed", async (req, res) => {
  try {
    // ✅ JSON is already coming from webhook request
    const json = req.body;

    // ✅ Extract values
    const extracted = {
      status: json?.status || null,
      id: json?.data?.[0]?.id || null,
      firstName:
        json?.data?.[0]?.prospect?.customer?.contact?.names?.find(
          (n) => n.part === "first"
        )?.value || null,
      lastName:
        json?.data?.[0]?.prospect?.customer?.contact?.names?.find(
          (n) => n.part === "last"
        )?.value || null,
      email:
        json?.data?.[0]?.prospect?.customer?.contact?.emails?.[0]?.value ||
        null,
      phone:
        json?.data?.[0]?.prospect?.customer?.contact?.mobilePhone || null,
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