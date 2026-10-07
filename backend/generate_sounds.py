"""One-time script: generate Arabic dhikr audio and bundle into the Expo app assets."""
import asyncio
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

from tts_service import ADHKAR, generate_dhikr_audio  # noqa: E402

OUT = ROOT.parent / "frontend" / "assets" / "sounds"


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for key in ADHKAR:
        data = await generate_dhikr_audio(key)
        (OUT / f"{key}.wav").write_bytes(data)
        print(key, len(data))


asyncio.run(main())
