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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});