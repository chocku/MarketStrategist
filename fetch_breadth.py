#!/usr/bin/env python3
"""
Market Breadth Data Fetcher
Run this locally: python3 fetch_breadth.py
Outputs data.json which the dashboard reads
"""

import yfinance as yf
import json
import pandas as pd
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

SPX = '^GSPC'
SPY = 'SPY'   # SPDR S&P 500 ETF — cap-weight benchmark (ETF, comparable to RSP)
RSP = 'RSP'   # Invesco S&P 500 Equal Weight ETF — equal-weight proxy

def get_sp500_info():
    import requests
    from io import StringIO
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'}
    resp = requests.get('https://en.wikipedia.org/wiki/List_of_S%26P_500_companies', headers=headers)
    resp.raise_for_status()
    table = pd.read_html(StringIO(resp.text))[0]
    info = {}
    for _, row in table.iterrows():
        ticker = str(row['Symbol']).replace('.', '-')
        info[ticker] = {
            'sector':   str(row['GICS Sector']),
            'industry': str(row['GICS Sub-Industry'])
        }
    return info

def fetch_mcap(ticker):
    """Return (ticker, market_cap) using sharesOutstanding × price.
    This correctly handles dual-class shares (GOOGL/GOOG, BRK-A/BRK-B):
    each class gets its own float, not the full company market cap."""
    try:
        info = yf.Ticker(ticker).info
        shares = info.get('sharesOutstanding') or info.get('impliedSharesOutstanding')
        price  = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
        if shares and price:
            return ticker, int(shares * price)
        # Fallback to reported marketCap (may double-count dual-class)
        return ticker, info.get('marketCap', None)
    except Exception:
        return ticker, None

