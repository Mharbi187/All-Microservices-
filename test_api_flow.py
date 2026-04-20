import requests
import json
import time

BASE_URL = "http://localhost:8080/api/v1"

def print_result(step, response):
    print(f"\n--- {step} ---")
    print(f"Status Code: {response.status_code}")
    try:
        print(f"Response: {json.dumps(response.json(), indent=2)}")
    except:
        print(f"Response (text): {response.text}")

def test_full_flow():
    print("Testing Full Core Service API Flow...")
    
    # --- 1. INVALID REGISTRATION (Validation test) ---
    invalid_payload = {
        "email": "invalid@example.com",
        "password": "pass",
        "fullName": "Invalid User",
        "userType": "VOLUNTEER"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=invalid_payload)
    print_result("1. Invalid Registration (Missing CIN)", resp)

    # --- 2. ADMIN REGISTRATION ---
    admin_payload = {
        "email": f"admin_{int(time.time())}@nexus.test",
        "password": "adminpassword",
        "fullName": "National President",
        "cin": f"A{int(time.time())}",
        "phone": "99999999",
        "userType": "ADMIN"
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=admin_payload)
    print_result("2. Admin Registration", resp)
    admin_token = resp.json().get("token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # --- 3. CREATE COMMITTEE ---
    committee_payload = {
        "name": f"Local Committee {int(time.time())}",
        "type": "LOCAL",
        "region": "Tunis"
    }
    resp = requests.post(f"{BASE_URL}/management/committees", json=committee_payload, headers=admin_headers)
    print_result("3. Create Committee", resp)
    committee_id = resp.json().get("id")

    # --- 4. VOLUNTEER REGISTRATION ---
    vol_email = f"vol_{int(time.time())}@nexus.test"
    vol_pass = "volpassword"
    volunteer_payload = {
        "email": vol_email,
        "password": vol_pass,
        "fullName": "New Volunteer",
        "cin": f"V{int(time.time())}",
        "phone": "22222222",
        "userType": "VOLUNTEER",
        "committeeId": committee_id,
        "matricule": "MAT123",
        "skills": ["First Aid"]
    }
    resp = requests.post(f"{BASE_URL}/auth/register", json=volunteer_payload)
    print_result("4. Volunteer Registration (Status PENDING Expected)", resp)
    volunteer_id = resp.json().get("id")

    # --- 5. VOLUNTEER UNAUTHORIZED LOGIN ---
    login_payload = {"email": vol_email, "password": vol_pass}
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    print_result("5. Volunteer Login attempt while PENDING (Should Fail)", resp)

    # --- 6. ADMIN APPROVES VOLUNTEER ---
    # Expected endpoint: PUT /api/v1/profiles/volunteers/{id}/approve
    resp = requests.put(f"{BASE_URL}/profiles/volunteers/{volunteer_id}/approve", headers=admin_headers)
    print_result("6. Admin Approves Volunteer", resp)

    # --- 7. VOLUNTEER AUTHORIZED LOGIN ---
    resp = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    print_result("7. Volunteer Login attempt while APPROVED (Should Succeed)", resp)
    
    vol_token = resp.json().get("token", None)
    vol_headers = {"Authorization": f"Bearer {vol_token}"} if vol_token else None

    # --- 8. CREATE INVENTORY ITEM ---
    inventory_payload = {
        "name": "Medical Kit",
        "categoryId": None, 
        "currentQuantity": 50,
        "minQuantity": 10,
        "maxQuantity": 100
    }
    resp = requests.post(f"{BASE_URL}/inventory", json=inventory_payload, headers=admin_headers)
    print_result("8. Admin Create Inventory Item", resp)

    if resp.status_code == 200 or resp.status_code == 201:
        item_id = resp.json().get("id")
        
        # --- 9. STOCK MOVEMENT ---
        # Expected endpoint: POST /api/v1/inventory/{itemId}/movement/out
        movement_payload = {
            "quantity": 5,
            "reason": "Distribution"
        }
        resp = requests.post(f"{BASE_URL}/inventory/{item_id}/movement/out", json=movement_payload, headers=admin_headers)
        print_result("9. Process Stock Movement", resp)

if __name__ == "__main__":
    test_full_flow()
