"""Public, stateless API for the fictional SylClips portfolio lab.

This module only reads demo-data.json. It has no access to the private video
project, uploads, model providers, or personal data.
"""

from pathlib import Path
import json
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


DATA = json.loads((Path(__file__).parent / "demo-data.json").read_text(encoding="utf-8"))
JOBS = {job["id"]: job for job in DATA["jobs"]}

app = FastAPI(
    title="SylClips Public Demo API",
    version="1.0.0",
    description="Fictional jobs and deterministic planning for a portfolio demonstration.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://laanm.github.io", "http://127.0.0.1:8766"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)


class PlanRequest(BaseModel):
    jobId: str = Field(min_length=1, max_length=40)
    decisions: dict[str, Literal["separate", "merge", "review"]] = Field(default_factory=dict)


@app.get("/healthz")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/jobs")
def list_jobs() -> dict:
    return {"version": DATA["version"], "notice": DATA["notice"], "jobs": DATA["jobs"]}


@app.post("/api/v1/plan")
def compose_plan(request: PlanRequest) -> dict:
    job = JOBS.get(request.jobId)
    if job is None:
        raise HTTPException(status_code=404, detail="Unknown fictional job")

    candidates = job["candidates"]
    allowed = {candidate["id"] for candidate in candidates}
    unexpected = set(request.decisions) - allowed
    if unexpected:
        raise HTTPException(status_code=422, detail="Decision refers to another job")

    def verdict(candidate: dict) -> str:
        return request.decisions.get(candidate["id"], candidate["reference"])

    cuts = sorted(
        (candidate for candidate in candidates if verdict(candidate) == "separate"),
        key=lambda candidate: candidate["time"],
    )
    edges = [0, *(candidate["time"] for candidate in cuts), job["duration"]]
    segments = []
    for index, start in enumerate(edges[:-1]):
        cut = cuts[index - 1] if index else None
        segments.append(
            {
                "order": index + 1,
                "startSeconds": round(start, 1),
                "endSeconds": round(edges[index + 1], 1),
                "label": f"Clip {index + 1:02d}",
                "reviewStatus": (
                    "start of sample"
                    if cut is None
                    else "human reviewed"
                    if cut["id"] in request.decisions
                    else "illustrative reference"
                ),
            }
        )

    return {
        "demo": True,
        "dataSource": "fictional sample",
        "jobId": job["id"],
        "durationSeconds": job["duration"],
        "reviewedCandidates": len(request.decisions),
        "pendingReview": [candidate["id"] for candidate in candidates if verdict(candidate) == "review"],
        "segments": segments,
    }
