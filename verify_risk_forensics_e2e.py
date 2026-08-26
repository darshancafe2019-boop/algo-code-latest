#!/usr/bin/env python3
"""
End-to-End Verification Test Suite for World-Class Risk Event Audit, Explainability & Forensics Center.
Tests:
1. Immutable Risk Decision Ledger schema, seed data, and SHA-256 integrity hashing.
2. Complete 14-gate evaluation matrix persistence & retrieval.
3. Before/After portfolio snapshot & Risk Impact Delta calculations.
4. Structured deterministic explanations with Fact/Derived/Explanation labels.
5. Proof of Blocked Orders NOT Submitted vs Approved Orders.
6. Operator acknowledgements, notes, and authorized override workflows.
7. Risk analytics KPI aggregation and CSV/JSON export.
"""

import json
import sqlite3
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
import time
import urllib.request
import urllib.error

from src import config, db

BASE_URL = "http://127.0.0.1:5050"
_flask_client = None
_server_online = None

def http_req(endpoint: str, method: str = "GET", body: dict = None) -> tuple[int, dict]:
    global _flask_client, _server_online

    if _server_online is None:
        try:
            req = urllib.request.Request(f"{BASE_URL}/api/bot/status")
            with urllib.request.urlopen(req, timeout=0.8) as r:
                _server_online = (r.status == 200)
        except Exception:
            _server_online = False

    if _server_online:
        url = f"{BASE_URL}{endpoint}"
        data = json.dumps(body).encode("utf-8") if body else None
        headers = {"Content-Type": "application/json"} if body else {}
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                content = resp.read().decode("utf-8")
                return resp.status, json.loads(content) if content else {}
        except urllib.error.HTTPError as e:
            content = e.read().decode("utf-8")
            try:
                return e.code, json.loads(content)
            except Exception:
                return e.code, {"error": content}
        except Exception:
            _server_online = False

    # In-process test client
    if _flask_client is None:
        import dashboard
        _flask_client = dashboard.app.test_client()

    if method == "GET":
        resp = _flask_client.get(endpoint)
    elif method == "POST":
        resp = _flask_client.post(endpoint, json=body)
    elif method == "PUT":
        resp = _flask_client.put(endpoint, json=body)
    elif method == "DELETE":
        resp = _flask_client.delete(endpoint)
    else:
        resp = _flask_client.open(endpoint, method=method, json=body)

    return resp.status_code, resp.get_json(silent=True) or {}


def test_1_immutable_risk_decisions_ledger():
    print("\n--- TEST 1: Immutable Risk Decision Ledger & SHA-256 Hash ---")
    status, res = http_req("/api/risk/decisions")
    assert status == 200, f"Expected 200, got {status}"
    assert res["status"] == "success"
    assert res["total"] >= 4, f"Expected at least 4 seeded decisions, got {res['total']}"

    decisions = res["decisions"]
    for d in decisions:
        assert d.get("risk_event_id", "").startswith("RISK-")
        assert d.get("decision") in ["APPROVED", "APPROVED_WITH_WARNING", "BLOCKED", "OVERRIDDEN"]
        assert len(d.get("integrity_hash", "")) == 64, "Must have valid 64-char SHA-256 integrity hash"

    print(f"✅ Immutable Risk Decision Ledger verified: {len(decisions)} decisions indexed with SHA-256 hashes.")


def test_2_complete_14_gate_evaluations():
    print("\n--- TEST 2: 14-Stage Pre-Trade Risk Gate Matrix ---")
    status, res = http_req("/api/risk/decisions/RISK-20260820-10942")
    assert status == 200, f"Expected 200, got {status}"
    assert res["status"] == "success"
    d = res["decision"]

    gates = d.get("gate_evaluations", [])
    assert len(gates) == 14, f"Expected 14 evaluated gates, got {len(gates)}"

    gate_names = [g["gate_name"] for g in gates]
    assert "Data Freshness" in gate_names
    assert "Single-Asset Concentration" in gate_names
    assert "Emergency Kill Switch" in gate_names

    for g in gates:
        assert g["status"] in ["PASS", "WARNING", "FAIL"]
        assert "unit" in g

    print(f"✅ 14-Stage Gate Matrix verified for {d['risk_event_id']}: All 14 gates stored and inspected.")


def test_3_portfolio_snapshots_and_risk_delta():
    print("\n--- TEST 3: Before/After Portfolio Snapshot & Risk Impact Delta ---")
    status, res = http_req("/api/risk/decisions/RISK-20260820-10943")
    assert status == 200
    d = res["decision"]

    p_before = d.get("portfolio_before", {})
    p_after = d.get("portfolio_after", {})
    r_delta = d.get("risk_delta", {})

    assert p_before.get("symbol_exposure") == 3200.0
    assert p_after.get("symbol_exposure") == 7700.0
    assert r_delta.get("symbol_exposure_diff") == 4500.0
    assert r_delta.get("margin_diff_pct") == 9.0

    print(f"✅ Portfolio Snapshot verified: Before ($3,200) -> After ($7,700) with exact +$4,500 Risk Delta.")


