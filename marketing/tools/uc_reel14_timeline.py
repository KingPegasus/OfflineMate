"""Timeline for the 0.14.0 Instagram Reels / TikTok short (video/usecases/reel-0-14.json).

usage: python uc_reel14_timeline.py
About 24 s, vertical, music only (128 bpm "beat" style from uc_audio.py), captions carry everything for sound-off
viewing. It opens on the product doing its thing (a photo question) rather than a title, then two more photo
questions and two quick tools, then three short claims and the end card.

No white flashes and no beat "pops": an earlier flashy cut strobed on every cut, which was hard on the eyes and
breaks the 3-flashes-a-second guidance for photosensitive viewers (WCAG 2.3). Cuts are plain; the music carries
the energy.

Clips were recorded with the 0.14.0 release build on the phone emulator (Balanced, LFM 2.5 VL 1.6B, airplane
mode on). raw/uc14/<clip>.events holds marks in seconds from the script's start; the video runs OFFSET ahead.
Typing plays at 2x; the model's wait (about a minute for a photo on the emulator) is cut, which the end card says.
"""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BPM = 128
B = 60 / BPM
OFFSET = 1.1  # video time = event mark + OFFSET (screenrecord starts before the marks)

# clip: picked, type, typed, send, done (event marks; "picked" is None for text-only clips)
MARKS = {
    "p-menu": (3.64, 5.93, 7.05, 7.78, 71.08),
    "p-sign": (3.64, 5.93, 6.74, 7.45, 66.19),
    "p-fridge": (3.71, 6.03, 7.18, 7.90, 63.44),
    "t-remind": (None, 1.32, 3.11, 3.83, 25.10),
    "t-note": (None, 1.32, 3.61, 4.35, 20.77),
}
# clip, kicker, hook, prompt, answer (word for word from the screen), seconds of streaming to show before "done"
SCENES = [
    ("p-menu", "No internet", "It reads <em>your photos</em>", "Which drink is cheapest?",
     "The cheapest drink is the espresso, priced at $2.50.", 1.8),
    ("p-sign", "Travel", "Translate <em>any sign</em>", "Translate this sign",
     "The sign indicates directions for \"出口\" (exit), \"トイレ\" (toilet), and \"駅\" (station).", 1.8),
    ("p-fridge", "Food", "What's for <em>dinner?</em>", "What can I cook with this?",
     "You can make a sandwich with the bread and cheese.", 1.2),
    ("t-remind", "Reminders", "Sets <em>reminders</em>", "Remind me in 20 minutes to stretch",
     "Reminder set to go off in 20 minutes: stretch.", 0.0),
    ("t-note", "Notes", "Finds <em>your notes</em>", "What did I save about the dentist?",
     "Here's what your note says: Dentist appointment is Friday at 3pm. Bring the insurance card.", 0.4),
]


def v(x):
    return round(x + OFFSET, 3)


def build():
    clips, scenes, words = [], [], []
    t = 0.0
    drop = None
    for i, (clip, kicker, hook, prompt, answer, stream) in enumerate(SCENES):
        picked, typ, typed, send, done = MARKS[clip]
        src = f"raw/uc14/{clip}.mp4"
        t0 = t
        segs = []
        if picked is not None:
            segs.append((v(picked) - 0.3, v(picked) + 0.3, 1))   # the photo lands in the message box
        segs.append((v(typ) - 0.1, v(typed) + 0.25, 2))             # typing, at 2x
        segs.append((v(send) - 0.1, v(send) + 0.3, 1))              # Send, the question in the chat
        segs.append((v(done) - stream - 0.2, v(done) + 0.9, 1))     # cut past the wait: the answer finishing
        starts = []
        for a, b, speed in segs:
            starts.append(t)
            clips.append({"src": src, "from": round(a, 3), "to": round(b, 3), **({"speed": speed} if speed != 1 else {})})
            t += (b - a) / speed
        beats = math.ceil((t - t0) / B - 1e-6)
        clips[-1]["holdEnd"] = round(beats * B - (t - t0), 3)
        t = t0 + beats * B
        type_i = 1 if picked is not None else 0
        prompt_at = starts[type_i] + 0.05
        typing = (typed - typ) / 2
        answer_at = starts[type_i + 2] + 0.15
        if drop is None:
            drop = answer_at
        scenes.append({"t": [round(t0, 3), round(t, 3)], "num": f"{i + 1:02}", "kicker": kicker, "chip": "Airplane mode on",
                       "hook": hook, "promptAt": round(prompt_at, 3), "prompt": prompt,
                       "cps": round(len(prompt) / max(.35, typing), 1), "sentAt": round(starts[type_i + 1] + 0.1, 3),
                       "answerAt": round(answer_at, 3), "answer": answer})
    # Outro: three claims, two beats each, over the last answer (held), then the end card.
    last, lastdone = SCENES[-1][0], MARKS[SCENES[-1][0]][4]
    out = ["100%<br><em>on your phone</em>", "No<br>account", "Free &amp;<br>open source"]
    clips.append({"src": f"raw/uc14/{last}.mp4", "from": v(lastdone) + 0.9, "to": v(lastdone) + 0.95,
                  "holdEnd": round(len(out) * 2 * B - 0.05 + 3.0, 3)})
    for j, txt in enumerate(out):
        words.append({"t": [round(t, 3), round(t + 2 * B, 3)], "text": txt, "dim": .72, "from": 1.25, "rot": 0})
        t += 2 * B
    end = t
    tl = {"id": "reel-0-14", "style": "flashy", "duration": round(end + 3.0, 2), "screen": "raw/uc/reel-0-14-screen.mp4",
          "screenStart": 0, "phone": {"in": 0}, "scenes": scenes, "words": words, "flashes": [], "pops": [],
          "progress": True, "end": round(end, 3), "vo": [], "clips": clips,
          "endNote": "Real answers, recorded in airplane mode. Waiting time cut.",
          "music": {"style": "beat", "bpm": BPM, "drop": round(drop, 3), "tail": 0.0}}
    path = ROOT / "video" / "usecases" / "reel-0-14.json"
    path.write_text(json.dumps(tl, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"reel-0-14 {tl['duration']:.1f}s, {len(scenes)} scenes")


if __name__ == "__main__":
    build()
