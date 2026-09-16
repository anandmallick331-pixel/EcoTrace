import urllib.request
import urllib.error
import socket
import json
import hashlib
import datetime
import ssl

print("--- RUNTIME ENVIRONMENT PROBE ---")
hostname = socket.gethostname()
print(f"Hostname: {hostname}")

public_ip = "Unknown"
try:
    with urllib.request.urlopen("https://api.ipify.org?format=json", timeout=10) as resp:
        ip_data = json.loads(resp.read().decode())
        public_ip = ip_data.get("ip", "Unknown")
        print(f"Public Outbound IPv4: {public_ip}")
except Exception as e:
    print(f"Public IP lookup error: {e}")

print("\n--- OFFICIAL IMD ENDPOINT TEST ---")
url = "https://mausam.imd.gov.in/api/current_wx_api.php?id=43053"
headers = {
    "User-Agent": "EcoTrace/1.0 (India Meteorological Ingestion Client)",
    "Accept": "application/json, text/plain, */*",
}
req = urllib.request.Request(url, headers=headers)
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

req_time_utc = datetime.datetime.now(datetime.timezone.utc).isoformat()
print(f"Request Time UTC: {req_time_utc}")
print(f"Target URL: {url}")

try:
    with urllib.request.urlopen(req, context=ctx, timeout=15) as response:
        status = response.status
        content_type = response.headers.get("Content-Type")
        raw_bytes = response.read()
        sha256 = hashlib.sha256(raw_bytes).hexdigest()
        print(f"HTTP Status: {status}")
        print(f"Content-Type: {content_type}")
        print(f"SHA-256: {sha256}")
        print(f"Body Length: {len(raw_bytes)} bytes")
        print(f"Raw Body:\n{raw_bytes.decode('utf-8', errors='replace')}")
except urllib.error.HTTPError as e:
    raw_bytes = e.read()
    sha256 = hashlib.sha256(raw_bytes).hexdigest()
    print(f"HTTP Status: {e.code} ({e.reason})")
    print(f"Content-Type: {e.headers.get('Content-Type')}")
    print(f"SHA-256: {sha256}")
    print(f"Body Length: {len(raw_bytes)} bytes")
    print(f"Raw Body:\n{raw_bytes.decode('utf-8', errors='replace')}")
except Exception as e:
    print(f"Network / Error: {e}")
