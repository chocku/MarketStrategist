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
    try:
        return ticker, yf.Ticker(ticker).info.get('marketCap', None)
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
    all_tickers = TICKERS + [SPX]

    print(f"Downloading price history for {len(TICKERS)} stocks + SPX (this may take a few minutes)...")
    raw = yf.download(all_tickers, start=start, end=end, auto_adjust=True, progress=False)
    closes = raw['Close']

    last_date = str(closes.index[-1].date())
    spx_prices = closes[SPX].dropna()
    spx_12m = float((spx_prices.iloc[-1] / spx_prices.iloc[0] - 1) * 100)
    print(f"SPX 12m return: {spx_12m:.1f}%  |  Last date: {last_date}")

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

            # YTD return — first trading day of current year
            ytd_prices = prices[prices.index.year == current_year]
            ret_ytd = float((price / float(ytd_prices.iloc[0]) - 1) * 100) if len(ytd_prices) > 0 else 0.0

            # 52-week high / low from last 252 trading days
            prices_252 = prices.iloc[-252:]
            high52 = float(prices_252.max())
            low52  = float(prices_252.min())
            new_high = bool(price >= high52 * 0.98)   # within 2% of 52w high
            new_low  = bool(price <= low52  * 1.02)   # within 2% of 52w low

            r12m = ret(252)
            meta = sp500_info.get(ticker, {})

            results.append({
                "ticker":    ticker,
                "price":     round(price, 2),
                "ma50":      round(ma50, 2),
                "ma200":     round(ma200, 2),
                "above50":   price > ma50,
                "above200":  price > ma200,
                "return1m":  round(ret(21), 2),
                "return3m":  round(ret(63), 2),
                "returnYtd": round(ret_ytd, 2),
                "return12m": round(r12m, 2),
                "high52":    round(high52, 2),
                "low52":     round(low52, 2),
                "newHigh":   new_high,
                "newLow":    new_low,
                "sector":    meta.get('sector', 'Unknown'),
                "industry":  meta.get('industry', 'Unknown'),
                "marketCap": mcap_map.get(ticker),
                "rs_raw":    round(r12m - spx_12m, 2)
            })
            status = "OK" if price > ma50 and price > ma200 else "~" if price > ma50 or price > ma200 else "X"
            print(f"  {status} {ticker}: ${price:.2f} | 50MA:{ma50:.0f} | 200MA:{ma200:.0f} | YTD:{ret_ytd:.1f}% | Sector:{meta.get('sector','?')}")
        except Exception as e:
            print(f"  ERROR {ticker}: {e}")

    # Normalize RS score to 1-100
    raw_scores = [r['rs_raw'] for r in results]
    mn, mx = min(raw_scores), max(raw_scores)
    for r in results:
        r['rsScore'] = int(round(1 + 99 * (r['rs_raw'] - mn) / (mx - mn))) if mx != mn else 50
        del r['rs_raw']

    above50   = sum(1 for s in results if s['above50'])
    above200  = sum(1 for s in results if s['above200'])
    both      = sum(1 for s in results if s['above50'] and s['above200'])
    new_highs = sum(1 for s in results if s['newHigh'])
    new_lows  = sum(1 for s in results if s['newLow'])

    output = {
        "asOf":          last_date,
        "spxReturn12m":  round(spx_12m, 2),
        "newHighCount":  new_highs,
        "newLowCount":   new_lows,
        "stocks":        results
    }

    with open('data.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"\nSaved data.json -- {len(results)} stocks")
    print(f"  Above 50-MA:    {above50}/{len(results)} ({above50/len(results)*100:.0f}%)")
    print(f"  Above 200-MA:   {above200}/{len(results)} ({above200/len(results)*100:.0f}%)")
    print(f"  Above both:     {both}/{len(results)} ({both/len(results)*100:.0f}%)")
    print(f"  New 52W Highs:  {new_highs}  |  New 52W Lows: {new_lows}")

if __name__ == '__main__':
    fetch()
