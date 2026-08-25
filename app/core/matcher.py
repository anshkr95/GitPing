"""
Label matching engine.
"""

from __future__ import annotations

from typing import Union


def normalize_label(name: str) -> str:
    """Lowercase and strip a label name."""
    return (name or "").strip().lower()


def match_issue_labels(
    issue_labels: list[Union[dict, str]],
    tracked_labels: list[str],
    match_mode: str = "any",
) -> dict:
    """Check whether an issue's labels match the tracked set."""
    if not tracked_labels:
        return {
            "isMatch": False,
            "matchedLabels": [],
            "totalTracked": 0,
            "totalMatched": 0,
            "matchMode": match_mode,
            "reason": "No tracked labels configured for this repository",
        }

    # "__ALL__" means track every issue regardless of labels
    if "__ALL__" in tracked_labels:
        all_names = [
            (l if isinstance(l, str) else l.get("name", "")) for l in issue_labels
        ]
        return {
            "isMatch": True,
            "matchedLabels": all_names,
            "totalTracked": len(tracked_labels),
            "totalMatched": len(all_names),
            "matchMode": match_mode,
            "reason": "Tracking all issues from this repository",
        }

    issue_label_names = [
        normalize_label(l) if isinstance(l, str) else normalize_label(l.get("name", ""))
        for l in issue_labels
    ]

    matched_labels: list[str] = []
    for tracked in tracked_labels:
        norm = normalize_label(tracked)
        if norm in issue_label_names:
            idx = issue_label_names.index(norm)
            original = (
                issue_labels[idx]
                if isinstance(issue_labels[idx], str)
                else issue_labels[idx].get("name", "")
            )
            matched_labels.append(original)

    if match_mode == "all":
        is_match = len(matched_labels) == len(tracked_labels)
    else:
        is_match = len(matched_labels) > 0

    if is_match:
        reason = (
            f"Matched all {len(tracked_labels)} tracked labels: {', '.join(matched_labels)}"
            if match_mode == "all"
            else f"Matched {len(matched_labels)} of {len(tracked_labels)} tracked labels: {', '.join(matched_labels)}"
        )
    else:
        reason = (
            f"Missing some required labels (found {len(matched_labels)}/{len(tracked_labels)})"
            if match_mode == "all"
            else f"None of the issue labels matched any of the {len(tracked_labels)} tracked labels"
        )

    return {
        "isMatch": is_match,
        "matchedLabels": matched_labels,
        "totalTracked": len(tracked_labels),
        "totalMatched": len(matched_labels),
        "matchMode": match_mode,
        "reason": reason,
    }
