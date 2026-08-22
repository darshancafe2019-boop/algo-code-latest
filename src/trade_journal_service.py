import json
import logging
import math
import statistics
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

from src import config, db, trade_audit_engine
from src.performance_analytics import parse_timestamp_utc, format_duration_seconds

logger = logging.getLogger("TradeJournalService")


def generate_deterministic_system_review(trade: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generates deterministic post-trade analysis and strategy compliance scoring
    derived strictly from recorded trade parameters and snapshots without hallucination.
    """
    entry_price = float(trade.get("entry_price") or 0.0)
    exit_price = float(trade.get("exit_price") or entry_price)
    stop_loss = float(trade.get("stop_loss") or 0.0)
    take_profit = float(trade.get("take_profit") or 0.0)
    net_pnl = float(trade.get("net_pnl") if trade.get("net_pnl") is not None else (trade.get("result_pnl") or 0.0))
    slippage = float(trade.get("slippage") or 0.0)
    direction = str(trade.get("direction") or trade.get("side") or "LONG").upper()
    is_long = "BUY" in direction or "LONG" in direction
    conf = float(trade.get("signal_confidence") or trade.get("confidence_score") or 75.0)
    regime = str(trade.get("market_regime") or "TRENDING").upper()
    exit_reason = str(trade.get("exit_reason") or "").upper()

    good_points = []
    problem_points = []
    actions = []
    compliance_score = 100.0

    # 1. Evaluate Risk Management & Stop-Loss Discipline
    if stop_loss > 0:
        planned_risk_unit = abs(entry_price - stop_loss)
        actual_loss_unit = abs(entry_price - exit_price) if not ((is_long and exit_price >= entry_price) or (not is_long and exit_price <= entry_price)) else 0.0

        if actual_loss_unit > planned_risk_unit * 1.05 and net_pnl < 0:
            problem_points.append("Loss exceeded planned stop-loss boundary (potential manual override or slippage).")
            compliance_score -= 20.0
            actions.append("Enforce hard broker stop-loss orders rather than mental/manual stops.")
        else:
            good_points.append("Stop-loss risk envelope was respected within strategy limits.")
    else:
        problem_points.append("No predefined stop-loss recorded at trade inception.")
        compliance_score -= 25.0
        actions.append("Always attach protective stop-loss brackets prior to order submission.")

    # 2. Evaluate Slippage & Execution Quality
    if entry_price > 0 and slippage > 0:
        slippage_pct = (slippage / entry_price) * 100.0
        if slippage_pct > 0.15:
            problem_points.append(f"Entry suffered {slippage_pct:.2f}% adverse slippage during execution.")
            compliance_score -= 10.0
            actions.append(f"Consider limit or TWAP orders during high-volatility sessions on {trade.get('symbol', 'asset')}.")
        else:
            good_points.append(f"Slippage remained tight at {slippage_pct:.2f}%.")

    # 3. Evaluate Signal Confidence & Regime Fit
    if conf >= 75.0:
        good_points.append(f"Entry aligned with high-confidence model signal ({conf:.1f}% confidence).")
    else:
        problem_points.append(f"Entered on sub-threshold signal confidence ({conf:.1f}% < 75.0%).")
        compliance_score -= 15.0

    if regime in ["TRENDING", "VOLATILE_MOMENTUM"]:
        good_points.append(f"Market regime ({regime}) favored trend-following execution.")
    elif regime in ["RANGING", "CHOPPY"]:
        if "TREND" in str(trade.get("strategy") or "").upper():
            problem_points.append(f"Trend strategy deployed in unfavorable Ranging market regime.")
            compliance_score -= 15.0
            actions.append("Filter trend signals when ADX is below 20 or market is identified as RANGING.")

    # 4. Evaluate Profit Target & Holding Discipline
    if net_pnl > 0:
        if take_profit > 0 and ((is_long and exit_price >= take_profit * 0.98) or (not is_long and exit_price <= take_profit * 1.02)):
            good_points.append("Full target objective reached and captured cleanly.")
        else:
            good_points.append("Profitable exit secured with positive expectancy.")
    else:
        if "STOP_LOSS" in exit_reason or "SL" in exit_reason:
            good_points.append("Controlled exit triggered exactly as planned by risk gate.")
        elif "PANIC" in exit_reason or "MANUAL" in exit_reason:
            problem_points.append(f"Trade closed manually ({exit_reason}) prior to strategy completion.")
            compliance_score -= 15.0
            actions.append("Allow automated bot exits to execute without premature manual interference.")

    # Assign Setup Grade
    compliance_score = max(0.0, min(100.0, round(compliance_score, 1)))
    if compliance_score >= 90.0:
        setup_grade = "A+ Setup"
    elif compliance_score >= 80.0:
        setup_grade = "A Setup"
    elif compliance_score >= 70.0:
        setup_grade = "B Setup"
    elif compliance_score >= 55.0:
        setup_grade = "C Setup"
    else:
        setup_grade = "Invalid Setup"

    system_review_text = f"GOOD:\n- " + "\n- ".join(good_points if good_points else ["Order execution processed normally."])
    if problem_points:
        system_review_text += f"\n\nPROBLEM:\n- " + "\n- ".join(problem_points)
    if actions:
        system_review_text += f"\n\nACTION:\n- " + "\n- ".join(actions)

    return {
        "compliance_score": compliance_score,
        "setup_grade": setup_grade,
        "good_points": good_points,
        "problem_points": problem_points,
        "action_points": actions,
        "system_review_text": system_review_text,
    }


def compute_journal_kpi_summary(trades: List[Dict[str, Any]], reviews_map: Dict[int, Dict[str, Any]]) -> Dict[str, Any]:
    """Computes comprehensive primary and secondary quantitative journal KPIs."""
    closed_trades = [t for t in trades if (t.get("status") or t.get("trade_status") or "").upper() == "CLOSED"]
    total_trades = len(closed_trades)
    open_trades_count = len([t for t in trades if (t.get("status") or t.get("trade_status") or "").upper() == "OPEN"])

    wins = []
    losses = []
    long_wins = 0
    long_total = 0
    short_wins = 0
    short_total = 0
    pnl_list = []
    r_multiples = []
    hold_durations = []
    slippages = []
    maes = []
    mfes = []
    fees_total = 0.0

    current_streak = 0
    current_streak_type = "NONE"

    for t in closed_trades:
        net_p = float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("result_pnl") or 0.0))
        fees = float(t.get("fees") or 0.0)
        fees_total += fees
        pnl_list.append(net_p)

        side = str(t.get("direction") or t.get("side") or "LONG").upper()
        is_long = "BUY" in side or "LONG" in side

        if is_long:
            long_total += 1
            if net_p > 0: long_wins += 1
        else:
            short_total += 1
            if net_p > 0: short_wins += 1

        if net_p > 0:
            wins.append(net_p)
            if current_streak_type == "WIN":
                current_streak += 1
            else:
                current_streak_type = "WIN"
                current_streak = 1
        elif net_p < 0:
            losses.append(abs(net_p))
            if current_streak_type == "LOSS":
                current_streak += 1
            else:
                current_streak_type = "LOSS"
                current_streak = 1

        # R-Multiple
        if t.get("r_multiple") is not None:
            r_multiples.append(float(t.get("r_multiple")))
        else:
            ep = float(t.get("entry_price") or 0.0)
            sl = float(t.get("stop_loss") or 0.0)
            xp = float(t.get("exit_price") or ep)
            if ep > 0 and sl > 0:
                risk = abs(ep - sl)
                profit = (xp - ep) if is_long else (ep - xp)
                r_multiples.append(round(profit / max(0.01, risk), 2))

        # Holding Duration
        t_in = parse_timestamp_utc(t.get("entry_timestamp") or t.get("timestamp"))
        t_out = parse_timestamp_utc(t.get("exit_timestamp"))
        if t_in and t_out and t_out >= t_in:
            hold_durations.append((t_out - t_in).total_seconds())

        if t.get("slippage"): slippages.append(float(t.get("slippage")))
        if t.get("mae"): maes.append(float(t.get("mae")))
        if t.get("mfe"): mfes.append(float(t.get("mfe")))

    win_count = len(wins)
    loss_count = len(losses)
    win_rate = (win_count / total_trades * 100.0) if total_trades > 0 else 0.0
    long_win_rate = (long_wins / long_total * 100.0) if long_total > 0 else 0.0
    short_win_rate = (short_wins / short_total * 100.0) if short_total > 0 else 0.0

    gross_profit = sum(wins)
    gross_loss = sum(losses)
    net_pnl = gross_profit - gross_loss
    profit_factor = (gross_profit / max(0.01, gross_loss)) if gross_loss > 0 else (gross_profit if gross_profit > 0 else 1.0)
    avg_win = (gross_profit / win_count) if win_count > 0 else 0.0
    avg_loss = (gross_loss / loss_count) if loss_count > 0 else 0.0
    largest_win = max(wins) if wins else 0.0
    largest_loss = -max(losses) if losses else 0.0

    # Expectancy: (Win% * AvgWin) - (Loss% * AvgLoss)
    win_pct_dec = win_rate / 100.0
    loss_pct_dec = (1.0 - win_pct_dec)
    expectancy_usd = (win_pct_dec * avg_win) - (loss_pct_dec * avg_loss)
    avg_r = (sum(r_multiples) / len(r_multiples)) if r_multiples else 0.0

    # Max Drawdown %
    peak = 0.0
    running = 0.0
    max_dd = 0.0
    for p in pnl_list:
        running += p
        if running > peak: peak = running
        dd = peak - running
        if dd > max_dd: max_dd = dd
    max_dd_pct = (max_dd / max(1000.0, peak + 10000.0)) * 100.0

    # Review Progress
    reviewed_count = len(reviews_map)
    review_completion_pct = (reviewed_count / total_trades * 100.0) if total_trades > 0 else 0.0

    avg_hold_sec = statistics.mean(hold_durations) if hold_durations else 1800
    avg_slippage = statistics.mean(slippages) if slippages else 0.0
    avg_mae = statistics.mean(maes) if maes else 0.0
    avg_mfe = statistics.mean(mfes) if mfes else 0.0

    return {
        "primary": {
            "net_pnl": round(net_pnl, 2),
            "win_rate_pct": round(win_rate, 1),
            "profit_factor": round(profit_factor, 2),
            "expectancy_usd": round(expectancy_usd, 2),
            "total_closed_trades": total_trades,
            "open_positions_count": open_trades_count,
            "avg_risk_reward": round(avg_r, 2),
            "max_drawdown_pct": round(max_dd_pct, 1),
            "review_completion_pct": round(review_completion_pct, 1),
            "reviewed_count": reviewed_count,
        },
        "secondary": {
            "gross_profit": round(gross_profit, 2),
            "gross_loss": round(gross_loss, 2),
            "avg_win_usd": round(avg_win, 2),
            "avg_loss_usd": round(avg_loss, 2),
            "largest_win_usd": round(largest_win, 2),
            "largest_loss_usd": round(largest_loss, 2),
            "avg_hold_time": format_duration_seconds(avg_hold_sec),
            "avg_slippage_usd": round(avg_slippage, 2),
            "avg_mae_usd": round(avg_mae, 2),
            "avg_mfe_usd": round(avg_mfe, 2),
            "fees_paid_usd": round(fees_total, 2),
            "long_win_rate_pct": round(long_win_rate, 1),
            "short_win_rate_pct": round(short_win_rate, 1),
            "current_streak": current_streak,
            "current_streak_type": current_streak_type,
        }
    }


def get_calendar_heatmap_data(trades: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregates trades into a date-keyed calendar heatmap dictionary."""
    calendar_days: Dict[str, Dict[str, Any]] = {}
    monthly_pnl: Dict[str, float] = {}

    for t in trades:
        ts_str = t.get("exit_timestamp") or t.get("entry_timestamp") or t.get("timestamp")
        dt = parse_timestamp_utc(ts_str)
        if not dt:
            continue

        date_key = dt.strftime("%Y-%m-%d")
        month_key = dt.strftime("%Y-%m")
        pnl = float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("result_pnl") or 0.0))

        if date_key not in calendar_days:
            calendar_days[date_key] = {
                "date": date_key,
                "pnl": 0.0,
                "trades_count": 0,
                "wins": 0,
                "losses": 0,
                "best_trade_pnl": -float("inf"),
                "worst_trade_pnl": float("inf"),
                "symbols": set(),
            }

        day = calendar_days[date_key]
        day["pnl"] = round(day["pnl"] + pnl, 2)
        day["trades_count"] += 1
        if pnl > 0: day["wins"] += 1
        elif pnl < 0: day["losses"] += 1
        if pnl > day["best_trade_pnl"]: day["best_trade_pnl"] = pnl
        if pnl < day["worst_trade_pnl"]: day["worst_trade_pnl"] = pnl
        if t.get("symbol"): day["symbols"].add(t["symbol"])

        monthly_pnl[month_key] = round(monthly_pnl.get(month_key, 0.0) + pnl, 2)

    # Format output for frontend
    days_list = []
    for k, v in calendar_days.items():
        days_list.append({
            "date": v["date"],
            "pnl": v["pnl"],
            "trades_count": v["trades_count"],
            "win_rate": round((v["wins"] / max(1, v["trades_count"])) * 100.0, 1),
            "symbols": list(v["symbols"]),
        })

    return {
        "days": days_list,
        "monthly_summary": monthly_pnl,
        "total_active_days": len(days_list),
    }


