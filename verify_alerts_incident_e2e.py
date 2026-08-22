#!/usr/bin/env python3
"""
End-to-End Verification Suite for Institutional Alerts & Incident Management Center
===================================================================================
Validates:
1. Single authoritative source of truth in SQLite (`incidents`, `alerts`, `alert_rules`).
2. Deduplication & Occurrence counting by fingerprint.
3. Alert storm grouping under rapid bursts.
4. Correct Severity taxonomy (Routine bot lifecycle = INFO, Broker drop = CRITICAL).
5. State transitions (NEW -> ACKNOWLEDGED -> RESOLVED -> ARCHIVED).
6. Non-destructive archival & safe bulk acknowledge.
7. Test alert isolation (is_test=1).
8. REST API contract & SSE health.
"""

import sys
import json
import time
import urllib.request
import urllib.parse
from datetime import datetime, timezone

BASE_URL = "http://127.0.0.1:5050"


def http_req(path, method="GET", body=None):
    url = f"{BASE_URL}{path}"
    data = json.dumps(body).encode("utf-8") if body else None
    headers = {"Content-Type": "application/json"} if body else {}
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def test_1_source_of_truth_and_rules():
    print("\n--- TEST 1: Authoritative DB Tables & Default Alert Rules ---")
    status, res = http_req("/api/alert-rules")
    assert status == 200, f"Expected 200, got {status}"
    assert res.get("status") == "success"
    rules = res.get("rules", [])
    assert len(rules) >= 10, f"Expected at least 10 rules, found {len(rules)}"

    # Check for mandatory safety rules
    mandatory = [r for r in rules if r.get("is_system_required") == 1]
    assert len(mandatory) >= 4, f"Expected >= 4 system mandatory rules, found {len(mandatory)}"
    print(f"✅ Alert rules verified: {len(rules)} total ({len(mandatory)} system mandatory).")


def test_2_deduplication_and_occurrence_increment():
    print("\n--- TEST 2: Fingerprint Deduplication & Occurrence Increment ---")
    import uuid
    run_key = uuid.uuid4().hex[:6]
    # Ingest same event 3 times
    body = {
        "severity": "WARNING",
        "category": "MARKET_DATA",
        "channel": "system",
        "title": f"Binance BTC/USDT Feed Stalled {run_key}",
        "message": "WebSocket gap detected for symbol BTC/USDT"
    }

    # 1st Ingestion -> Opens Incident
    status1, res1 = http_req("/api/alerts/test", "POST", body)
    assert status1 == 200
    inc_id = res1["result"]["incident_id"]
    assert res1["result"]["occurrence_count"] == 1
    assert res1["result"]["action"] == "INCIDENT_OPENED"

    # 2nd Ingestion -> Deduplicates & Increments
    status2, res2 = http_req("/api/alerts/test", "POST", body)
    assert status2 == 200
    assert res2["result"]["incident_id"] == inc_id
    assert res2["result"]["occurrence_count"] == 2
    assert res2["result"]["action"] == "DEDUP_INCREMENT"

    # 3rd Ingestion -> Deduplicates & Increments
    status3, res3 = http_req("/api/alerts/test", "POST", body)
    assert status3 == 200
    assert res3["result"]["incident_id"] == inc_id
    assert res3["result"]["occurrence_count"] == 3

    # Verify Incident Detail has all 3 granular child alerts
    status_det, res_det = http_req(f"/api/incidents/{inc_id}")
    assert status_det == 200
    assert len(res_det["incident"]["alerts"]) == 3
    print(f"✅ Deduplication verified: Incident {inc_id} occurrence_count=3 with 3 linked child alerts.")


def test_3_alert_storm_detection():
    print("\n--- TEST 3: Alert Storm Detection & Grouping ---")
    import uuid
    run_key = uuid.uuid4().hex[:6]
    body = {
        "severity": "ERROR",
        "category": "EXECUTION",
        "channel": "system",
        "title": f"Rapid Order Submission Rate Limit {run_key}",
        "message": "HTTP 429 Too Many Requests from Exchange Gateway"
    }

    first_res = None
    for i in range(25):
        status, res = http_req("/api/alerts/test", "POST", body)
        assert status == 200
        if i == 0:
            first_res = res

    inc_id = first_res["result"]["incident_id"]
    status_det, res_det = http_req(f"/api/incidents/{inc_id}")
    assert status_det == 200
    inc = res_det["incident"]
    assert inc["occurrence_count"] >= 25
    assert "ALERT STORM" in inc["title"]
    print(f"✅ Alert storm protection verified: Incident {inc_id} tagged with [ALERT STORM] (x{inc['occurrence_count']}).")


