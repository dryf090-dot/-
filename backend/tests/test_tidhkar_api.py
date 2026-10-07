"""Backend API tests for Tidhkar prayer reminder app."""
import os
from datetime import datetime

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", os.environ.get("EXPO_BACKEND_URL", "")).rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL / EXPO_BACKEND_URL not set"


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Root ---
class TestRoot:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json().get("message") == "Tidhkar API"


# --- Prayer Times ---
class TestPrayerTimes:
    def _today(self):
        return datetime.utcnow().strftime("%d-%m-%Y")

    def test_prayer_times_ok(self, api):
        r = api.get(
            f"{BASE_URL}/api/prayer-times",
            params={"lat": 21.42, "lng": 39.82, "date": self._today()},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert set(["today", "tomorrow", "timezone"]).issubset(data.keys())
        for k in ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]:
            assert k in data["today"]["timings"], f"missing {k}"
            # time format HH:MM
            assert ":" in data["today"]["timings"][k]
        assert "هـ" in data["today"]["hijri"]
        assert data["today"]["date"] == self._today()

    def test_prayer_times_invalid_date_422(self, api):
        r = api.get(
            f"{BASE_URL}/api/prayer-times",
            params={"lat": 21.42, "lng": 39.82, "date": "2026-01-15"},
        )
        assert r.status_code == 422

    def test_prayer_times_invalid_lat(self, api):
        r = api.get(
            f"{BASE_URL}/api/prayer-times",
            params={"lat": 999, "lng": 39.82, "date": self._today()},
        )
        assert r.status_code == 422

    def test_prayer_times_cached(self, api):
        # second call should be fast (cached in mongo)
        import time
        t1 = time.time()
        r = api.get(
            f"{BASE_URL}/api/prayer-times",
            params={"lat": 21.42, "lng": 39.82, "date": self._today()},
            timeout=10,
        )
        elapsed = time.time() - t1
        assert r.status_code == 200
        assert elapsed < 5, f"cached call took {elapsed}s"


# --- Adhkar ---
EXPECTED_ADHKAR_IDS = {"salawat", "tahlil", "tasbih", "hamd", "takbir", "istighfar"}


class TestAdhkar:
    def test_list_adhkar(self, api):
        r = api.get(f"{BASE_URL}/api/adhkar")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = {d["id"] for d in data}
        assert EXPECTED_ADHKAR_IDS.issubset(ids), f"missing: {EXPECTED_ADHKAR_IDS - ids}"
        for d in data:
            assert "id" in d and "text" in d
            assert isinstance(d["text"], str) and len(d["text"]) > 0


# --- Audio ---
class TestAudio:
    def test_audio_unknown_404(self, api):
        r = api.get(f"{BASE_URL}/api/audio/nonexistent.wav")
        assert r.status_code == 404

    def test_audio_salawat_ok(self, api):
        # Allow longer timeout for TTS generation on first call
        r = api.get(f"{BASE_URL}/api/audio/salawat.wav", timeout=60)
        if r.status_code == 502:
            pytest.skip("TTS generation failed (likely API key / network); backend returns 502 as expected")
        assert r.status_code == 200, r.text[:200]
        ct = r.headers.get("content-type", "")
        assert "audio/wav" in ct or "audio/x-wav" in ct, f"bad content-type: {ct}"
        assert len(r.content) > 1000, "audio too small"
        # WAV magic header 'RIFF'
        assert r.content[:4] == b"RIFF", "not a valid WAV file"
