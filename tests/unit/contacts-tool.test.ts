import { vi } from "vitest";
import { contactSearchNames, extractContactName } from "@/tools/contact-query";

type FakeContact = { id: string; name: string; phoneNumbers?: { number?: string; digits?: string }[] };

const contacts = vi.hoisted(() => ({
  granted: true,
  saved: [] as FakeContact[],
  getContactsAsync: vi.fn(),
}));

vi.mock("expo-contacts/legacy", () => ({
  Fields: { PhoneNumbers: "phoneNumbers" },
  requestPermissionsAsync: async () => ({ granted: contacts.granted }),
  getContactsAsync: contacts.getContactsAsync,
}));

beforeEach(() => {
  contacts.granted = true;
  contacts.saved = [
    { id: "1", name: "Ali Khan", phoneNumbers: [{ number: "+92 300 1234567" }, { number: "+923001234567" }] },
    { id: "2", name: "Sara Ahmed", phoneNumbers: [{ number: "0321 7654321" }] },
    { id: "3", name: "Mom", phoneNumbers: [] },
  ];
  // Like the system search: a case-insensitive substring of the name.
  contacts.getContactsAsync.mockReset().mockImplementation(async ({ name }: { name: string }) => ({
    data: contacts.saved.filter((c) => c.name.toLowerCase().includes(name.toLowerCase())),
  }));
});

describe("extractContactName", () => {
  it.each([
    ["What is Ali's phone number?", "Ali"],
    ["What’s Ali’s number", "Ali"],
    ["find contact Sara Ahmed", "Sara Ahmed"],
    ["phone number of Sara please", "Sara"],
    ["Give me the mobile number for Ali Khan", "Ali Khan"],
    ["call mom", "mom"],
    ["Search my contacts for Ali", "Ali"],
    ["Ali", "Ali"],
    ["show my contacts", ""],
  ])("%s → %s", (text, name) => {
    expect(extractContactName(text)).toBe(name);
  });

  it("tries the full name, then each word", () => {
    expect(contactSearchNames("Ali Khan")).toEqual(["Ali Khan", "Ali", "Khan"]);
    expect(contactSearchNames("Ali")).toEqual(["Ali"]);
  });
});

describe("contacts.search", () => {
  it("finds the contact from a whole question and replies with the number", async () => {
    const { searchContactsTool } = await import("@/tools/contacts-tool");
    const result = await searchContactsTool.execute({ query: "What is Ali's phone number?" });
    expect(contacts.getContactsAsync).toHaveBeenCalledWith(expect.objectContaining({ name: "Ali" }));
    expect(result.ok).toBe(true);
    expect(result.message).toBe('Found 1 contact for "Ali".');
    // The same number saved twice in different formats is listed once.
    expect(result.payload).toEqual({ contacts: [{ id: "1", name: "Ali Khan", phones: ["+92 300 1234567"] }] });
  });

  it("falls back to one word when the full name isn't saved", async () => {
    const { searchContactsTool } = await import("@/tools/contacts-tool");
    const result = await searchContactsTool.execute({ query: "number of Sara Malik" });
    expect(result.ok).toBe(true);
    expect(result.payload).toEqual({ contacts: [{ id: "2", name: "Sara Ahmed", phones: ["0321 7654321"] }] });
  });

  it("says so when no one matches, and counts it as not clean", async () => {
    const { searchContactsTool } = await import("@/tools/contacts-tool");
    const result = await searchContactsTool.execute({ query: "What is Bilal's number" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe('No contact named "Bilal" found.');
  });

  it("asks whose number when there's no name", async () => {
    const { searchContactsTool } = await import("@/tools/contacts-tool");
    const result = await searchContactsTool.execute({ query: "show my contacts" });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("PARSE_FAILURE");
    expect(contacts.getContactsAsync).not.toHaveBeenCalled();
  });

  it("explains how to allow Contacts when permission is denied", async () => {
    contacts.granted = false;
    const { searchContactsTool } = await import("@/tools/contacts-tool");
    const result = await searchContactsTool.execute({ query: "Ali's number" });
    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe("PERMISSION_DENIED");
    expect(result.message).toMatch(/Settings app/);
  });
});
