/** What a listening session exposes; `modelMissing` marks the stub made when no voice model was on disk. */
export interface ListeningSession {
  start: () => Promise<void>;
  stop: () => Promise<string>;
  release: () => Promise<void>;
  modelMissing?: boolean;
}

/**
 * The session to use for a mic press. A session pre-warmed before the voice model was downloaded is
 * only a "model missing" stub, and onboarding or Settings may have downloaded the model since (Chat
 * can open while onboarding is still downloading). So a stub is replaced by a fresh session, which
 * looks for the model again; if it's still missing, the new stub says so and the mic offers the download.
 */
export async function sessionForPress(
  current: Promise<ListeningSession> | null,
  create: () => Promise<ListeningSession>,
): Promise<ListeningSession> {
  if (!current) return create();
  const handle = await current;
  return handle.modelMissing ? create() : handle;
}
