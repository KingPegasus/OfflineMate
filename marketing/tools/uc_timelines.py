"""Write the use-case video timelines (video/usecases/*.json) from cases.json and the cut points below.

usage: python uc_timelines.py
Cut points are seconds in each raw/uc/<id>-cfr.mp4 clip (the clip's .events file + 1.2 s screenrecord lead,
checked against frame strips). Clips play at real speed; only the idle wait while the model works is
shortened (the "Stop" button just sits there). Voiceover lengths come from video/vo-uc/ (run
`uc_audio.py vo` first, then again after this if lines changed).
"""
import json, pathlib, sys
import soundfile as sf

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from uc_audio import vo_path  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "video" / "usecases"
CASES = {c["id"]: c for c in json.loads((OUT / "cases.json").read_text(encoding="utf-8"))["cases"]}
ORDER = ["alarm", "note-add", "note-recall", "calendar", "contact", "tech"]

# T: typing starts, D: typing done, S: sent. segs: what plays after the send, [from, to, kind].
#   kind: wait (idle, already trimmed), reply (starts when the reply appears), result (another app/tab),
#   stream (model writing the answer).
CUTS = {
    "alarm": dict(T=3.31, D=4.74, S=5.59, segs=[(9.6, 11.3, "wait"), (11.3, 11.6, "result"), (12.85, 16.1, "result"), (16.1, 18.9, "reply")]),
    "note-add": dict(T=3.28, D=5.36, S=6.21, segs=[(9.6, 11.3, "wait"), (11.3, 14.6, "reply"), (19.9, 21.6, "result")]),
    "note-recall": dict(T=3.30, D=4.94, S=5.80, segs=[(6.4, 8.1, "wait"), (8.1, 12.0, "reply")]),
    "calendar": dict(T=3.30, D=4.58, S=5.43, segs=[(8.3, 10.0, "wait"), (10.0, 13.8, "reply")]),
    "contact": dict(T=3.32, D=4.11, S=4.96, segs=[(7.2, 8.9, "wait"), (8.9, 12.6, "reply")]),
    "tech": dict(T=3.31, D=4.99, S=5.83, segs=[(6.43, 14.6, "stream")]),
    # Recorded online (weather needs the internet): a short only, not in the airplane-mode compilation.
    "weather": dict(T=3.32, D=5.05, S=5.93, segs=[(8.9, 10.6, "wait"), (10.6, 14.6, "reply")]),
}
REPLY_SHOWS = 0.15      # after a reply segment starts
STREAM_ANSWER = 1.6     # into a stream: enough of the first sentence is on screen
END_CARD = 3.4


def vo_len(text):
    return sf.info(vo_path(text)).duration


def case_block(cid, t0, hold, num=None):
    """Clips, scene and voiceover for one use case starting at t0. Returns (clips, scene, vo, end_time)."""
    c, k = CASES[cid], CUTS[cid]
    src = f"raw/uc/{cid}.mp4"
    clips = [{"src": src, "from": round(k["T"] - 0.5, 2), "to": round(k["S"] + 0.6, 2), "hold": hold}]
    t = t0 + hold + (k["S"] + 0.6 - (k["T"] - 0.5))
    prompt_at = t0 + hold + 0.5
    cps = len(c["prompt"]) / max(0.4, k["D"] - k["T"])
    answer_at = after_at = None
    for a, b, kind in k["segs"]:
        clips.append({"src": src, "from": a, "to": b})
        if kind == "reply" and answer_at is None: answer_at = t + REPLY_SHOWS
        if kind == "stream" and answer_at is None: answer_at = t + STREAM_ANSWER
        if kind == "result" and after_at is None: after_at = t + 0.1
        t += b - a
    if cid == "tech":
        after_at = t - 1.6           # once the answer has finished streaming
    scene = {"num": num, "kicker": c["kicker"], "chip": c.get("chip"), "online": c.get("online", False),
             "hook": c["hook"], "promptAt": round(prompt_at, 2), "prompt": c["prompt"], "cps": round(cps, 1),
             "answerAt": round(answer_at, 2), "answer": c["answer"]}
    if c.get("after"):
        scene["after"] = {**c["after"], "at": round(after_at, 2)}
    vo = [{"at": round(t0 + 0.25, 2), "text": c["vo"][0]}]
    second = (after_at if (c.get("after") and after_at < answer_at) else answer_at) + 0.25
    vo.append({"at": round(second, 2), "text": c["vo"][1]})
    end = max(t, second + vo_len(c["vo"][1]) + 0.5)
    if end > t:
        clips[-1]["holdEnd"] = round(end - t, 2)
    scene["t"] = [round(t0, 2), round(end, 2)]
    return clips, scene, vo, end


