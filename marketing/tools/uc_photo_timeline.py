"""Timeline for the "Ask about a photo" YouTube Short (video/usecases/photo-short.json).

usage: python uc_photo_timeline.py
Music-only (no voiceover), 128 bpm "beat" style from uc_audio.py. Each scene is one real photo question recorded with
tools/uc-photo-record.sh on Standard (LFM 2.5 VL 1.6B), airplane mode on. Cut points come from
tools/uc_photo_detect.py (seconds in raw/uc/<clip>-cfr.mp4). The clip plays at real speed: the photo picked, the
prompt typed, Send tapped, then a cut past the model's wait to the answer streaming in, and a second cut to the
finished answer. Each scene is padded to a whole number of beats so the cuts and flashes land on the beat.
"""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
BPM = 128
B = 60 / BPM

# clip, picked, type, typed, send, stream, done  (uc_photo_detect.py output)
CUTS = {
    "p-diagram": (5.53, 8.23, 9.27, 12.45, 65.7, 73.2),
    "p-nutrition": (5.52, 8.22, 10.12, 13.20, 66.5, 68.3),
    "p-poster": (5.87, 8.58, 10.05, 13.18, 67.9, 79.9),
    "p-sign": (5.54, 8.23, 9.11, 12.26, 65.4, 68.4),
    "p-error": (5.52, 8.19, 10.56, 13.66, 66.7, 75.9),
    "p-fridge": (5.54, 8.23, 9.61, 12.71, 65.9, 66.7),
}
SCENES = [
    # clip, kicker, hook, prompt, answer (word for word from the screen; … marks an excerpt)
    ("p-diagram", "Study", "Exam <em>tomorrow?</em>", "Explain this diagram simply",
     "This diagram illustrates the water cycle, showing how water moves between the Earth's surface and atmosphere…"),
    ("p-nutrition", "Gym", "Post-workout <em>snack?</em>", "How much protein and sugar is in this?",
     "The nutrition label shows that this bar contains 20 grams of protein and 6 grams of sugar."),
    ("p-poster", "Weekend", "Going <em>out?</em>", "When and where is this event?",
     "…scheduled for Friday, March 14th at 7 PM. It will take place at Main Quad, North Campus."),
    ("p-sign", "Travel", "Lost in <em>Tokyo?</em>", "Translate this sign",
     "The sign indicates directions for \"出口\" (exit), \"トイレ\" (toilet), and \"駅\" (station)."),
    ("p-error", "Tech help", "Earbuds <em>won't pair?</em>", "What does this mean and how do I fix it?",
     "…you should ensure the device is turned on, charged, and in pairing mode."),
    ("p-fridge", "Food", "Nothing to <em>eat?</em>", "What can I cook with this?",
     "You can make a sandwich with the bread and cheese."),
]


def build():
    clips, scenes, words, flashes, pops = [], [], [], [], []
    first = SCENES[0][0]
    # Intro: 8 beats of kinetic words over the empty chat (the first frame of the first clip, held).
    intro = 8 * B
    # The empty chat, before the photo button is tapped (recording start + screenrecord lead).
    clips.append({"src": f"raw/uc/{first}.mp4", "from": 1.6, "to": 1.65, "hold": round(intro - 0.05, 3)})
    words += [{"t": [0, 2 * B], "text": "No<br>Wi-Fi?", "dim": .55, "from": 1.8, "rot": -4},
              {"t": [2 * B, 4 * B], "text": "No<br>data?", "dim": .55, "from": 1.8, "rot": 4},
              {"t": [4 * B, 8 * B], "text": "Ask your<br><span class=pink>photos.</span>", "dim": .55, "from": 1.6, "rot": -2}]
    flashes += [0, round(2 * B, 3), round(4 * B, 3)]
    t = intro
    for i, (clip, kicker, hook, prompt, answer) in enumerate(SCENES):
        picked, typ, typed, send, stream, done = CUTS[clip]
        src = f"raw/uc/{clip}.mp4"
        t0 = t
        segs = [(picked - 0.7, picked + 0.35),          # the grid, the tap, the photo lands in the box
                (typ - 0.1, typed + 0.35),              # typing
                (send - 0.15, send + 0.35),              # Send
                (stream - 0.1, stream + 0.8),           # cut past the wait: the answer starts
                (done - 0.1, done + 1.6)]               # cut to the finished answer
        starts = []
        for a, b in segs:
            starts.append(t)
            clips.append({"src": src, "from": round(a, 3), "to": round(b, 3)})
            t += b - a
        beats = math.ceil((t - t0) / B - 1e-6)
        pad = beats * B - (t - t0)
        clips[-1]["holdEnd"] = round(pad, 3)
        t = t0 + beats * B
        prompt_at = starts[1] + 0.1
        scenes.append({"t": [round(t0, 3), round(t, 3)], "num": f"{i + 1:02}", "kicker": kicker, "chip": "Airplane mode on",
                       "hook": hook, "promptAt": round(prompt_at, 3), "prompt": prompt,
                       "cps": round(len(prompt) / max(.5, typed - typ), 1), "sentAt": round(starts[2] + 0.2, 3),
                       "answerAt": round(starts[3] + 0.15, 3), "answer": answer})
        flashes += [round(t0, 3), round(starts[3], 3)]
        pops += [{"at": round(t0 + k * 2 * B, 3)} for k in range(beats // 2)]
    # Outro: claims on the beat over the last answer, then the end card.
    last = SCENES[-1][0]
    done = CUTS[last][5]
    out = [(2, "100%<br><em>on-device</em>"), (1, "No<br>cloud"), (1, "No<br>uploads"), (2, "Works<br><em>offline</em>")]
    total = sum(n for n, _ in out) * B
    clips.append({"src": f"raw/uc/{last}.mp4", "from": round(done + 1.6, 3), "to": round(done + 1.65, 3), "holdEnd": round(total - 0.05 + 3.0, 3)})
    for j, (n, txt) in enumerate(out):
        words.append({"t": [round(t, 3), round(t + n * B, 3)], "text": txt, "dim": .6, "from": 1.6, "rot": (-3, 3)[j % 2]})
        flashes.append(round(t, 3)); t += n * B
    end = t
    tl = {"id": "photo-short", "style": "flashy", "duration": round(end + 3.0, 2), "screen": "raw/uc/photo-short-screen.mp4",
          "screenStart": 0, "phone": {"in": 0}, "scenes": scenes, "words": words, "flashes": flashes, "pops": pops,
          "progress": True, "end": round(end, 3), "vo": [], "clips": clips,
          "endNote": "Real answers, recorded in airplane mode. Waiting time cut.",
          "music": {"style": "beat", "bpm": BPM, "drop": round(intro, 3), "tail": 0.0}}
    path = ROOT / "video" / "usecases" / "photo-short.json"
    path.write_text(json.dumps(tl, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"photo-short {tl['duration']:.1f}s, {len(scenes)} scenes")


if __name__ == "__main__":
    build()
