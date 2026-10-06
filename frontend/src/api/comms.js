import { auth } from "./client";

export const commsApi = {
  parentProfessors: () => auth().get("/parent/professors"),
  parentConversations: () => auth().get("/parent/conversations"),
  facultyConversations: () => auth().get("/faculty/conversations"),
};
