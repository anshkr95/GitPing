"""Monitor / scan routes"""

from fastapi import APIRouter, Body
from typing import Any
from app.core.monitor import scan_all_subscriptions, scan_single_subscription

router = APIRouter(prefix="/api/monitor", tags=["monitor"])


@router.post("/scan")
async def trigger_scan(data: dict[str, Any] = Body(default={})):
    sub_id = data.get("subscriptionId")
    subscriptions_override = data.get("subscriptions")

    if sub_id:
        newly_detected = await scan_single_subscription(sub_id)
        return {
            "success": True,
            "type": "single",
            "matchesFound": len(newly_detected),
            "newDetectedIssues": newly_detected,
        }

    override = subscriptions_override if isinstance(subscriptions_override, list) else None
    report = await scan_all_subscriptions(override)
    return {"success": True, "type": "all", "report": report}


@router.get("/scan")
async def run_scan():
    report = await scan_all_subscriptions()
    return {"success": True, "type": "all", "report": report}
