import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useChatStore } from "@/stores/chat-store";

type Props = {
  onNewChat: () => void;
};

/** Conversation list shown beside the chat on wide screens (the phone uses the separate Chats screen). */
export function ChatListPane({ onNewChat }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);

  const sorted = useMemo(
    () => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [conversations],
  );

  const confirmDelete = (conversationId: string) => {
    Alert.alert("Delete conversation", "Delete this chat permanently?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteConversation(conversationId) },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <Pressable style={styles.newBtn} onPress={onNewChat}>
          <Text style={styles.newBtnText}>+ New chat</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {sorted.length === 0 ? (
          <Text style={styles.empty}>No chats yet. Start one with + New chat.</Text>
        ) : (
          sorted.map((conversation) => {
            const active = conversation.id === activeConversationId;
            return (
              <Pressable
                key={conversation.id}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => selectConversation(conversation.id)}
                accessibilityState={{ selected: active }}
              >
                <View style={styles.rowMain}>
                  <Text style={[styles.rowTitle, active && styles.rowTitleActive]} numberOfLines={1}>
                    {conversation.title || "Untitled chat"}
                  </Text>
                  <Text style={styles.rowTime} numberOfLines={1}>
                    {new Date(conversation.updatedAt).toLocaleString()}
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel={`Delete chat ${conversation.title || "Untitled chat"}`}
                  hitSlop={8}
                  onPress={() => confirmDelete(conversation.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#9ca3af" />
                </Pressable>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 12, paddingTop: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: { color: "#e5e7eb", fontSize: 18, fontWeight: "800" },
  newBtn: { backgroundColor: "#1d4ed8", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  newBtnText: { color: "#e5e7eb", fontWeight: "700", fontSize: 12 },
  list: { gap: 8, paddingBottom: 24 },
  empty: { color: "#9ca3af", fontSize: 13 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "#1f2937",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowActive: { borderColor: "#60a5fa", backgroundColor: "#0f1b33" },
  rowMain: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { color: "#e5e7eb", fontSize: 14, fontWeight: "700" },
  rowTitleActive: { color: "#bfdbfe" },
  rowTime: { color: "#9ca3af", fontSize: 11 },
});
