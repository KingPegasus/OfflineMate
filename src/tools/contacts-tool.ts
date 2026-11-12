import * as Contacts from "expo-contacts/legacy";
import type { Tool } from "@/tools/tool-registry";
import { contactSearchNames, extractContactName } from "@/tools/contact-query";
import { permissionOffMessage } from "@/tools/permission-message";

const MAX_CONTACTS = 5;

function phonesOf(contact: Contacts.ExistingContact): string[] {
  const seen = new Set<string>();
  const phones: string[] = [];
  for (const p of contact.phoneNumbers ?? []) {
    const number = (p.number ?? p.digits ?? "").trim();
    // The same number is often saved twice (e.g. synced from two accounts).
    const key = number.replace(/[^\d+]/g, "");
    if (!number || seen.has(key)) continue;
    seen.add(key);
    phones.push(number);
  }
  return phones;
}

export const searchContactsTool: Tool = {
  name: "contacts.search",
  description: "Find a contact's phone number by name",
  keywords: ["contact", "call", "phone", "phone number", "contact number", "mobile number", "'s number"],
  params: { required: ["query"] },
  execute: async (params) => {
    // The planner may pass just the name, or the whole message; both go through the same cleanup.
    const name = extractContactName(params.query || params.text || "");
    if (!name) {
      return {
        ok: false,
        message: 'Whose number should I look up? Try "What is Ali\'s number?"',
        errorCode: "PARSE_FAILURE",
      };
    }
    const perm = await Contacts.requestPermissionsAsync();
    if (!perm.granted) {
      return {
        ok: false,
        message: permissionOffMessage("Contacts"),
        errorCode: "PERMISSION_DENIED",
      };
    }
    let found: Contacts.ExistingContact[] = [];
    for (const candidate of contactSearchNames(name)) {
      const response = await Contacts.getContactsAsync({
        name: candidate,
        fields: [Contacts.Fields.PhoneNumbers],
        pageSize: MAX_CONTACTS,
      });
      found = response.data.slice(0, MAX_CONTACTS);
      if (found.length > 0) break;
    }
    if (found.length === 0) {
      return { ok: false, message: `No contact named "${name}" found.`, payload: { contacts: [] } };
    }
    const contacts = found.map((c) => ({ id: c.id, name: c.name, phones: phonesOf(c) }));
    return {
      ok: true,
      message: `Found ${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"} for "${name}".`,
      payload: { contacts },
    };
  },
};
