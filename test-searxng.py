import urllib.request, json

req = urllib.request.Request('http://localhost:8080/search?q=test&format=json')
req.add_header('X-Forwarded-For', '127.0.0.1')
req.add_header('X-Real-IP', '127.0.0.1')
req.add_header('User-Agent', 'Mozilla/5.0')
try:
    resp = urllib.request.urlopen(req, timeout=10)
    data = json.loads(resp.read())
    print("Results:", len(data.get("results", [])))
    for r in data.get("results", [])[:3]:
        print(r.get("title", ""))
except Exception as e:
    print("Error:", e)
