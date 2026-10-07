import os
from emergentintegrations.llm.openai import OpenAITextToSpeech

ADHKAR = {
    "salawat": {"text": "اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّد"},
    "tahlil": {"text": "لَا إِلَٰهَ إِلَّا اللَّه"},
    "tasbih": {"text": "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيم"},
    "hamd": {"text": "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِين"},
    "takbir": {"text": "اللَّهُ أَكْبَر، اللَّهُ أَكْبَر"},
    "istighfar": {"text": "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْه"},
    "adhan": {"text": "حَانَ الْآنَ مَوْعِدُ الصَّلَاة. اللَّهُ أَكْبَر، اللَّهُ أَكْبَر. حَيَّ عَلَى الصَّلَاة، حَيَّ عَلَى الْفَلَاح"},
}

INSTRUCTIONS = (
    "Voice: a native Saudi Arabian man from Makkah, like an imam of Al-Masjid Al-Haram. "
    "Accent: authentic Saudi (Hijazi/Najdi) Arabic pronunciation, never an English or foreign accent. "
    "Pronounce every Arabic letter correctly from its makhraj, with full tashkeel, deep heavy letters (ص ض ط ظ ق) "
    "and clear ع ح. Tone: calm, warm, humble and reverent, spiritual remembrance of Allah. "
    "Pacing: slow and measured with a gentle melodic flow, slight elongation on long vowels (madd)."
)


async def generate_dhikr_audio(dhikr_id: str) -> bytes:
    tts = OpenAITextToSpeech(api_key=os.environ["EMERGENT_LLM_KEY"])
    try:
        return await tts.generate_speech(
            text=ADHKAR[dhikr_id]["text"],
            model="gpt-4o-mini-tts",
            voice="onyx",
            instructions=INSTRUCTIONS,
            response_format="wav",
        )
    except Exception:
        return await tts.generate_speech(
            text=ADHKAR[dhikr_id]["text"], model="tts-1-hd", voice="onyx", response_format="wav"
        )
