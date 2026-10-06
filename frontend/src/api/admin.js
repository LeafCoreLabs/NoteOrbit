import { api, auth, unauth } from "./client";

export const adminApi = {
  degrees: () => unauth().get("/admin/degrees"),
  sections: (params) => unauth().get("/admin/sections", { params }),
  subjects: (params) => unauth().get("/admin/subjects", { params }),
  pendingStudents: () => auth().get("/admin/pending-students"),
  students: (params) => auth().get("/admin/students", { params }),
  faculty: () => auth().get("/admin/faculty"),
};
