import { auth, unauth } from "./client";

export const academicsApi = {
  notes: (params) => auth().get("/notes", { params }),
  notices: (params) => auth().get("/notices", { params }),
  librarySearch: (params) => auth().get("/api/library/search", { params }),
  facultyAllocations: () => auth().get("/faculty/allocations"),
  facultyStudents: (params) => auth().get("/faculty/students", { params }),
};
