import asyncio
import json
import aiohttp


DELTA_URL = "https://api.india.delta.exchange/v2/tickers"


async def main():

    params = {
        "contract_types": "call_options,put_options",
        "underlying_asset_symbols": "BTC",
        "expiry_date": "12-09-2026",
    }

    timeout = aiohttp.ClientTimeout(total=15)

    async with aiohttp.ClientSession(timeout=timeout) as session:

        async with session.get(
            DELTA_URL,
            params=params,
            headers={"Accept": "application/json"},
        ) as response:

            print("HTTP STATUS:", response.status)

            response.raise_for_status()

            payload = await response.json()


    if not payload.get("success"):
        raise RuntimeError(payload)


    result = payload.get("result") or []

    calls = [
        item
        for item in result
        if item.get("contract_type") == "call_options"
    ]

    puts = [
        item
        for item in result
        if item.get("contract_type") == "put_options"
    ]


    print()
    print("====================================")
    print("DELTA OPTION CHAIN PYTHON TEST")
    print("====================================")

    print("Success   :", payload.get("success"))
    print("Contracts :", len(result))
    print("Calls     :", len(calls))
    print("Puts      :", len(puts))


    if result:

        spots = {
            float(item["spot_price"])
            for item in result
            if item.get("spot_price") is not None
        }

        print("Spot      :", spots)


    print()
    print("FIRST 10 CONTRACTS")


    for item in sorted(
        result,
        key=lambda x: float(x["strike_price"]),
    )[:10]:

        quotes = item.get("quotes") or {}

        print(
            item.get("symbol"),
            "|",
            item.get("strike_price"),
            "|",
            "mark:",
            item.get("mark_price"),
            "|",
            "bid:",
            quotes.get("best_bid"),
            "|",
            "ask:",
            quotes.get("best_ask"),
        )


if __name__ == "__main__":
    asyncio.run(main())
