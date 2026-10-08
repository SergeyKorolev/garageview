import client from "./client";
import type { User, UpdateUserPayload } from "@/types/user";

export async function getCurrentUser(): Promise<User> {
  const { data } = await client.get("/me");
  return data;
}

export async function updateUser(payload: UpdateUserPayload): Promise<User> {
  const { data } = await client.patch("/me", { user: payload });
  return data;
}

export async function deleteAccount(): Promise<void> {
  await client.delete("/me");
}

export async function exportUserData(): Promise<void> {
  const response = await client.get("/me/export", {
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `garageview-export-${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
