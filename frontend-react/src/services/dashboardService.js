import api from "./api";

export async function getDashboardData() {
  const res = await api.get("/dashboard/me", {
    headers: { "Cache-Control": "no-cache, no-store" },
  });
  return res.data;
}

export async function getHeatmap() {
  const res = await api.get("/heatmap/me");
  return res.data;
}