def write(name, tl):
    (OUT / f"{name}.json").write_text(json.dumps(tl, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{name:12} {tl['duration']:5.1f}s")


def short(cid):
    clips, scene, vo, end = case_block(cid, 0.0, 2.4)
    cta = "Get OfflineMate free on Google Play."
    vo.append({"at": round(end + 0.45, 2), "text": cta})
    write(cid, {"id": cid, "style": "calm", "duration": round(end + END_CARD, 2), "screen": f"raw/uc/{cid}-screen.mp4",
                "screenStart": 0, "phone": {"in": 0}, "scenes": [scene], "end": round(end, 2), "vo": vo,
                "clips": clips, "music": {"style": "calm", "bpm": 100}})


def compilation():
    intro = "Here are real things you can ask OfflineMate, the A.I. assistant that runs on your phone."
    title_end = round(0.35 + vo_len(intro) + 0.25, 2)
    t, clips, scenes, vo = title_end, [], [], [{"at": 0.35, "text": intro}]
    for i, cid in enumerate(ORDER, 1):
        c, s, v, t = case_block(cid, t, 2.4, f"{i:02}")
        clips += c; scenes.append(s); vo += v
        t += 0.2
        clips[-1]["holdEnd"] = round(clips[-1].get("holdEnd", 0) + 0.2, 2)
    outro = "Everything you just saw was recorded in airplane mode."
    o_end = t + vo_len(outro) + 0.8
    scenes.append({"t": [round(t, 2), round(o_end, 2)], "kicker": "Offline", "chip": "No internet at all",
                   "hook": "Recorded in <em>airplane mode</em>"})
    vo.append({"at": round(t + 0.3, 2), "text": outro})
    clips[-1]["holdEnd"] = round(clips[-1].get("holdEnd", 0) + (o_end - t), 2)
    end_line = "OfflineMate. Private A.I. that works offline. Get it free on Google Play."
    vo.append({"at": round(o_end + 0.5, 2), "text": end_line})
    duration = o_end + 0.5 + vo_len(end_line) + 1.0
    write("compilation", {"id": "compilation", "style": "calm", "duration": round(duration, 2),
                          "screen": "raw/uc/compilation-screen.mp4", "screenStart": title_end,
                          "phone": {"in": title_end - 0.3},
                          "title": {"t": [0, title_end], "kicker": "Real use cases",
                                    "head": "Things you can ask <em>OfflineMate</em>",
                                    "sub": "Six real requests, recorded at real speed, with airplane mode on."},
                          "scenes": scenes, "end": round(o_end, 2), "vo": vo, "clips": clips,
                          "music": {"style": "calm", "bpm": 100}})


def reel():
    """Flashy cut: 124 bpm, a cut every beat or two, big words, white flashes."""
    B = 60 / 124
    clips, scenes, words, flashes = [], [], [], []
    t = 0.0
    def seg(src, a, dur, hold_first=0.0):
        clips.append({"src": f"raw/uc/{src}.mp4", "from": a, "to": round(a + dur - hold_first, 3), **({"hold": hold_first} if hold_first else {})})
    # Hook: two big words over the empty chat.
    seg("contact", 2.9, 5 * B, hold_first=5 * B - 0.3)
    words += [{"t": [0.0, 3 * B], "text": "No<br>internet?", "dim": 0.55, "from": 1.8, "rot": -4},
              {"t": [3 * B, 5 * B], "text": "No<br><span class=pink>problem.</span>", "dim": 0.55, "from": 1.8, "rot": 3}]
    flashes += [0.0, 3 * B]
    t = 5 * B
    # Four rapid results, one and a half beats each.
    quick = [("alarm", 13.55, "Alarms", "6:30 alarm, <em>set</em>"), ("note-add", 19.95, "Notes", "Note <em>saved</em>"),
             ("calendar", 10.05, "Calendar", "Tomorrow, <em>read</em>"), ("contact", 8.95, "Contacts", "Number, <em>found</em>")]
    for i, (cid, a, word, head) in enumerate(quick):
        d = 1.5 * B
        seg(cid, a, d)
        words.append({"t": [round(t, 3), round(t + 0.42, 3)], "text": word, "dim": 0.35, "from": 1.5})
        scenes.append({"t": [round(t, 3), round(t + d, 3)], "num": f"{i + 1:02}", "kicker": word, "hook": head})
        flashes.append(round(t, 3)); t += d
    # Ask anything: the model writing at real speed.
    words.append({"t": [round(t, 3), round(t + 2 * B, 3)], "text": "Ask<br><em>anything</em>", "dim": 0.5, "from": 1.7, "rot": -3})
    flashes.append(round(t, 3))
    seg("tech", 6.3, 2 * B + 4.0, hold_first=2 * B)
    scenes.append({"t": [round(t + 2 * B, 3), round(t + 2 * B + 4.0, 3)], "num": "05", "kicker": "Ask anything",
                   "hook": "What is <em>RAG?</em>", "chip": "Airplane mode on"})
    t += 2 * B + 4.0
    # Claims on the beat over the recall answer, then the end card.
    seg("note-recall", 9.0, 6 * B)
    for j, (n, txt) in enumerate([(2, "100%<br><em>on-device</em>"), (1, "No<br>cloud"), (1, "No<br>account"), (2, "Private<br><em>AI</em>")]):
        words.append({"t": [round(t, 3), round(t + n * B, 3)], "text": txt, "dim": 0.6, "from": 1.6, "rot": (-3, 3)[j % 2]})
        flashes.append(round(t, 3)); t += n * B
    end = t
    vo = [{"at": 0.12, "text": "No internet? No problem."},
          {"at": round(5 * B + 0.1, 2), "text": "Alarms. Notes. Your calendar. Contacts."},
          {"at": round(5 * B + 6 * B + 0.15, 2), "text": "Ask anything."},
          {"at": round(end - 6 * B + 0.1, 2), "text": "All on your phone. OfflineMate."},
          {"at": round(end + 0.6, 2), "text": "Get OfflineMate free on Google Play."}]
    pops = [round(i * B, 3) for i in range(int(end / B))]
    write("reel", {"id": "reel", "style": "flashy", "duration": round(end + 3.2, 2), "screen": "raw/uc/reel-screen.mp4",
                   "screenStart": 0, "phone": {"in": 0}, "scenes": scenes, "words": words, "flashes": flashes,
                   "pops": pops, "risers": [round(5 * B, 3), round(end, 3)], "progress": True, "end": round(end, 2),
                   "vo": vo, "clips": clips, "music": {"style": "flashy", "bpm": 124}})


if __name__ == "__main__":
    for cid in ORDER + ["weather"]: short(cid)
    compilation()
    reel()
