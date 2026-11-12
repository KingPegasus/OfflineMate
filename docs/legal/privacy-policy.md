# OfflineMate Privacy Policy

**Effective date:** November 12, 2026 (app version 0.11.0)  

**Applies to:** the OfflineMate mobile application for **Android** (package identifier `com.offlinemate.app`), distributed by the project maintainers (“we”, “us”). The source code also builds for iOS, but **no iOS version is distributed yet**; if one is released, this policy covers it in the same way.

This policy describes how the app handles information. It is intended for end users and for transparency in this repository. **It is not legal advice.** If you distribute the app under your own brand, replace contact details and review this text with qualified counsel.

---

## Summary

- OfflineMate is built for **local-first** use: conversation, retrieval, and on-device language models run **on your device** where that architecture applies.
- The app uses **the network** to **download AI models** and, for two optional features, **web search** and **weather**. Those features send your search query or the place you ask about to **third-party services** (DuckDuckGo and Open-Meteo). They are **on by default** and one switch in Settings turns both off.
- We do **not** run servers that receive or store your data. There is no account. **Your chats, notes, contacts, calendar and voice stay on your device**, except the search queries and place names described below.
- We do **not** sell your data, show ads, or build profiles about you.

---

## Information the app processes on your device

Depending on how you use OfflineMate, the app may process:

- **Messages and assistant context** used to generate responses (including content you type or dictate).
- **Voice audio** when you use speech features (processed for speech-to-text on device per the app’s implementation).
- **Calendar and reminders data** when you grant permission and use scheduling-related features.
- **Contacts** when you grant permission and use contact-related features.
- **Notes or documents** you choose to index for retrieval (RAG) features, and **derived data** such as embeddings or index entries stored locally.
- **Files and model weights** downloaded for on-device models (stored in app storage).

This processing is performed **on the device** to provide the assistant. Voice is turned into text on the device; recordings are not sent anywhere. Contacts, calendar entries and notes are read and stored only on the device. **Chat history** is not kept unless you turn on “Persist chat history” in Settings (off by default); when on, it is stored only on the device.

**Uninstalling the app** removes app-specific data subject to your operating system’s rules (some residual data may remain until the OS reclaims storage).

---

## Network and third parties

When the device is online, the app contacts these services. All connections use HTTPS (encrypted in transit).

- **Model downloads (Hugging Face).** Setup and the model picker download AI models, tokenizers and speech models from Hugging Face (`src/ai/model-manager.ts`, `src/ai/model-registry.ts`). No personal content is sent; like any download, the host receives standard technical data such as your IP address, user agent and request time.
- **Web search (DuckDuckGo).** When a message asks to search or for current information (for example “search for…”, “look up…”, “latest news on…”, “what’s the current…”, “is it true that…”), the app sends a search query to DuckDuckGo (`src/tools/providers/duckduckgo-provider.ts`). **The query can be the whole message you typed.** DuckDuckGo also receives your IP address.
- **Weather (Open-Meteo).** When you ask about the weather, the app sends **only the place name** you asked about to Open-Meteo’s geocoding service to find it, then that place’s coordinates to its forecast service (`src/tools/weather.ts`). The app **never reads your device’s location**, but the place you ask about may be where you are, so it can reveal your **approximate location**. Open-Meteo also receives your IP address.
- **Ratings (Google Play).** After a few good replies the app may show Google Play’s rating prompt. Google runs that prompt; the app does not see whether or how you rated it.
- **Text-to-speech.** Spoken replies (off by default) use your phone’s built-in voices. Depending on your device and voice settings, the voice provider may process the text online under its own policy.

**What happens to search queries and place names:** the app sends them only to answer that request, uses the result to write the reply, and does not store them anywhere off your device. They go only to the provider named above, only to provide the feature you asked for, never for advertising or profiling. The reply (and your message) stay in chat on your device as described above.

**Web search and weather are on by default.** Turn off **Settings → “Web search and weather”** in OfflineMate to keep every request on the device; then nothing is sent to DuckDuckGo or Open-Meteo.

These providers handle requests under their own policies: [DuckDuckGo privacy policy](https://duckduckgo.com/privacy), [Open-Meteo terms and privacy](https://open-meteo.com/en/terms), [Hugging Face privacy policy](https://huggingface.co/privacy). We do not control them.

---

## Permissions

The app requests OS permissions only for stated features (see `app.json` and in-app prompts), including where applicable:

- **Microphone** — voice input.
- **Calendar / reminders** — scheduling assistance.
- **Contacts** — contact lookup when you use related commands.
- **Notifications** — local reminders and alerts.

You can refuse permissions; features that depend on them may not work.

---

## Analytics and crash reporting

The application source in this repository is **not** wired to a first-party analytics product (such as custom event tracking to our servers). Dependencies (Expo, React Native, Google Play, Apple, device vendors) may still collect **diagnostics or usage data** according to **their** policies and your device settings.

If you add analytics or crash reporting in a fork or product build, update this policy and your store disclosures accordingly.

---

## Children’s privacy

OfflineMate is **not directed at children under 13** (or the minimum age required in your jurisdiction). Do not use the app if you are under that age without parental consent where required.

---

## Your choices

- **Permissions:** Grant or revoke in system settings.
- **Web search and weather:** Turn off **“Web search and weather”** in OfflineMate’s Settings tab (it is on by default). Nothing is then sent to DuckDuckGo or Open-Meteo.
- **Chat history and spoken replies:** Both are off by default; turn them on or off in Settings.
- **Data on device:** Clear app data or uninstall to remove locally stored app content (subject to OS behavior).

---

## Data retention and deletion

We do not keep any of your data: there is no account and no OfflineMate server. Everything the app stores is on your device, and you delete it by clearing the app’s data or uninstalling it. Data sent to DuckDuckGo, Open-Meteo or Hugging Face is handled under their policies, linked above.

---

## Store disclosures

Google Play’s Data safety section for OfflineMate lists **in-app search history** (web search queries and weather place names) and **approximate location** (weather place names) as collected and shared with those providers **for app functionality only**, **optional** (the Settings switch), and **processed ephemerally** (not stored by us). If the app’s behavior changes, this policy and those disclosures are updated together.

Regional laws (for example GDPR, UK GDPR, CCPA/CPRA) may give you additional rights. Contact us using the details below for privacy requests related to **our** distribution of the app. We cannot control data held purely on your device or by independent third parties.

---

## Changes to this policy

We may update this policy from time to time. The **effective date** at the top will change when we do. Material changes should also be reflected in app store listings where required.

---

## Contact

For privacy questions about **OfflineMate** as distributed by the maintainers:

- Website: [offlinemate.com](https://offlinemate.com)  
- E-mail: `rks143@gmail.com` 

For **errors or suggestions about this markdown document** in the public repository, you may open a GitHub issue; that channel is **not** a substitute for legal or data-protection requests.

---

## Open source and third-party software

This app includes **third-party libraries** (see `package.json` and lockfiles). Those components have their own licenses and may process data as described in their documentation. See also [LICENSE.md](../../LICENSE.md) for terms governing **this repository’s** source code.
