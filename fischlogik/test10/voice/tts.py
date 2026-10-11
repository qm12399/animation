# German placeholder voice via edge-tts, with word timings
import asyncio, json, os, sys, certifi, edge_tts
certifi.where = lambda: "/root/.ccr/ca-bundle.crt"  # agent proxy CA
PROXY = os.environ.get("HTTPS_PROXY")
LINES = [
  "Hör auf, in die Mitte des Teichs zu werfen.",
  "Im Sommer fehlt dort unten der Sauerstoff.",
  "Die Fische stehen am Rand. Direkt vor deinen Füßen.",
]
async def one(i, text, out):
    c = edge_tts.Communicate(text, "de-DE-ConradNeural", rate="+6%", boundary="WordBoundary", proxy=PROXY)
    words, audio = [], bytearray()
    async for ch in c.stream():
        if ch["type"] == "audio": audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            words.append({"w": ch["text"], "t0": ch["offset"]/1e7, "t1": (ch["offset"]+ch["duration"])/1e7})
    open(f"{out}/l{i}.mp3", "wb").write(audio)
    return {"id": f"l{i}", "text": text, "words": words}
async def main(out):
    res = [await one(i, t, out) for i, t in enumerate(LINES)]
    json.dump(res, open(f"{out}/words.json", "w"), ensure_ascii=False, indent=1)
asyncio.run(main(sys.argv[1]))
