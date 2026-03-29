# Intent routing (`direct` | `context` | `tool`)

`routeIntent()` in `src/ai/intent-router.ts` is a **cheap keyword gate** before chat runs. It is not semantic understanding; it only decides which *path* to take.

| Intent | Effect (high level) |
|--------|----------------------|
| **direct** | Plain LLM reply — no RAG, no tool runner. |
| **context** | Injects retrieved snippets from local memory / notes / meetings. |
| **tool** | Planner, agentic search (when applicable), alarms, calendar, contacts, notes, web search. |

**Order:** `tool` is checked before `context` (e.g. “remind me about the meeting” → tool, not context).

---

## Design principles

1. **Prefer multi-word phrases** over single tokens so coding and general chat do not false-trigger tools. Phrase matches require a **token boundary on the left** (the character before the match must not be `a-z`/`0-9`), so `text ` does not fire inside `context ` and `phone ` not inside `smartphone `. Single-word keywords use `\b…\b` word boundaries.  
   - *Bad:* `call` matches “recursive **call** in Java”.  
   - *Better:* `call ` (call followed by space) matches “**call** mom” but not “callback”.

2. **Do not treat bare definitional questions as web search.** The on-device model can answer “What is an LLM?”, “Who was Shakespeare?”, “Why is the sky blue?”.  
   - Users who want the web can say **“search for …”**, **“look up …”**, **“check online …”**, or time-sensitive phrases like **“what is the current …”**.

3. **Avoid ultra-broad chat phrases** as tool triggers.  
   - *Removed:* `tell me about` (matches “tell me about your weekend”).  
   - *Removed:* bare `find out` (kept `find out online`).

4. **Calendar / notes / contacts** use **action-ish or “my …” phrases**, not bare `event`, `calendar`, `schedule`, `note`, `contact`, `message` (those appear in normal prose and code).

---

## Keyword groups (rationale + examples)

### Reminders & alarms — **keep**
- **Examples:** “set reminder…”, “remind me in 5 minutes”, “set alarm for 7”.
- **Relative time helper:** `wantsReminderRelativeTimeIntent()` — “**remind me in** 1 minute…”, “**find me in** 1 minute…” (common STT error for “remind me”), “ping me in…”, “notify me in…”, “set a timer in…”.
- **Rationale:** Strong product signals; low false positives.

### Calendar — **phrases only**
- **Keep / add:** `add event`, `create event`, `schedule meeting`, `on my calendar`, `my calendar`, `my schedule`, `on my schedule`, `calendar today`, `what's on my`, `whats on my` (STT).
- **Removed:** bare `event`, `calendar`, `schedule`.
- **Why remove singles:** “That was a historic **event**”, “Gregorian **calendar**”, “train **schedule**” should stay **direct**.
- **Still routes to tool:** “What’s **on my calendar** tomorrow?”

### Contacts & messaging — **prefix / phrase + phone helper**
- **Use:** `text `, `phone `, `send a message`, `message me` / `message you` / …, `email `, `contact ` (avoid bare `message ` — it matched “error **message** is …”).
- **Phone calls:** `wantsPhoneCallIntent()` — `\bcall\s+[a-z0-9]` after lowercasing, but **not** when preceded by programming terms (`function call`, `recursive call`, `method call`, `callback`, `tail call`, `roll call`, etc.).
- **Examples:** “**call** Sarah”, “**text** me the link”, “**contact** support”.
- **Stays direct:** “recursive **call** in JavaScript”, “error **message**” (no `message ` substring).

### Notes — **phrases**
- **Use:** `add a note`, `take a note`, `save a note`, `write this down`, `remember this`, `find note`, `search note`.
- **Removed:** bare `note` (matches “musical **note**”, “please **note**”).

### Web search — **explicit or time-sensitive**
- **Explicit:** `search for`, `look up`, `check online`, `from the internet`, etc.
- **Time-sensitive / verify:** `what's the current`, `what is the current`, `latest news`, `fact check`, `today's weather`, `near me`, …
- **Removed:** bare `what is`, `who is`, `where is`, `when is`, `why is`, `tell me about`, bare `find out`.
- **Examples:**  
  - **direct:** “What is an LLM?”  
  - **tool:** “**What is the current** price of Bitcoin?”  
  - **tool:** “**Search for** who won the 2024 election.”

### Context keywords — **unchanged**
- `summarize`, `what did i`, `history`, `memory`, `notes`, `meeting` — steer toward RAG when the user is clearly referring to **their** saved content.

---

## Maintenance

When adding a keyword, ask:

1. Does it match **normal prose or code** unrelated to tools?  
2. Can the user rephrase with a **clearer explicit** phrase if we keep the intent narrow?  
3. Should this be **intent** at all, or only a **per-tool** keyword in `tool-registry`?  
   - Intent `tool` must still fire for the tool path to run; per-tool keywords only rank tools *after* intent is already `tool`.