def fetch():
    print("Fetching S&P 500 ticker list and sector data from Wikipedia...")
    sp500_info = get_sp500_info()
    TICKERS = list(sp500_info.keys())
    print(f"Found {len(TICKERS)} tickers.")

    end = datetime.today()
    start = end - timedelta(days=400)
    current_year = end.year
    all_tickers = TICKERS + [SPX, SPY, RSP]

    print(f"Downloading price history for {len(TICKERS)} stocks + SPX + SPY + RSP (this may take a few minutes)...")
    raw = yf.download(all_tickers, start=start, end=end, auto_adjust=True, progress=False)
    closes = raw['Close']

    last_date = str(closes.index[-1].date())
    spx_prices = closes[SPX].dropna()
    spx_1d  = float((spx_prices.iloc[-1] / spx_prices.iloc[-2]  - 1) * 100)
    spx_1w  = float((spx_prices.iloc[-1] / spx_prices.iloc[-5]  - 1) * 100)
    spx_1m  = float((spx_prices.iloc[-1] / spx_prices.iloc[-21] - 1) * 100)
    spx_ytd_prices = spx_prices[spx_prices.index.year == current_year]
    spx_ytd = float((spx_prices.iloc[-1] / spx_ytd_prices.iloc[0] - 1) * 100)
    spx_12m = float((spx_prices.iloc[-1] / spx_prices.iloc[0]  - 1) * 100)
    print(f"SPX: 1d {spx_1d:+.2f}%  1w {spx_1w:+.2f}%  1m {spx_1m:+.1f}%  YTD {spx_ytd:+.1f}%  12m {spx_12m:+.1f}%  |  {last_date}")

    # SPY — cap-weight ETF benchmark (used for RSP comparison; ETF vs ETF is apples-to-apples)
    spy_1d = spy_1w = spy_1m = spy_ytd = spy_12m = None
    spy_from_low = None
    # RSP + SPY chart series
    rsp_1d = rsp_1w = rsp_1m = rsp_ytd = rsp_12m = None
    rsp_from_low = None
    recent_low_date = None
    chart_dates = chart_spy = chart_rsp = None
    try:
        spy_prices = closes[SPY].dropna()
        spy_ytd_prices = spy_prices[spy_prices.index.year == current_year]
        spy_1d  = float((spy_prices.iloc[-1] / spy_prices.iloc[-2]  - 1) * 100)
        spy_1w  = float((spy_prices.iloc[-1] / spy_prices.iloc[-5]  - 1) * 100)
        spy_1m  = float((spy_prices.iloc[-1] / spy_prices.iloc[-21] - 1) * 100)
        spy_ytd = float((spy_prices.iloc[-1] / spy_ytd_prices.iloc[0] - 1) * 100)
        spy_12m = float((spy_prices.iloc[-1] / spy_prices.iloc[0]  - 1) * 100)
        print(f"SPY: 1d {spy_1d:+.2f}%  1w {spy_1w:+.2f}%  1m {spy_1m:+.1f}%  YTD {spy_ytd:+.1f}%  12m {spy_12m:+.1f}%")

        rsp_prices = closes[RSP].dropna()
        rsp_ytd_prices = rsp_prices[rsp_prices.index.year == current_year]
        rsp_1d  = float((rsp_prices.iloc[-1] / rsp_prices.iloc[-2]  - 1) * 100)
        rsp_1w  = float((rsp_prices.iloc[-1] / rsp_prices.iloc[-5]  - 1) * 100)
        rsp_1m  = float((rsp_prices.iloc[-1] / rsp_prices.iloc[-21] - 1) * 100)
        rsp_ytd = float((rsp_prices.iloc[-1] / rsp_ytd_prices.iloc[0] - 1) * 100)
        rsp_12m = float((rsp_prices.iloc[-1] / rsp_prices.iloc[0]  - 1) * 100)
        print(f"RSP: 1d {rsp_1d:+.2f}%  1w {rsp_1w:+.2f}%  1m {rsp_1m:+.1f}%  YTD {rsp_ytd:+.1f}%  12m {rsp_12m:+.1f}%")

        # Recent low — lowest SPY close in last 63 trading days (~3 months)
        spy_3m = spy_prices.iloc[-63:]
        low_ts  = spy_3m.idxmin()
        recent_low_date = str(low_ts.date())
        spy_from_low = float((spy_prices.iloc[-1] / spy_3m.min() - 1) * 100)
        rsp_from_low = float((rsp_prices.iloc[-1] / rsp_prices.loc[low_ts] - 1) * 100)
        print(f"Recent low: {recent_low_date}  SPY from low: {spy_from_low:+.1f}%  RSP from low: {rsp_from_low:+.1f}%")

        # YTD chart series — % return from first trading day of current year
        spy_ytd_chart = spy_prices[spy_prices.index.year == current_year]
        rsp_ytd_chart = rsp_prices.reindex(spy_ytd_chart.index).ffill()
        spy_base = float(spy_ytd_chart.iloc[0])
        rsp_base = float(rsp_ytd_chart.iloc[0])
        chart_dates = [str(d.date()) for d in spy_ytd_chart.index]
        chart_spy   = [round((float(p) / spy_base - 1) * 100, 2) for p in spy_ytd_chart.values]
        chart_rsp   = [round((float(p) / rsp_base - 1) * 100, 2) for p in rsp_ytd_chart.values]
    except Exception as e:
        print(f"  SPY/RSP fetch failed (non-critical): {e}")

    print(f"Fetching market caps for {len(TICKERS)} tickers (parallelized)...")
    mcap_map = {}
    with ThreadPoolExecutor(max_workers=20) as ex:
        futures = {ex.submit(fetch_mcap, t): t for t in TICKERS}
        done = 0
        for future in as_completed(futures):
            ticker, mcap = future.result()
            mcap_map[ticker] = mcap
            done += 1
            if done % 100 == 0:
                print(f"  Market caps: {done}/{len(TICKERS)}")
    print("  Market caps complete.")

    results = []
    for ticker in TICKERS:
        try:
            prices = closes[ticker].dropna()
            if len(prices) < 210:
                print(f"  {ticker}: skipped (only {len(prices)} rows)")
                continue

            price = float(prices.iloc[-1])
            ma50  = float(prices.iloc[-50:].mean())
            ma200 = float(prices.iloc[-200:].mean())

            def ret(n):
                return float((prices.iloc[-1] / prices.iloc[-n] - 1) * 100) if len(prices) >= n else 0.0

            ret_1d = float((prices.iloc[-1] / prices.iloc[-2]  - 1) * 100) if len(prices) >= 2  else 0.0
            ret_1w = float((prices.iloc[-1] / prices.iloc[-5]  - 1) * 100) if len(prices) >= 5  else 0.0

            # YTD return — first trading day of current year
            ytd_prices = prices[prices.index.year == current_year]
            ret_ytd = float((price / float(ytd_prices.iloc[0]) - 1) * 100) if len(ytd_prices) > 0 else 0.0

            # 52-week high / low from last 252 trading days
            prices_252 = prices.iloc[-252:]
            high52 = float(prices_252.max())
            low52  = float(prices_252.min())
            new_high = bool(price >= high52 * 0.98)   # within 2% of 52w high
            new_low  = bool(price <= low52  * 1.02)   # within 2% of 52w low

            # Return from recent market low (same anchor date as SPY from-low)
            # Use asof() so tickers with data gaps still get a value
            ret_from_low = None
            if low_ts is not None:
                try:
                    base = prices.asof(low_ts)
                    if pd.notna(base) and base > 0:
                        ret_from_low = round(float((price / float(base) - 1) * 100), 2)
                except Exception:
                    pass

            r12m = ret(252)
            meta = sp500_info.get(ticker, {})

            results.append({
                "ticker":     ticker,
                "price":      round(price, 2),
                "ma50":       round(ma50, 2),
                "ma200":      round(ma200, 2),
                "above50":    price > ma50,
                "above200":   price > ma200,
                "return1d":   round(ret_1d, 2),
                "return1w":   round(ret_1w, 2),
                "return1m":   round(ret(21), 2),
                "return3m":   round(ret(63), 2),
                "returnYtd":    round(ret_ytd, 2),
                "return12m":    round(r12m, 2),
                "returnFromLow": ret_from_low,
                "vsSpx1d":    round(ret_1d  - spx_1d,  2),
                "vsSpx1w":    round(ret_1w  - spx_1w,  2),
                "vsSpx1m":    round(ret(21) - spx_1m,  2),
                "vsSpxYtd":   round(ret_ytd - spx_ytd, 2),
                "vsSpx12m":   round(r12m    - spx_12m, 2),
                "high52":     round(high52, 2),
                "low52":      round(low52, 2),
                "newHigh":    new_high,
                "newLow":     new_low,
                "sector":     meta.get('sector', 'Unknown'),
                "industry":   meta.get('industry', 'Unknown'),
                "marketCap":  mcap_map.get(ticker),
            })
            status = "OK" if price > ma50 and price > ma200 else "~" if price > ma50 or price > ma200 else "X"
            print(f"  {status} {ticker}: ${price:.2f} | 50MA:{ma50:.0f} | 200MA:{ma200:.0f} | YTD:{ret_ytd:.1f}% | Sector:{meta.get('sector','?')}")
        except Exception as e:
            print(f"  ERROR {ticker}: {e}")

    above50   = sum(1 for s in results if s['above50'])
    above200  = sum(1 for s in results if s['above200'])
    both      = sum(1 for s in results if s['above50'] and s['above200'])
    new_highs = sum(1 for s in results if s['newHigh'])
    new_lows  = sum(1 for s in results if s['newLow'])

    output = {
        "asOf":          last_date,
        "spxReturn1d":   round(spx_1d, 2),
        "spxReturn1w":   round(spx_1w, 2),
        "spxReturn1m":   round(spx_1m, 2),
        "spxReturnYtd":  round(spx_ytd, 2),
        "spxReturn12m":  round(spx_12m, 2),
        "spyReturn1d":   round(spy_1d,  2) if spy_1d  is not None else None,
        "spyReturn1w":   round(spy_1w,  2) if spy_1w  is not None else None,
        "spyReturn1m":   round(spy_1m,  2) if spy_1m  is not None else None,
        "spyReturnYtd":  round(spy_ytd, 2) if spy_ytd is not None else None,
        "spyReturn12m":  round(spy_12m, 2) if spy_12m is not None else None,
        "rspReturn1d":   round(rsp_1d,  2) if rsp_1d  is not None else None,
        "rspReturn1w":   round(rsp_1w,  2) if rsp_1w  is not None else None,
        "rspReturn1m":   round(rsp_1m,  2) if rsp_1m  is not None else None,
        "rspReturnYtd":  round(rsp_ytd, 2) if rsp_ytd is not None else None,
        "rspReturn12m":  round(rsp_12m, 2) if rsp_12m is not None else None,
        "recentLowDate": recent_low_date,
        "spyFromLow":    round(spy_from_low, 2) if spy_from_low is not None else None,
        "rspFromLow":    round(rsp_from_low, 2) if rsp_from_low is not None else None,
        "chartDates":    chart_dates,
        "chartSpy":      chart_spy,
        "chartRsp":      chart_rsp,
        "newHighCount":  new_highs,
        "newLowCount":   new_lows,
        "stocks":        results
    }

    with open('data.json', 'w') as f:
        json.dump(output, f, indent=2)

    import os
    os.makedirs('history', exist_ok=True)
    hist_file = f"history/data_{output['asOf']}.json"
    with open(hist_file, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"  Archived snapshot → {hist_file}")

    print(f"\nSaved data.json -- {len(results)} stocks")
    print(f"  Above 50-MA:    {above50}/{len(results)} ({above50/len(results)*100:.0f}%)")
    print(f"  Above 200-MA:   {above200}/{len(results)} ({above200/len(results)*100:.0f}%)")
    print(f"  Above both:     {both}/{len(results)} ({both/len(results)*100:.0f}%)")
    print(f"  New 52W Highs:  {new_highs}  |  New 52W Lows: {new_lows}")

if __name__ == '__main__':
    fetch()
