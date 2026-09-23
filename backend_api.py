import io
import os
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from analytics_engine import build_backend_response

app = FastAPI(title="InsightFlow Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "message": "InsightFlow backend is running"}


@app.get("/demo")
def demo_data(chart_type: str = "Auto best fit"):
    return build_backend_response(chart_type=chart_type)


@app.post("/analyze")
async def analyze_dataset(
    chart_type: str = Form("Auto best fit"),
    file: Optional[UploadFile] = File(None),
):
    try:
        if file is None:
            return build_backend_response(chart_type=chart_type)

        contents = await file.read()
        upload = io.BytesIO(contents)
        upload.name = file.filename
        result = build_backend_response(uploaded_file=upload, chart_type=chart_type)
        return result
    except Exception as exc:
        return JSONResponse(status_code=400, content={"success": False, "error": str(exc)})
