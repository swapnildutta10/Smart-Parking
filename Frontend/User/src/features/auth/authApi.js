const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

export async function authRequest(action, body) {
  let response;
  try {
    response = await fetch(`${API_URL}/users/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Could not reach the server. Check that the backend is running on port 5000.");
  }
  const result = await response.json().catch(() => {
    throw new Error("The server returned an invalid response. Check the API URL and backend.");
  });
  if (!response.ok) throw new Error(result.message || "Could not complete the request.");
  return result;
}
