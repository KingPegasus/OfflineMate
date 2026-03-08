import { useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { createNote, listNotes } from "@/db/notes-repository";

export default function NotesScreen() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [, setRefreshKey] = useState(0);
  const notes = listNotes(20);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Notes</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor="#6b7280"
          style={styles.input}
        />
        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Write note..."
          placeholderTextColor="#6b7280"
          style={[styles.input, styles.multiline]}
          multiline
        />
        <Text
          style={styles.save}
          onPress={() => {
            if (!title.trim() || !content.trim()) return;
            createNote(title.trim(), content.trim());
            setTitle("");
            setContent("");
            setRefreshKey((k) => k + 1);
          }}
        >
          Save Note
        </Text>
      </View>
      <ScrollView style={styles.list}>
        {notes.map((note) => (
          <View key={note.id} style={styles.note}>
            <Text style={styles.noteTitle}>{note.title}</Text>
            <Text style={styles.body}>{note.content}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1020", padding: 16 },
  card: { backgroundColor: "#111827", borderRadius: 14, padding: 16, marginBottom: 12 },
  title: { color: "#e5e7eb", fontSize: 18, fontWeight: "700", marginBottom: 8 },
  input: {
    backgroundColor: "#0b1020",
    color: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  save: { color: "#60a5fa", fontWeight: "700" },
  list: { flex: 1 },
  note: { backgroundColor: "#111827", borderRadius: 10, padding: 12, marginBottom: 8 },
  noteTitle: { color: "#e5e7eb", fontWeight: "700", marginBottom: 4 },
  body: { color: "#9ca3af" },
});

