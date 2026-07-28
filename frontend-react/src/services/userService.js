import api from "./api";

export async function getMe() {
  const res = await api.get("/users/me");
  return res.data;
}

export async function getTopics() {
  const res = await api.get("/topics");
  return res.data;
}

export async function updateMyTopics(topicIds) {
  const res = await api.post("/users/me/topics", { topic_ids: topicIds });
  return res.data;
}

export async function getMyReminders() {
  const res = await api.get("/users/me/reminders");
  return res.data;
}

export async function updateMyReminders({ frequency, timezone }) {
  const res = await api.post("/users/me/reminders", { frequency, timezone });
  return res.data;
}

export async function completeOnboarding() {
  const res = await api.post("/users/me/onboarding/complete");
  return res.data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const res = await api.post("/users/me/password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return res.data;
}

export async function getAnalytics() {
  const res = await api.get("/analytics/me");
  return res.data;
}

export async function getRecommendations() {
  const res = await api.get("/recommendations/me");
  return res.data;
}
