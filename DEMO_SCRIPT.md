# OfflineMate Demo Script (5-7 Minutes)

Use this as your talk track while screen sharing the app.

## 0) Pre-Demo Checklist (Do this before audience joins)

1. Phone connected and app installed (latest build).
2. Open app once and complete onboarding.
3. Ensure at least one model is downloaded (Lite or Standard).
4. Keep USB log terminal ready (optional):
   - `npm run android:logs`
5. Put phone in Do Not Disturb mode.
6. Start from app home/chat screen.

---

## 1) Opening (20-30 sec)

"This is OfflineMate, a privacy-first mobile assistant that runs on-device.  
It supports model tiers for low-end to flagship phones, local retrieval, and built-in tools like notes, calendar, contacts, and reminders."

---

## 2) Show Fast Chat Response (45 sec)

Type:

`What is RAG in simple words? Use 3 bullet points and make key terms **bold**.`

Say:

"Responses are generated locally, and markdown emphasis like **bold** is rendered in the UI."

Point out:

- Smooth response stream
- Clean final formatting
- Bold rendering for `**word**`

---

## 3) Show Tier Awareness (45 sec)

Go to `Settings` tab.

Say:

"OfflineMate supports Lite, Standard, and Full model tiers.  
This lets us run on weaker devices while still scaling quality on stronger devices."

Switch tier (if safe for your demo device) and return to chat.

---

## 4) Show Notes + Retrieval Context (1.5 min)

Go to `Notes` tab and create:

- "Project Alpha launch is next Tuesday at 10 AM."
- "Client prefers offline-first AI with no cloud sync."

Return to chat and ask:

`What do you remember about Project Alpha and client preferences?`

Say:

"This uses local retrieval and memory from on-device data, no server round-trip."

---

## 5) Show Tool-Oriented Request (1 min)

Prompt:

`Create a reminder for tomorrow at 9 AM to review launch checklist.`

Then:

`Summarize what action you just took in one sentence.`

Say:

"The assistant can route requests to device tools through a deterministic execution flow."

---

## 6) Show Voice Entry (45 sec)

Tap microphone and say:

"Give me a short daily plan for deep work and meetings."

Say:

"Voice input is handled on-device, then fed into the same local assistant pipeline."

---

## 7) Close (20-30 sec)

"In short: OfflineMate delivers private, on-device AI with practical mobile tooling, adaptive model tiers, and a production-ready Android build path."

---

## Backup Prompts (If One Step Fails)

- `Summarize the benefits of offline AI in 4 points.`
- `Convert this into an action checklist: prepare demo, test mic, verify model tier.`
- `Explain Lite vs Standard model tiers in plain language.`

---

## Optional 15-Second Technical Pitch

"Under the hood, OfflineMate uses Expo/React Native, on-device model inference, local vector retrieval, and a tier fallback strategy for reliability across devices."