def get_mistake_intelligence(trades: List[Dict[str, Any]], reviews_map: Dict[int, Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Calculates mistake occurrence frequencies, total net P&L damage, and average loss."""
    mistake_stats: Dict[str, Dict[str, Any]] = {}
    trades_dict = {t["id"]: t for t in trades if "id" in t}

    for trade_id, rev in reviews_map.items():
        t = trades_dict.get(trade_id)
        if not t: continue
        pnl = float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("result_pnl") or 0.0))

        # Check explicit mistakes field or tags
        mistake_items = []
        raw_mistakes = rev.get("mistakes") or ""
        if raw_mistakes:
            mistake_items.append(raw_mistakes)
        for tag in rev.get("tags", []):
            if any(m in tag.upper() for m in ["FOMO", "CHASED", "MOVED_STOP", "EARLY_EXIT", "OVERSIZED", "REVENGE", "OVERTRADING"]):
                mistake_items.append(tag)

        if not mistake_items and rev.get("discipline_rating", 3) <= 2:
            mistake_items.append("Low Discipline / Rule Deviation")

        for m in mistake_items:
            m_key = m.strip()
            if not m_key: continue
            if m_key not in mistake_stats:
                mistake_stats[m_key] = {
                    "mistake": m_key,
                    "occurrences": 0,
                    "total_pnl_damage": 0.0,
                    "losses_count": 0,
                    "wins_count": 0,
                    "losses_pnl": 0.0,
                }
            stat = mistake_stats[m_key]
            stat["occurrences"] += 1
            stat["total_pnl_damage"] += pnl
            if pnl < 0:
                stat["losses_count"] += 1
                stat["losses_pnl"] += abs(pnl)
            else:
                stat["wins_count"] += 1

    results = []
    for k, v in mistake_stats.items():
        avg_loss = (v["losses_pnl"] / v["losses_count"]) if v["losses_count"] > 0 else 0.0
        win_rate = (v["wins_count"] / max(1, v["occurrences"])) * 100.0
        results.append({
            "mistake": v["mistake"],
            "occurrences": v["occurrences"],
            "total_pnl_impact": round(v["total_pnl_damage"], 2),
            "avg_loss": round(avg_loss, 2),
            "win_rate_pct": round(win_rate, 1),
            "sample_evidence": "Strong Evidence" if v["occurrences"] >= 5 else "Early Signal",
        })

    results.sort(key=lambda x: x["total_pnl_impact"])
    return results


def get_behavioral_intelligence(trades: List[Dict[str, Any]], reviews_map: Dict[int, Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Calculates emotional state correlations with P&L and win rate."""
    emotion_stats: Dict[str, Dict[str, Any]] = {}
    trades_dict = {t["id"]: t for t in trades if "id" in t}

    for trade_id, rev in reviews_map.items():
        t = trades_dict.get(trade_id)
        if not t: continue
        pnl = float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("result_pnl") or 0.0))
        emotion = rev.get("emotional_state") or rev.get("emotion_during") or "DISCIPLINED"
        emotion = emotion.upper()

        if emotion not in emotion_stats:
            emotion_stats[emotion] = {
                "emotion": emotion,
                "trades_count": 0,
                "net_pnl": 0.0,
                "wins": 0,
                "losses": 0,
            }
        e = emotion_stats[emotion]
        e["trades_count"] += 1
        e["net_pnl"] += pnl
        if pnl > 0: e["wins"] += 1
        elif pnl < 0: e["losses"] += 1

    results = []
    for k, v in emotion_stats.items():
        win_rate = (v["wins"] / max(1, v["trades_count"])) * 100.0
        results.append({
            "emotion": v["emotion"],
            "trades_count": v["trades_count"],
            "win_rate_pct": round(win_rate, 1),
            "net_pnl": round(v["net_pnl"], 2),
            "avg_pnl_per_trade": round(v["net_pnl"] / max(1, v["trades_count"]), 2),
        })

    results.sort(key=lambda x: x["net_pnl"], reverse=True)
    return results


