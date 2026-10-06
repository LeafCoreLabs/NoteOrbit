import { auth } from "./client";

export const attendanceApi = {
  stats: () => auth().get("/attendance/stats"),
  today: () => auth().get("/attendance/today"),
  routine: () => auth().get("/attendance/routine"),
};
