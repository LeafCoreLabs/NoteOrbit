import { auth } from "./client";

export const campusApi = {
  feesList: () => auth().get("/fees/list"),
  hostelComplaints: () => auth().get("/student/hostel/complaints"),
};
