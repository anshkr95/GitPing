from fastapi import APIRouter, HTTPException, Body
from typing import Dict, Any
from app.core import db

router = APIRouter(prefix='/api/subscriptions', tags=['subscriptions'])

@router.get('')
async def get_subscriptions():
    return {"subscriptions": db.get_subscriptions()}

@router.post('', status_code=201)
async def add_subscription(data: Dict[str, Any] = Body(...)):
    if not db.storage_available():
        raise HTTPException(
            status_code=503,
            detail="Persistent storage is not configured. Attach Vercel KV and set KV_REST_API_URL and KV_REST_API_TOKEN.",
        )
    repo_full_name = data.get("repoFullName")
    tracked_labels = data.get("trackedLabels")
    
    if not repo_full_name:
        raise HTTPException(status_code=400, detail="repoFullName is required")
    if not tracked_labels or len(tracked_labels) == 0:
        raise HTTPException(status_code=400, detail="trackedLabels cannot be empty")
        
    subscription = db.add_subscription(data)
    return {"subscription": subscription, "success": True}

@router.patch('')
async def update_subscription(data: Dict[str, Any] = Body(...)):
    sub_id = data.get("id")
    if not sub_id:
        raise HTTPException(status_code=400, detail="id is required")
        
    updated = db.update_subscription(sub_id, data)
    if not updated:
        raise HTTPException(status_code=404, detail="Subscription not found")
        
    return {"subscription": updated, "success": True}

@router.delete('')
async def delete_subscription(id: str):
    if not id:
        raise HTTPException(status_code=400, detail="id is required")
    db.delete_subscription(id)
    return {"success": True, "deletedId": id}
