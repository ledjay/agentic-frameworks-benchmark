#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
from typing import Any

import mlflow

TRACKING_URI = os.environ.get("MLFLOW_BASE_URL", "http://127.0.0.1:5001")
EXPERIMENT_NAME = os.environ.get("MLFLOW_EXPERIMENT_NAME", "ansu-mlflow-genai-demo")
mlflow.set_tracking_uri(TRACKING_URI)


def json_default(value: Any):
    if hasattr(value, "to_dictionary"):
        return value.to_dictionary()
    if hasattr(value, "to_dict"):
        return value.to_dict()
    if hasattr(value, "__dict__"):
        return {k: v for k, v in value.__dict__.items() if not k.startswith("_")}
    return str(value)


def print_json(data: Any) -> None:
    print(json.dumps(data, ensure_ascii=False, default=json_default))


def get_experiment_id() -> str:
    exp = mlflow.get_experiment_by_name(EXPERIMENT_NAME)
    if exp is None:
        raise RuntimeError(f"Experiment not found: {EXPERIMENT_NAME}")
    return exp.experiment_id


def prompt_version_to_dict(version: Any) -> dict[str, Any]:
    return {
        "name": getattr(version, "name", None),
        "version": getattr(version, "version", None),
        "description": getattr(version, "description", None),
        "commit_message": getattr(version, "commit_message", None),
        "template": getattr(version, "template", None),
        "variables": list(getattr(version, "variables", []) or []),
        "tags": getattr(version, "tags", None) or {},
        "aliases": list(getattr(version, "aliases", []) or []),
        "model_config": json_default(getattr(version, "model_config", None)),
        "uri": getattr(version, "uri", None),
    }


def prompts() -> None:
    items = []
    for prompt in mlflow.genai.search_prompts():
        name = getattr(prompt, "name", None)
        data = {
            "name": name,
            "description": getattr(prompt, "description", None),
            "tags": getattr(prompt, "tags", None) or {},
            "creation_timestamp": getattr(prompt, "creation_timestamp", None),
        }
        if name:
            try:
                latest = mlflow.genai.load_prompt(name)
                data["latest"] = prompt_version_to_dict(latest)
            except Exception as exc:
                data["latest_error"] = str(exc)
        items.append(data)
    print_json({"data": items})


def traces() -> None:
    exp_id = get_experiment_id()
    df = mlflow.search_traces(experiment_ids=[exp_id], max_results=100)
    records = []
    for _, row in df.iterrows():
        records.append(
            {
                "trace_id": row.get("trace_id"),
                "state": row.get("state"),
                "request_time": str(row.get("request_time")),
                "execution_duration": row.get("execution_duration"),
                "request": row.get("request"),
                "response": row.get("response"),
                "metadata": row.get("trace_metadata") or {},
                "tags": row.get("tags") or {},
                "assessments": json_default(row.get("assessments")),
                "span_count": len(row.get("spans") or []),
            }
        )
    print_json({"data": records})


def trace(trace_id: str) -> None:
    exp_id = get_experiment_id()
    df = mlflow.search_traces(experiment_ids=[exp_id], max_results=100)
    match = df[df["trace_id"] == trace_id]
    if match.empty:
        raise RuntimeError(f"Trace not found: {trace_id}")
    row = match.iloc[0]
    spans = []
    for span in row.get("spans") or []:
        spans.append(json_default(span))
    print_json(
        {
            "trace_id": row.get("trace_id"),
            "state": row.get("state"),
            "request_time": str(row.get("request_time")),
            "execution_duration": row.get("execution_duration"),
            "request": row.get("request"),
            "response": row.get("response"),
            "metadata": row.get("trace_metadata") or {},
            "tags": row.get("tags") or {},
            "assessments": json_default(row.get("assessments")),
            "spans": spans,
        }
    )


def research() -> None:
    exp_id = get_experiment_id()
    df = mlflow.search_traces(experiment_ids=[exp_id], max_results=500)
    total = len(df)
    no_answer_refusals = 0
    drift_failures = 0
    sessions = set()
    notions = set()
    for _, row in df.iterrows():
        metadata = row.get("trace_metadata") or {}
        sessions.add(metadata.get("mlflow.trace.session", "unknown"))
        notions.add(metadata.get("ansu.sequence.notion", "unknown"))
        response = str(row.get("response") or "").lower()
        if "je ne peux pas te donner la réponse" in response:
            no_answer_refusals += 1
        if "drift_detected': true" in response or '"drift_detected": true' in response:
            drift_failures += 1
    print_json(
        {
            "total_traces": total,
            "sessions": len(sessions),
            "notions": sorted(notions),
            "direct_answer_refusals": no_answer_refusals,
            "drift_failures": drift_failures,
            "naivety_proxy_score": 1.0 if total and drift_failures == 0 else 0.0,
        }
    )


def main() -> None:
    command = sys.argv[1] if len(sys.argv) > 1 else ""
    if command == "prompts":
        prompts()
    elif command == "traces":
        traces()
    elif command == "trace":
        trace(sys.argv[2])
    elif command == "research":
        research()
    else:
        raise SystemExit("Usage: mlflow_bridge.py prompts|traces|trace <id>|research")


if __name__ == "__main__":
    main()
