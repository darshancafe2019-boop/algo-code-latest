"""
Upstox V3 Market Data Feed Protobuf Decoder
===========================================
Official Protocol Buffer decoder for Upstox V3 binary market data streams.
Decodes real-time binary frames received from wss://api.upstox.com/v3/feed/market-data-feed.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from google.protobuf import descriptor_pb2, descriptor_pool, message_factory

logger = logging.getLogger("UpstoxProtoDecoder")

# Build Upstox V3 Protobuf FileDescriptorProto
_file_proto = descriptor_pb2.FileDescriptorProto()
_file_proto.name = "MarketDataFeed.proto"
_file_proto.package = "com.upstox.marketdatafeeder.rpc.proto"
_file_proto.syntax = "proto3"

# Enum Type
_enum_type = _file_proto.enum_type.add()
_enum_type.name = "Type"
_ev1 = _enum_type.value.add(); _ev1.name = "initial_feed"; _ev1.number = 0
_ev2 = _enum_type.value.add(); _ev2.name = "live_feed"; _ev2.number = 1

# LTPC
_msg_ltpc = _file_proto.message_type.add()
_msg_ltpc.name = "LTPC"
for _num, _name, _t in [
    (1, "ltp", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (2, "ltt", descriptor_pb2.FieldDescriptorProto.TYPE_INT64),
    (3, "ltq", descriptor_pb2.FieldDescriptorProto.TYPE_INT64),
    (4, "cp", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
]:
    _f = _msg_ltpc.field.add(); _f.name = _name; _f.number = _num; _f.type = _t

# Quote
_msg_quote = _file_proto.message_type.add()
_msg_quote.name = "Quote"
for _num, _name, _t in [
    (1, "bq", descriptor_pb2.FieldDescriptorProto.TYPE_INT32),
    (2, "bp", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (3, "bno", descriptor_pb2.FieldDescriptorProto.TYPE_INT32),
    (4, "aq", descriptor_pb2.FieldDescriptorProto.TYPE_INT32),
    (5, "ap", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (6, "ano", descriptor_pb2.FieldDescriptorProto.TYPE_INT32),
]:
    _f = _msg_quote.field.add(); _f.name = _name; _f.number = _num; _f.type = _t

# MarketLevel
_msg_ml = _file_proto.message_type.add()
_msg_ml.name = "MarketLevel"
_f = _msg_ml.field.add()
_f.name = "bidAskQuote"; _f.number = 1; _f.type = descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE
_f.type_name = ".com.upstox.marketdatafeeder.rpc.proto.Quote"
_f.label = descriptor_pb2.FieldDescriptorProto.LABEL_REPEATED

# OHLC
_msg_ohlc = _file_proto.message_type.add()
_msg_ohlc.name = "OHLC"
for _num, _name, _t in [
    (1, "interval", descriptor_pb2.FieldDescriptorProto.TYPE_STRING),
    (2, "open", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (3, "high", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (4, "low", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (5, "close", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (6, "volume", descriptor_pb2.FieldDescriptorProto.TYPE_INT64),
    (7, "ts", descriptor_pb2.FieldDescriptorProto.TYPE_INT64),
]:
    _f = _msg_ohlc.field.add(); _f.name = _name; _f.number = _num; _f.type = _t

# MarketOHLC
_msg_mohlc = _file_proto.message_type.add()
_msg_mohlc.name = "MarketOHLC"
_f = _msg_mohlc.field.add()
_f.name = "ohlc"; _f.number = 1; _f.type = descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE
_f.type_name = ".com.upstox.marketdatafeeder.rpc.proto.OHLC"
_f.label = descriptor_pb2.FieldDescriptorProto.LABEL_REPEATED

# OptionGreeks
_msg_og = _file_proto.message_type.add()
_msg_og.name = "OptionGreeks"
for _num, _name, _t in [
    (1, "op", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (2, "up", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (3, "iv", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (4, "delta", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (5, "theta", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (6, "gamma", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (7, "vega", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (8, "rho", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
]:
    _f = _msg_og.field.add(); _f.name = _name; _f.number = _num; _f.type = _t

# ExtendedFeedDetails
_msg_ef = _file_proto.message_type.add()
_msg_ef.name = "ExtendedFeedDetails"
for _num, _name, _t in [
    (1, "atp", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (2, "cp", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (3, "v", descriptor_pb2.FieldDescriptorProto.TYPE_INT64),
    (4, "oi", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (5, "changeOi", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (6, "lastClose", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (7, "tbq", descriptor_pb2.FieldDescriptorProto.TYPE_INT64),
    (8, "tsq", descriptor_pb2.FieldDescriptorProto.TYPE_INT64),
    (9, "close", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (10, "lc", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (11, "uc", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (12, "yh", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (13, "yl", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (14, "fp", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (15, "fv", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
    (16, "mbp", descriptor_pb2.FieldDescriptorProto.TYPE_DOUBLE),
]:
    _f = _msg_ef.field.add(); _f.name = _name; _f.number = _num; _f.type = _t

# MarketFullFeed
_msg_mff = _file_proto.message_type.add()
_msg_mff.name = "MarketFullFeed"
for _num, _name, _tname in [
    (1, "ltpc", ".com.upstox.marketdatafeeder.rpc.proto.LTPC"),
    (2, "marketLevel", ".com.upstox.marketdatafeeder.rpc.proto.MarketLevel"),
    (3, "optionGreeks", ".com.upstox.marketdatafeeder.rpc.proto.OptionGreeks"),
    (4, "marketOHLC", ".com.upstox.marketdatafeeder.rpc.proto.MarketOHLC"),
    (5, "eFeedDetails", ".com.upstox.marketdatafeeder.rpc.proto.ExtendedFeedDetails"),
]:
    _f = _msg_mff.field.add()
    _f.name = _name; _f.number = _num; _f.type = descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE; _f.type_name = _tname

# IndexFullFeed
_msg_iff = _file_proto.message_type.add()
_msg_iff.name = "IndexFullFeed"
for _num, _name, _tname in [
    (1, "ltpc", ".com.upstox.marketdatafeeder.rpc.proto.LTPC"),
    (2, "marketOHLC", ".com.upstox.marketdatafeeder.rpc.proto.MarketOHLC"),
    (3, "eFeedDetails", ".com.upstox.marketdatafeeder.rpc.proto.ExtendedFeedDetails"),
]:
    _f = _msg_iff.field.add()
    _f.name = _name; _f.number = _num; _f.type = descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE; _f.type_name = _tname

# FullFeed
_msg_ff = _file_proto.message_type.add()
_msg_ff.name = "FullFeed"
_oneof_ff = _msg_ff.oneof_decl.add(); _oneof_ff.name = "FullFeedUnion"
_f1 = _msg_ff.field.add(); _f1.name = "marketFF"; _f1.number = 1; _f1.type = descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE; _f1.type_name = ".com.upstox.marketdatafeeder.rpc.proto.MarketFullFeed"; _f1.oneof_index = 0
_f2 = _msg_ff.field.add(); _f2.name = "indexFF"; _f2.number = 2; _f2.type = descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE; _f2.type_name = ".com.upstox.marketdatafeeder.rpc.proto.IndexFullFeed"; _f2.oneof_index = 0

# Feed
_msg_feed = _file_proto.message_type.add()
_msg_feed.name = "Feed"
_oneof_feed = _msg_feed.oneof_decl.add(); _oneof_feed.name = "FeedUnion"
_f1 = _msg_feed.field.add(); _f1.name = "ltpc"; _f1.number = 1; _f1.type = descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE; _f1.type_name = ".com.upstox.marketdatafeeder.rpc.proto.LTPC"; _f1.oneof_index = 0
_f2 = _msg_feed.field.add(); _f2.name = "fullFeed"; _f2.number = 2; _f2.type = descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE; _f2.type_name = ".com.upstox.marketdatafeeder.rpc.proto.FullFeed"; _f2.oneof_index = 0

# FeedResponse
_msg_resp = _file_proto.message_type.add()
_msg_resp.name = "FeedResponse"

_msg_map = _msg_resp.nested_type.add()
_msg_map.name = "FeedsEntry"
_msg_map.options.map_entry = True
_k = _msg_map.field.add(); _k.name = "key"; _k.number = 1; _k.type = descriptor_pb2.FieldDescriptorProto.TYPE_STRING
_v = _msg_map.field.add(); _v.name = "value"; _v.number = 2; _v.type = descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE; _v.type_name = ".com.upstox.marketdatafeeder.rpc.proto.Feed"

_f_type = _msg_resp.field.add(); _f_type.name = "type"; _f_type.number = 1; _f_type.type = descriptor_pb2.FieldDescriptorProto.TYPE_ENUM; _f_type.type_name = ".com.upstox.marketdatafeeder.rpc.proto.Type"
_f_feeds = _msg_resp.field.add(); _f_feeds.name = "feeds"; _f_feeds.number = 2; _f_feeds.type = descriptor_pb2.FieldDescriptorProto.TYPE_MESSAGE; _f_feeds.type_name = ".com.upstox.marketdatafeeder.rpc.proto.FeedResponse.FeedsEntry"; _f_feeds.label = descriptor_pb2.FieldDescriptorProto.LABEL_REPEATED
_f_ts = _msg_resp.field.add(); _f_ts.name = "currentTs"; _f_ts.number = 3; _f_ts.type = descriptor_pb2.FieldDescriptorProto.TYPE_INT64

_pool = descriptor_pool.DescriptorPool()
_file_desc = _pool.Add(_file_proto)

# Generated Message Classes
FeedResponse = message_factory.GetMessageClass(_file_desc.message_types_by_name["FeedResponse"])
Feed = message_factory.GetMessageClass(_file_desc.message_types_by_name["Feed"])
LTPC = message_factory.GetMessageClass(_file_desc.message_types_by_name["LTPC"])
FullFeed = message_factory.GetMessageClass(_file_desc.message_types_by_name["FullFeed"])
MarketFullFeed = message_factory.GetMessageClass(_file_desc.message_types_by_name["MarketFullFeed"])
IndexFullFeed = message_factory.GetMessageClass(_file_desc.message_types_by_name["IndexFullFeed"])


def decode_market_data_feed(binary_data: bytes) -> Optional[Dict[str, Any]]:
    """
    Decodes real Upstox V3 binary Protobuf frame into structured Python dictionary.
    Returns:
    {
        "type": "initial_feed" | "live_feed",
        "current_ts": 1724938123456,
        "feeds": {
            "NSE_INDEX|Nifty 50": {
                "ltp": 24500.5,
                "ltt": 1724938120000,
                "cp": 24400.0,
                "open": 24420.0,
                "high": 24550.0,
                "low": 24380.0,
                "close": 24400.0,
                "volume": 1250000,
                "oi": 0.0,
                ...
            },
            ...
        }
    }
    """
# Decoder Metrics Tracking
_decoder_metrics = {
    "decode_success": 0,
    "decode_errors": 0,
    "total_bytes_processed": 0,
    "last_error": None,
    "last_error_time": None,
}


def get_decoder_metrics() -> Dict[str, Any]:
    """Returns current Protobuf decoder performance and error telemetry."""
    return dict(_decoder_metrics)


def reset_decoder_metrics() -> None:
    """Resets decoder telemetry counters."""
    _decoder_metrics["decode_success"] = 0
    _decoder_metrics["decode_errors"] = 0
    _decoder_metrics["total_bytes_processed"] = 0
    _decoder_metrics["last_error"] = None
    _decoder_metrics["last_error_time"] = None


def decode_market_data_feed(binary_data: bytes) -> Optional[Dict[str, Any]]:
    """
    Decodes a binary Protobuf buffer into a structured dictionary.
    
    STRICT TRUTH-IN-DATA:
    - Missing fields are strictly set to None, never defaulted to 0.0.
    - Decodes LTPC, OHLC, full 5-level MarketDepth, ExtendedFeedDetails, and OptionGreeks.
    """
    global _decoder_metrics
    if not binary_data:
        return None

    try:
        resp = FeedResponse()
        resp.ParseFromString(binary_data)

        _decoder_metrics["decode_success"] += 1
        _decoder_metrics["total_bytes_processed"] += len(binary_data)

        feed_type = "live_feed" if resp.type == 1 else "initial_feed"
        result: Dict[str, Any] = {
            "type": feed_type,
            "current_ts": resp.currentTs if resp.currentTs else None,
            "feeds": {},
        }

        for ik, feed_item in resp.feeds.items():
            parsed_feed: Dict[str, Any] = {
                "instrument_key": ik,
                "ltp": None,
                "ltt": None,
                "ltq": None,
                "cp": None,
                "open": None,
                "high": None,
                "low": None,
                "close": None,
                "volume": None,
                "oi": None,
                "bid": None,
                "ask": None,
                "bid_size": None,
                "ask_size": None,
                "depth": None,
                "option_greeks": None,
            }

            feed_union = feed_item.WhichOneof("FeedUnion")
            if feed_union == "ltpc":
                ltpc = feed_item.ltpc
                parsed_feed["ltp"] = float(ltpc.ltp) if ltpc.ltp else None
                parsed_feed["ltt"] = int(ltpc.ltt) if ltpc.ltt else None
                parsed_feed["ltq"] = int(ltpc.ltq) if ltpc.ltq else None
                parsed_feed["cp"] = float(ltpc.cp) if ltpc.cp else None
                parsed_feed["close"] = float(ltpc.cp) if ltpc.cp else None

            elif feed_union == "fullFeed":
                ff = feed_item.fullFeed
                ff_union = ff.WhichOneof("FullFeedUnion")

                if ff_union == "marketFF":
                    mff = ff.marketFF
                    if mff.HasField("ltpc"):
                        parsed_feed["ltp"] = float(mff.ltpc.ltp) if mff.ltpc.ltp else None
                        parsed_feed["ltt"] = int(mff.ltpc.ltt) if mff.ltpc.ltt else None
                        parsed_feed["ltq"] = int(mff.ltpc.ltq) if mff.ltpc.ltq else None
                        parsed_feed["cp"] = float(mff.ltpc.cp) if mff.ltpc.cp else None
                        parsed_feed["close"] = float(mff.ltpc.cp) if mff.ltpc.cp else None

                    if mff.HasField("marketOHLC") and mff.marketOHLC.ohlc:
                        c_ohlc = mff.marketOHLC.ohlc[0]
                        parsed_feed["open"] = float(c_ohlc.open) if c_ohlc.open else None
                        parsed_feed["high"] = float(c_ohlc.high) if c_ohlc.high else None
                        parsed_feed["low"] = float(c_ohlc.low) if c_ohlc.low else None
                        parsed_feed["close"] = float(c_ohlc.close) if c_ohlc.close else parsed_feed["cp"]
                        parsed_feed["volume"] = int(c_ohlc.volume) if c_ohlc.volume else None

                    if mff.HasField("marketLevel") and mff.marketLevel.bidAskQuote:
                        bids = []
                        asks = []
                        for q in mff.marketLevel.bidAskQuote:
                            if q.bp > 0:
                                bids.append({"price": float(q.bp), "quantity": int(q.bq), "orders": int(q.bno)})
                            if q.ap > 0:
                                asks.append({"price": float(q.ap), "quantity": int(q.aq), "orders": int(q.ano)})
                        
                        if bids:
                            parsed_feed["bid"] = bids[0]["price"]
                            parsed_feed["bid_size"] = bids[0]["quantity"]
                        if asks:
                            parsed_feed["ask"] = asks[0]["price"]
                            parsed_feed["ask_size"] = asks[0]["quantity"]
                        
                        parsed_feed["depth"] = {"bids": bids, "asks": asks}

                    if mff.HasField("optionGreeks"):
                        og = mff.optionGreeks
                        parsed_feed["option_greeks"] = {
                            "iv": float(og.iv) if og.iv else None,
                            "delta": float(og.delta) if og.delta else None,
                            "theta": float(og.theta) if og.theta else None,
                            "gamma": float(og.gamma) if og.gamma else None,
                            "vega": float(og.vega) if og.vega else None,
                            "rho": float(og.rho) if og.rho else None,
                            "option_price": float(og.op) if og.op else None,
                            "underlying_price": float(og.up) if og.up else None,
                        }

                    if mff.HasField("eFeedDetails"):
                        ef = mff.eFeedDetails
                        if ef.oi:
                            parsed_feed["oi"] = float(ef.oi)
                        if ef.v:
                            parsed_feed["volume"] = int(ef.v)
                        if ef.close:
                            parsed_feed["close"] = float(ef.close)

                elif ff_union == "indexFF":
                    iff = ff.indexFF
                    if iff.HasField("ltpc"):
                        parsed_feed["ltp"] = float(iff.ltpc.ltp) if iff.ltpc.ltp else None
                        parsed_feed["ltt"] = int(iff.ltpc.ltt) if iff.ltpc.ltt else None
                        parsed_feed["cp"] = float(iff.ltpc.cp) if iff.ltpc.cp else None
                        parsed_feed["close"] = float(iff.ltpc.cp) if iff.ltpc.cp else None

                    if iff.HasField("marketOHLC") and iff.marketOHLC.ohlc:
                        c_ohlc = iff.marketOHLC.ohlc[0]
                        parsed_feed["open"] = float(c_ohlc.open) if c_ohlc.open else None
                        parsed_feed["high"] = float(c_ohlc.high) if c_ohlc.high else None
                        parsed_feed["low"] = float(c_ohlc.low) if c_ohlc.low else None
                        parsed_feed["close"] = float(c_ohlc.close) if c_ohlc.close else parsed_feed["cp"]

                    if iff.HasField("eFeedDetails"):
                        ef = iff.eFeedDetails
                        if ef.oi:
                            parsed_feed["oi"] = float(ef.oi)
                        if ef.close:
                            parsed_feed["close"] = float(ef.close)

            result["feeds"][ik] = parsed_feed

        return result

    except Exception as exc:
        _decoder_metrics["decode_errors"] += 1
        _decoder_metrics["last_error"] = str(exc)
        _decoder_metrics["last_error_time"] = datetime.now(timezone.utc).isoformat()
        logger.warning("Upstox Protobuf binary decode error: %s", exc)
        return None
