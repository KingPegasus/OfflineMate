import { clearImportantMemories, countImportantMemories, saveImportantMemory } from "@/context/long-term-memory";
import { useChatStore } from "@/stores/chat-store";

// A tiny in-memory stand-in for the conversation_memory table.
const table = vi.hoisted(() => ({ rows: [] as { id: string; content: string; created_at: number }[] }));
vi.mock("@/db/database", () => ({
  getDb: () => ({
    runSync: (sql: string, params: unknown[] = []) => {
      if (sql.startsWith("INSERT")) table.rows.push({ id: String(params[0]), content: String(params[1]), created_at: Number(params[2]) });
      if (sql.startsWith("DELETE FROM conversation_memory")) {
        const changes = table.rows.length;
        table.rows = [];
        return { changes, lastInsertRowId: 0 };
      }
      return { changes: 1, lastInsertRowId: 0 };
    },
    getFirstSync: () => ({ n: table.rows.length }),
    getAllSync: () => table.rows,
  }),
}));

describe('Settings "Clear chats and memories"', () => {
  beforeEach(() => {
    table.rows = [];
  });

  it('counts and deletes every "remember …" memory', () => {
    saveImportantMemory("my locker code is 42");
    saveImportantMemory("parking is on level 3");
    expect(countImportantMemories()).toBe(2);
    expect(clearImportantMemories()).toBe(2);
    expect(countImportantMemories()).toBe(0);
  });

  it("deletes every chat, not just the open one", () => {
    const store = useChatStore.getState();
    const first = store.createConversation("first");
    store.pushMessage({ id: "m1", role: "user", content: "hello", createdAt: Date.now() } as never, first);
    const second = useChatStore.getState().createConversation("second");
    useChatStore.getState().pushMessage({ id: "m2", role: "user", content: "hi", createdAt: Date.now() } as never, second);
    expect(useChatStore.getState().conversations.length).toBeGreaterThanOrEqual(2);

    useChatStore.getState().clearAllConversations();
    const after = useChatStore.getState();
    expect(after.conversations).toEqual([]);
    expect(after.messages).toEqual([]);
    expect(after.activeConversationId).toBeNull();
  });
});
