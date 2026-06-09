import urllib.request
import json

url = 'http://localhost:8000/api/v1/crisis-room/crisis_disaster_tataouine_1780933861622_20260608_155115/participants'
payload = {
    'user_id': 'f4705c36-d732-4103-b46a-81d434337e00',
    'name': 'Youssef Gharbi',
    'role': 'coordinator',
    'agency': 'Comité Régional de Tunis',
    'email': 'vol.86533@crt.tn',
    'phone': '21650000000'
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode(),
    headers={'Content-Type': 'application/json'}
)

try:
    resp = urllib.request.urlopen(req)
    print("SUCCESS:", resp.read().decode())
except urllib.error.HTTPError as e:
    print("STATUS CODE:", e.code)
    print("RESPONSE BODY:", e.read().decode())
except Exception as e:
    print("OTHER ERROR:", e)
