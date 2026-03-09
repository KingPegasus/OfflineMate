import * as Contacts from "expo-contacts";
import type { Tool } from "@/tools/tool-registry";

export const searchContactsTool: Tool = {
  name: "contacts.search",
  description: "Search local contacts by name",
  keywords: ["contact", "call", "phone"],
  params: { required: ["query"] },
  execute: async (params) => {
    const query = params.query ?? "";
    const perm = await Contacts.requestPermissionsAsync();
    if (!perm.granted) return { ok: false, message: "Contacts permission denied." };
    const response = await Contacts.getContactsAsync({
      name: query,
      fields: [Contacts.Fields.PhoneNumbers],
      pageSize: 5,
    });
    return {
      ok: true,
      message: `Found ${response.data.length} contacts.`,
      payload: {
        contacts: response.data.map((c) => ({ id: c.id, name: c.name })),
      },
    };
  },
};

