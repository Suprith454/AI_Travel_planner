from fastapi import APIRouter, HTTPException
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()
UNSPLASH_KEY = os.getenv("UNSPLASH_ACCESS_KEY")


@router.get("/photos")
def get_photos(query: str):
    if not UNSPLASH_KEY or UNSPLASH_KEY == "your-unsplash-access-key":
        return {
            "results": [
                {
                    "urls": {
                        "regular": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800",
                        "small": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400",
                    },
                    "alt_description": f"Photo of {query}",
                    "user": {"name": "Unsplash"},
                }
            ]
        }

    try:
        with httpx.Client() as client:
            r = client.get(
                "https://api.unsplash.com/search/photos",
                params={"query": query, "per_page": 6},
                headers={"Authorization": f"Client-ID {UNSPLASH_KEY}"},
            )
            r.raise_for_status()
            return r.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch photos: {str(e)}")