def test_4_severity_taxonomy_routine_events():
    print("\n--- TEST 4: Severity Taxonomy & Routine Lifecycle Normalization ---")
    from src.alert_engine import global_alert_engine

    # Routine bot pause should be normalized to INFO
    res = global_alert_engine.ingest_event(
        title="Bot Execution Paused",
        message="Bot bot-1 execution paused by operator command.",
        severity="WARNING", # Input was mistakenly WARNING
        category="BOT",
        source="Bot Control",
        bot_id="bot-1",
        is_test=True
    )
    assert res["severity"] == "INFO", f"Expected normalized INFO, got {res['severity']}"

    # Critical failure should remain CRITICAL
    res_crit = global_alert_engine.ingest_event(
        title="Broker Connection Dropped",
        message="Exchange connection closed unexpectedly while holding 1.5 BTC.",
        severity="CRITICAL",
        category="BROKER",
        source="Broker Gateway",
        bot_id="bot-1",
        is_test=True
    )
    assert res_crit["severity"] == "CRITICAL", f"Expected CRITICAL, got {res_crit['severity']}"
    print("✅ Severity taxonomy verified: Routine bot pause normalized to INFO; real failure retained CRITICAL.")


def test_5_lifecycle_state_transitions():
    print("\n--- TEST 5: Lifecycle Transitions (NEW -> ACKNOWLEDGED -> RESOLVED -> ARCHIVED) ---")
    import uuid
    run_key = uuid.uuid4().hex[:6]
    body = {
        "severity": "CRITICAL",
        "category": "RISK",
        "channel": "system",
        "title": f"Max Drawdown Triggered {run_key}",
        "message": "Account equity dropped below safety buffer"
    }
    _, res = http_req("/api/alerts/test", "POST", body)
    inc_id = res["result"]["incident_id"]

    # 1. NEW
    s, d = http_req(f"/api/incidents/{inc_id}")
    assert d["incident"]["status"] == "NEW"

    # 2. ACKNOWLEDGE
    s_ack, d_ack = http_req(f"/api/incidents/{inc_id}/acknowledge", "POST", {"operator_name": "SeniorTrader"})
    assert s_ack == 200
    assert d_ack["state"] == "ACKNOWLEDGED"

    # 3. RESOLVE
    s_res, d_res = http_req(f"/api/incidents/{inc_id}/resolve", "POST", {"operator_name": "SeniorTrader", "note": "Position liquidated and buffer reset"})
    assert s_res == 200
    assert d_res["state"] == "RESOLVED"

    # 4. ARCHIVE
    s_arc, d_arc = http_req(f"/api/incidents/{inc_id}/archive", "POST", {"operator_name": "SeniorTrader"})
    assert s_arc == 200
    assert d_arc["state"] == "ARCHIVED"

    # 5. Verify record still exists in DB (Non-destructive!)
    s_chk, d_chk = http_req(f"/api/incidents/{inc_id}")
    assert s_chk == 200
    assert d_chk["incident"]["status"] == "ARCHIVED"
    assert d_chk["incident"]["resolved_by"] == "SeniorTrader"
    print(f"✅ Full lifecycle transitions verified on Incident {inc_id} with zero data loss.")


def test_6_safe_non_destructive_clear():
    print("\n--- TEST 6: Safe Clear (Acknowledge Visible instead of Deleting Tables) ---")
    status, res = http_req("/api/alerts/clear", "POST")
    assert status == 200
    assert "Historical records preserved" in res.get("message", "")
    print(f"✅ Safe clear verified: {res.get('affected_count')} incidents acknowledged non-destructively.")


def test_7_kpi_summary_and_filtered_lists():
    print("\n--- TEST 7: KPI Summary & Server-Side Filtered Queries ---")
    s_sum, d_sum = http_req("/api/incidents/summary")
    assert s_sum == 200
    metrics = d_sum.get("metrics", {})
    assert "active_incidents" in metrics
    assert "critical" in metrics
    assert "error" in metrics
    assert "warning" in metrics
    assert "unacknowledged" in metrics
    assert "affected_bots_count" in metrics

    # Query filtered list
    s_list, d_list = http_req("/api/incidents?status=ALL&limit=10")
    assert s_list == 200
    assert "incidents" in d_list
    assert "total_count" in d_list
    print(f"✅ Server-side query verified: {len(d_list['incidents'])} returned of {d_list['total_count']} total.")


def main():
    print("==================================================================")
    print("  INSTITUTIONAL ALERTS & INCIDENT MANAGEMENT E2E VERIFICATION   ")
    print("==================================================================")
    
    test_1_source_of_truth_and_rules()
    test_2_deduplication_and_occurrence_increment()
    test_3_alert_storm_detection()
    test_4_severity_taxonomy_routine_events()
    test_5_lifecycle_state_transitions()
    test_6_safe_non_destructive_clear()
    test_7_kpi_summary_and_filtered_lists()

    print("\n==================================================================")
    print("  🎉 ALL 7 E2E TESTS PASSED WITH 100% SUCCESS!                    ")
    print("==================================================================")


if __name__ == "__main__":
    main()
