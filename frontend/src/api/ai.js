import { auth } from "./client";

export const aiApi = {
  sessions: () => auth().get("/ai/sessions"),
  academicInsights: () => auth().get("/api/academic-insights"),
  chat: (data, config) => auth().post("/chat", data, config),
};
