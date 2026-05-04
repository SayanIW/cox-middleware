let vinSolutionsToken = {
  accessToken: null,
  expiresAt: 0,
};

export async function getVinSolutionsAccessToken() {
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
