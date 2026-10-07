from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from typing import Annotated, Optional, Dict, List
from datetime import datetime, timezone, timedelta
from pathlib import Path
import math
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


OVERPASS_URLS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]


def haversine_m(lat1, lng1, lat2, lng2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


async def overpass(lat: float, lng: float, radius: int):
    q = (
        f'[out:json][timeout:20];('
        f'node["amenity"="place_of_worship"]["religion"="muslim"](around:{radius},{lat},{lng});'
        f'way["amenity"="place_of_worship"]["religion"="muslim"](around:{radius},{lat},{lng});'
        f'relation["amenity"="place_of_worship"]["religion"="muslim"](around:{radius},{lat},{lng});'
        f');out center tags 200;'
    )
    async with httpx.AsyncClient(timeout=25, headers={"User-Agent": "Tidhkar/1.0 (prayer app)"}) as http:
        for url in OVERPASS_URLS:
            try:
                r = await http.post(url, data={"data": q})
                if r.status_code == 200:
                    return r.json().get("elements", [])
                logger.warning("overpass %s -> %s", url, r.status_code)
            except Exception as e:
                logger.warning("overpass %s failed: %s", url, e)
    raise HTTPException(502, "تعذر البحث عن المساجد حاليًا")


class MosqueCache(BaseDocument):
    key: str
    items: List[dict]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


@api_router.get("/mosques")
async def mosques(lat: float = Query(..., ge=-90, le=90), lng: float = Query(..., ge=-180, le=180)):
    key = f"{round(lat, 3)}:{round(lng, 3)}"
    doc = await db.mosque_cache.find_one({"key": key})
    if doc:
        cached = MosqueCache.from_mongo(doc)
        if datetime.fromisoformat(cached.created_at) > datetime.now(timezone.utc) - timedelta(days=3):
            return {"items": cached.items, "source": "OpenStreetMap"}
    items = []
    for radius in (2000, 5000, 15000):
        elements = await overpass(lat, lng, radius)
        items = []
        seen = set()
        for el in elements:
            plat = el.get("lat") or (el.get("center") or {}).get("lat")
            plng = el.get("lon") or (el.get("center") or {}).get("lon")
            if plat is None or plng is None:
                continue
            tags = el.get("tags", {})
            oid = f"{el['type']}-{el['id']}"
            if oid in seen:
                continue
            seen.add(oid)
            items.append({
                "id": oid,
                "name": tags.get("name:ar") or tags.get("name") or "مسجد",
                "lat": plat,
                "lng": plng,
                "distance_m": round(haversine_m(lat, lng, plat, plng)),
            })
        if len(items) >= 5:
            break
    items.sort(key=lambda x: x["distance_m"])
    items = items[:30]
    await db.mosque_cache.update_one(
        {"key": key}, {"$set": MosqueCache(key=key, items=items).to_mongo()}, upsert=True
    )
    return {"items": items, "source": "OpenStreetMap"}


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
