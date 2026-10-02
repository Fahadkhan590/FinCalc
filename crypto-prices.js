// Vercel serverless function: GET /api/crypto-prices
// Replaces the old vercel.json rewrite to CoinGecko. The upstream URL is fixed
// (no user input is ever used to build it), responses are cached at the edge,
// and the endpoint always answers 200 so the browser never logs a network error.
// Optional env var: COINGECKO_DEMO_API_KEY (free "Demo" key from coingecko.com).

const FIATS =
  "usd,eur,gbp,pkr,inr,aed,cad,aud,jpy,cny,chf,nzd,sgd,hkd,krw,sar,try,zar,brl,mxn,pln,sek,nok,dkk,thb,myr,idr,php,bdt,twd";
const UPSTREAM =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=" +
  FIATS +
  "&include_24hr_change=true";

const MAX_STALE_MS = 5 * 60 * 1000; // never present prices older than 5 min as live
let lastGood = null; // { ts, body } kept per warm function instance

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const headers = {
      Accept: "application/json",
      "User-Agent": "FinCalcHub/1.0 (+https://www.fincalchub.xyz)",
    };
    if (process.env.COINGECKO_DEMO_API_KEY) {
      headers["x-cg-demo-api-key"] = process.env.COINGECKO_DEMO_API_KEY;
    }

    const upstream = await fetch(UPSTREAM, {
      headers,
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) throw new Error("upstream " + upstream.status);

    const data = await upstream.json();
    if (!data || !data.bitcoin) throw new Error("no data");

    lastGood = { ts: Date.now(), body: data };
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=60");
    return res.status(200).json(data);
  } catch (err) {
    // Upstream failed: serve a recent good copy, otherwise a 200 "unavailable" body.
    // index.html already treats a body without `bitcoin` as "use cached/fallback prices".
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=10");
    if (lastGood && Date.now() - lastGood.ts < MAX_STALE_MS) {
      return res.status(200).json(lastGood.body);
    }
    return res.status(200).json({ error: "unavailable" });
  }
};
