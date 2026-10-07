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
    "Speak in clear, classical Arabic (Fusha) with correct tashkeel pronunciation. "
    "Calm, reverent, warm and spiritual delivery, slow measured pace, like a gentle mosque reciter."
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
