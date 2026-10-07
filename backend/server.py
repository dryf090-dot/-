from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from typing import Annotated, Optional, Dict
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os
import logging
import httpx
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from tts_service import ADHKAR, generate_dhikr_audio  # noqa: E402

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

AUDIO_DIR = ROOT_DIR / "audio_cache"
AUDIO_DIR.mkdir(exist_ok=True)

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data

    @classmethod
    def from_mongo(cls, doc: dict):
        return cls.model_validate(doc)


class PrayerCache(BaseDocument):
    key: str
    date: str
    timings: Dict[str, str]
    hijri: str
    timezone: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


PRAYER_KEYS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]


async def fetch_day(lat: float, lng: float, date: str, method: int) -> PrayerCache:
    key = f"{round(lat, 2)}:{round(lng, 2)}:{date}:{method}"
    doc = await db.prayer_cache.find_one({"key": key})
    if doc:
        return PrayerCache.from_mongo(doc)
    url = f"https://api.aladhan.com/v1/timings/{date}"
    async with httpx.AsyncClient(timeout=15) as http:
        r = await http.get(url, params={"latitude": lat, "longitude": lng, "method": method})
    if r.status_code != 200:
        logger.error("aladhan error %s %s", r.status_code, r.text[:200])
        raise HTTPException(502, "تعذر جلب مواقيت الصلاة")
    data = r.json()["data"]
    timings = {k: data["timings"][k].split(" ")[0] for k in PRAYER_KEYS}
    h = data["date"]["hijri"]
    hijri = f"{h['day']} {h['month']['ar']} {h['year']} هـ"
    item = PrayerCache(key=key, date=date, timings=timings, hijri=hijri, timezone=data["meta"]["timezone"])
    await db.prayer_cache.insert_one(item.to_mongo())
    return item


@api_router.get("/")
async def root():
    return {"message": "Tidhkar API"}


@api_router.get("/adhkar")
async def list_adhkar():
    return [{"id": k, "text": v["text"]} for k, v in ADHKAR.items()]


@api_router.get("/audio/{dhikr_id}.wav")
async def get_audio(dhikr_id: str):
    if dhikr_id not in ADHKAR:
        raise HTTPException(404, "not found")
    path = AUDIO_DIR / f"{dhikr_id}.wav"
    if not path.exists():
        try:
            path.write_bytes(await generate_dhikr_audio(dhikr_id))
        except Exception as e:
            logger.exception("tts failed: %s", e)
            raise HTTPException(502, "تعذر توليد الصوت")
    return FileResponse(path, media_type="audio/wav", headers={"Cache-Control": "public, max-age=31536000"})


@api_router.get("/prayer-times")
async def prayer_times(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    date: str = Query(..., pattern=r"^\d{2}-\d{2}-\d{4}$"),
    method: int = 4,
):
    today = datetime.strptime(date, "%d-%m-%Y")
    tomorrow = (today + timedelta(days=1)).strftime("%d-%m-%Y")
    d1 = await fetch_day(lat, lng, date, method)
    d2 = await fetch_day(lat, lng, tomorrow, method)
    return {
        "today": {"date": d1.date, "timings": d1.timings, "hijri": d1.hijri},
        "tomorrow": {"date": d2.date, "timings": d2.timings, "hijri": d2.hijri},
        "timezone": d1.timezone,
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
