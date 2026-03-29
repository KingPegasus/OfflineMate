# OfflineMate Privacy Policy

**Effective date:** March 29, 2026  

**Applies to:** the OfflineMate mobile application for **Android** (package identifier `com.offlinemate.app`), distributed by the project maintainers (“we”, “us”). **An iOS build is not offered today**; if one is released later, this policy will be updated to cover it.

This policy describes how the app handles information. It is intended for end users and for transparency in this repository. **It is not legal advice.** If you distribute the app under your own brand, replace contact details and review this text with qualified counsel.

---

## Summary

- OfflineMate is built for **local-first** use: conversation, retrieval, and on-device language models run **on your device** where that architecture applies.
- The app may use **the network** for **downloading AI models and related assets**, and (when you use features that require it) for **optional web search** and similar tools. Those flows can send requests to **third-party services** you do not control.
- We do **not** operate a dedicated “OfflineMate cloud” for storing your chats in the version described by this repository; **data stays on your device** except as noted below (network requests you trigger, OS and framework behavior, and third-party infrastructure).

---

## Information the app processes on your device

Depending on how you use OfflineMate, the app may process:

- **Messages and assistant context** used to generate responses (including content you type or dictate).
- **Voice audio** when you use speech features (processed for speech-to-text on device per the app’s implementation).
- **Calendar and reminders data** when you grant permission and use scheduling-related features.
- **Contacts** when you grant permission and use contact-related features.
- **Notes or documents** you choose to index for retrieval (RAG) features, and **derived data** such as embeddings or index entries stored locally.
- **Files and model weights** downloaded for on-device models (stored in app storage).

This processing is performed **on the device** to provide the assistant. **Uninstalling the app** removes app-specific data subject to your operating system’s rules (some residual data may remain until the OS reclaims storage).

---

## Network and third parties

When the device is online, parts of the app may contact:

- **Model and asset hosts** (for example, CDNs or repositories used to download quantized models, tokenizers, or speech-related assets). Those servers may receive **standard technical metadata** typical of HTTPS requests (such as IP address, user agent, and timing). The exact endpoints depend on the build and configuration in source (see `src/ai/model-manager.ts`, `src/ai/model-registry.ts`, and related code).
- **Web search providers** when a web search tool is used (for example, DuckDuckGo-related endpoints in `src/tools/providers/duckduckgo-provider.ts`). **Search queries** you trigger can be sent to that provider under **their** policies.

We do not control third-party services. Review their privacy policies if you need detail beyond what this document states.

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
- **Data on device:** Clear app data or uninstall to remove locally stored app content (subject to OS behavior).
- **Web search:** Avoid features that perform web search if you do not want queries sent to a search provider.

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
