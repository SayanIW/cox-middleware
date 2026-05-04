export async function fetchInventoryPage(accessToken, query) {
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