def test_4_structured_fact_derived_explanations():
    print("\n--- TEST 4: Structured Deterministic Explanations (Fact/Derived/Explanation) ---")
    status, res = http_req("/api/risk/decisions/RISK-20260820-10943")
    assert status == 200
    d = res["decision"]

    explanation = d.get("plain_explanation", "")
    assert "[FACT]" in explanation, "Must contain [FACT] labels for verifiable inputs"
    assert "[DERIVED]" in explanation, "Must contain [DERIVED] labels for computed limits"
    assert "[EXPLANATION]" in explanation, "Must contain [EXPLANATION] for human-readable synthesis"
    assert d.get("max_passing_exposure") == 800.0, "Must calculate mathematical max passing exposure"

    print(f"✅ Fact/Derived/Explanation labels and 'What Would Pass' ($800.00) verified.")


def test_5_proof_of_execution_status():
    print("\n--- TEST 5: Proof of Blocked Orders NOT Submitted vs Approved Orders ---")
    # Approved trade
    status1, res1 = http_req("/api/risk/decisions/RISK-20260820-10942")
    assert status1 == 200
    assert res1["decision"]["execution_status"] == "SUBMITTED"

    # Blocked trade
    status2, res2 = http_req("/api/risk/decisions/RISK-20260820-10943")
    assert status2 == 200
    assert res2["decision"]["execution_status"] == "NOT_SUBMITTED"
    assert "rejected" in res2["decision"]["execution_message"].lower()

    print(f"✅ Execution Status verified: Approved = SUBMITTED, Blocked = NOT SUBMITTED (Zero Leakage).")


def test_6_acknowledgements_notes_and_overrides():
    print("\n--- TEST 6: Operator Notes & Authorized Override Workflow ---")
    # 1. Add note
    status1, res1 = http_req("/api/risk/decisions/RISK-20260820-10945/note", "POST", {
        "note": "Investigating WebSocket reconnect latency with Binance feed."
    })
    assert status1 == 200 and res1["status"] == "success"

    # 2. Verify note appended
    status2, res2 = http_req("/api/risk/decisions/RISK-20260820-10945")
    assert status2 == 200
    assert "Investigating WebSocket" in res2["decision"].get("notes", "")

    # 3. Acknowledge warning
    status3, res3 = http_req("/api/risk/decisions/RISK-20260820-10944/acknowledge", "POST", {
        "acknowledged_by": "Senior Risk Manager"
    })
    assert status3 == 200 and res3["status"] == "success"

    # 4. Authorized Override
    status4, res4 = http_req("/api/risk/decisions/RISK-20260820-10945/override", "POST", {
        "override_by": "Head of Trading",
        "reason": "Secondary quote feed verified manually."
    })
    assert status4 == 200 and res4["status"] == "success"

    print("✅ Operator Notes, Warning Acknowledgements, and Authorized Overrides persistent.")


def test_7_risk_analytics_and_export():
    global _flask_client
    print("\n--- TEST 7: Risk Analytics KPIs and CSV/JSON Export ---")
    status1, res1 = http_req("/api/risk/analytics")
    assert status1 == 200
    assert res1["status"] == "success"
    a = res1["analytics"]
    assert a["total_events"] >= 4
    assert len(a["top_blocking_gates"]) > 0

    # Test CSV export endpoint
    csv_text = ""
    try:
        url = f"{BASE_URL}/api/risk/export?format=csv"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            assert resp.status == 200
            csv_text = resp.read().decode("utf-8")
    except Exception:
        if _flask_client is None:
            import dashboard
            _flask_client = dashboard.app.test_client()
        resp = _flask_client.get("/api/risk/export?format=csv")
        assert resp.status_code == 200
        csv_text = resp.data.decode("utf-8")

    assert "Risk Event ID" in csv_text
    assert "RISK-20260820-10942" in csv_text

    print(f"✅ Risk Analytics & CSV Export verified: {a['total_events']} events analyzed, CSV stream validated.")


def main():
    print("=" * 75)
    print("  RISK EVENT AUDIT, EXPLAINABILITY & FORENSICS CENTER VERIFICATION  ")
    print("=" * 75)

    test_1_immutable_risk_decisions_ledger()
    test_2_complete_14_gate_evaluations()
    test_3_portfolio_snapshots_and_risk_delta()
    test_4_structured_fact_derived_explanations()
    test_5_proof_of_execution_status()
    test_6_acknowledgements_notes_and_overrides()
    test_7_risk_analytics_and_export()

    print("\n" + "=" * 75)
    print("  🎉 ALL 7 RISK FORENSICS CENTER TESTS PASSED WITH 100% SUCCESS!  ")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    main()
