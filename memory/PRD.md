# تذكار (Tidhkar) — PRD

## Original problem statement
اريد انشاء تطبيق عصري وحديث تذكير بالصلاه بخطوط اسلاميه مزخرفه ويصدر صوت مثلا كل نص ساعه تذكير صلي على محمد مع صوت بالعربي ومره ثاني بعدها تذكير لا اله الا الله ... تطبيق تذكاري فعال وشعارات حقيقيه وتصميم عصري

## User choices
- Arabic AI voice (OpenAI TTS gpt-4o-mini-tts, voice onyx) generated once, bundled as WAV in frontend/assets/sounds
- GPS prayer times (Aladhan, Umm al-Qura method) + adhan notifications
- Interval 15/30/60 (default 30)
- Adhkar: salawat, tahlil, tasbih, hamd, takbir, istighfar with toggles
- Modern, elegant design (dark emerald / antique gold, Amiri + Aref Ruqaa + Tajawal fonts)

## Architecture
- Backend FastAPI: /api/prayer-times (Aladhan proxy, Mongo cache), /api/adhkar, /api/audio/{id}.wav (TTS cache), generate_sounds.py one-time script
- Frontend Expo Router: (tabs) الرئيسية / الأذكار / الإعدادات; NativeTabs on iOS 26+
- Local notifications (expo-notifications DATE triggers, ≤60 scheduled, re-synced on app open), Android channel per dhikr with custom sound
- In-app playback via expo-audio; foreground notification → voice + toast; web fallback timer
- Settings persisted with @/src/utils/storage

## Implemented (2026-06)
- All above; tested backend 8/8 & frontend flows pass (iteration_1)

## Backlog
- P1: Tasbeeh counter, quiet hours (no reminders at night), choose calculation method
- P1: Real adhan recording option, Qibla direction
- P2: Morning/evening adhkar, widgets, sharing cards
