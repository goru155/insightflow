import io
import logging
import os
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from analytics_engine import build_backend_response

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("insightflow.api")

app = FastAPI(title="InsightFlow Analytics API")

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "InsightFlow backend is running"}


@app.get("/demo")
def demo_data(chart_type: str = "Auto best fit"):
    try:
        return build_backend_response(chart_type=chart_type)
    except Exception as exc:
        logger.exception("Error generating demo data")
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})


@app.post("/analyze")
async def analyze_dataset(
    chart_type: str = Form("Auto best fit"),
    file: Optional[UploadFile] = File(None),
):
    try:
        if file is None:
            return build_backend_response(chart_type=chart_type)

        contents = await file.read()
        if not contents or len(contents.strip()) == 0:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Uploaded file is empty."},
            )

        upload = io.BytesIO(contents)
        upload.name = file.filename
        result = build_backend_response(uploaded_file=upload, chart_type=chart_type)
        return result
    except (ValueError, KeyError) as client_err:
        logger.warning("Dataset processing validation error: %s", client_err)
        return JSONResponse(status_code=400, content={"success": False, "error": str(client_err)})
    except Exception as exc:
        logger.exception("Unexpected error processing dataset")
        return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})