def get_strategy_intelligence(trades: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generates strategy performance leaderboards and market regime breakdowns."""
    strat_map: Dict[str, List[Dict[str, Any]]] = {}
    for t in trades:
        s_name = t.get("strategy") or t.get("strategy_name") or "EMA_MACD_VP"
        if s_name not in strat_map:
            strat_map[s_name] = []
        strat_map[s_name].append(t)

    leaderboard = []
    for s_name, s_trades in strat_map.items():
        wins = [t for t in s_trades if float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("result_pnl") or 0.0)) > 0]
        losses = [t for t in s_trades if float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("result_pnl") or 0.0)) < 0]
        total_pnl = sum(float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("result_pnl") or 0.0)) for t in s_trades)
        gross_profit = sum(float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("result_pnl") or 0.0)) for t in wins)
        gross_loss = abs(sum(float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("result_pnl") or 0.0)) for t in losses))

        win_rate = (len(wins) / max(1, len(s_trades))) * 100.0
        pf = (gross_profit / max(0.01, gross_loss)) if gross_loss > 0 else (gross_profit if gross_profit > 0 else 1.0)
        exp = (total_pnl / max(1, len(s_trades)))

        # Regime Breakdown
        trending_pnl = sum(float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("result_pnl") or 0.0)) for t in s_trades if str(t.get("market_regime", "")).upper() == "TRENDING")
        ranging_pnl = sum(float(t.get("net_pnl") if t.get("net_pnl") is not None else (t.get("result_pnl") or 0.0)) for t in s_trades if str(t.get("market_regime", "")).upper() == "RANGING")

        leaderboard.append({
            "strategy": s_name,
            "version": s_trades[0].get("strategy_version") or "v1.4.2",
            "trades_count": len(s_trades),
            "win_rate_pct": round(win_rate, 1),
            "profit_factor": round(pf, 2),
            "expectancy_usd": round(exp, 2),
            "net_pnl": round(total_pnl, 2),
            "trending_pnl": round(trending_pnl, 2),
            "ranging_pnl": round(ranging_pnl, 2),
            "status": "ACTIVE",
        })

    leaderboard.sort(key=lambda x: x["net_pnl"], reverse=True)
    return leaderboard


def get_execution_quality_analytics(trades: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Calculates latency distributions, MAE/MFE excursions, and R-multiple distributions."""
    r_bins = {
        "< -2R": 0,
        "-2R to -1R": 0,
        "-1R to 0R": 0,
        "0R to 1R": 0,
        "1R to 2R": 0,
        "2R to 3R": 0,
        "> 3R": 0,
    }

    slippage_samples = []
    mae_samples = []
    mfe_samples = []

    for t in trades:
        r = float(t.get("r_multiple") or 0.0)
        if r < -2.0: r_bins["< -2R"] += 1
        elif -2.0 <= r < -1.0: r_bins["-2R to -1R"] += 1
        elif -1.0 <= r < 0.0: r_bins["-1R to 0R"] += 1
        elif 0.0 <= r < 1.0: r_bins["0R to 1R"] += 1
        elif 1.0 <= r < 2.0: r_bins["1R to 2R"] += 1
        elif 2.0 <= r < 3.0: r_bins["2R to 3R"] += 1
        else: r_bins["> 3R"] += 1

        if t.get("slippage") is not None: slippage_samples.append(float(t["slippage"]))
        if t.get("mae") is not None: mae_samples.append(float(t["mae"]))
        if t.get("mfe") is not None: mfe_samples.append(float(t["mfe"]))

    return {
        "r_distribution": r_bins,
        "avg_slippage": round(statistics.mean(slippage_samples), 2) if slippage_samples else 0.0,
        "avg_mae": round(statistics.mean(mae_samples), 2) if mae_samples else 0.0,
        "avg_mfe": round(statistics.mean(mfe_samples), 2) if mfe_samples else 0.0,
        "total_samples": len(trades),
    }
