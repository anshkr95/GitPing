from fastapi import APIRouter, Query, Body, HTTPException
from typing import Dict, Any
from app.core import db

router = APIRouter(prefix='/api/issues', tags=['issues'])

@router.get('')
async def get_issues(limit: int = Query(50)):
    return {"issues": db.get_detected_issues(limit)}

@router.patch('')
async def mark_issue_read(data: Dict[str, Any] = Body(...)):
    issue_id = data.get("id")
    if not issue_id:
        raise HTTPException(status_code=400, detail="id is required")
    db.mark_issue_read(issue_id)
    return {"success": True}
