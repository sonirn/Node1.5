#!/usr/bin/env python3
"""
Additional comprehensive test for Node 4 and referral balance withdrawal
"""

import requests
import json
import random

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except:
        pass
    return "http://localhost:8001"

BASE_URL = get_backend_url()
API_URL = f"{BASE_URL}/api"

def generate_test_username():
    return f"node4user_{random.randint(10000, 99999)}"

def generate_test_password():
    return f"TestPass{random.randint(100, 999)}!"

print("🧪 Testing Node 4 Purchase and Referral Balance Withdrawal")
print(f"Backend URL: {API_URL}")

session = requests.Session()

# Create a user with referral balance
print("\n1. Creating user and setting up referral...")
username = generate_test_username()
password = generate_test_password()

signup_data = {
    "username": username,
    "password": password
}

response = session.post(f"{API_URL}/auth/signup", json=signup_data)
if response.status_code == 200:
    data = response.json()
    token = data['token']
    refer_code = data['user']['refer_code']
    print(f"✅ User created: {username}")
    print(f"✅ Refer code: {refer_code}")
else:
    print(f"❌ Failed to create user: {response.status_code}")
    exit(1)

# Create referred user
print("\n2. Creating referred user...")
referred_username = generate_test_username()
referred_password = generate_test_password()

referred_signup_data = {
    "username": referred_username,
    "password": referred_password,
    "refer_code": refer_code
}

response = session.post(f"{API_URL}/auth/signup", json=referred_signup_data)
if response.status_code == 200:
    referred_data = response.json()
    referred_token = referred_data['token']
    print(f"✅ Referred user created: {referred_username}")
else:
    print(f"❌ Failed to create referred user: {response.status_code}")
    exit(1)

# Make referred user purchase a node to validate referral
print("\n3. Referred user purchasing node to validate referral...")
referred_headers = {"Authorization": f"Bearer {referred_token}"}
purchase_data = {
    "node_id": "node1",
    "transaction_hash": "mock_tx_hash_for_referral_validation_12345678901234567890"
}

response = session.post(f"{API_URL}/nodes/purchase", json=purchase_data, headers=referred_headers)
if response.status_code == 200:
    print("✅ Referred user purchased node")
else:
    print(f"❌ Failed to purchase node: {response.status_code}")
    exit(1)

# Check if referrer got 50 TRX referral balance
print("\n4. Checking referrer's referral balance...")
headers = {"Authorization": f"Bearer {token}"}
response = session.get(f"{API_URL}/user/profile", headers=headers)
if response.status_code == 200:
    data = response.json()
    referral_balance = data['user']['referral_balance']
    print(f"✅ Referrer's referral balance: {referral_balance} TRX")
    
    if referral_balance >= 50:
        print("✅ Referral reward received correctly!")
    else:
        print("❌ Referral reward not received")
        exit(1)
else:
    print(f"❌ Failed to get profile: {response.status_code}")
    exit(1)

# Try to withdraw referral balance without Node 4 (should fail)
print("\n5. Trying to withdraw referral balance without Node 4...")
withdraw_data = {
    "balance_type": "referral",
    "amount": 50.0
}

response = session.post(f"{API_URL}/withdraw", json=withdraw_data, headers=headers)
if response.status_code == 400:
    print("✅ Correctly prevented referral withdrawal without Node 4")
else:
    print(f"❌ Should have prevented withdrawal: {response.status_code}")

# Purchase Node 4
print("\n6. Purchasing Node 4...")
node4_purchase_data = {
    "node_id": "node4",
    "transaction_hash": "mock_tx_hash_node4_purchase_12345678901234567890"
}

response = session.post(f"{API_URL}/nodes/purchase", json=node4_purchase_data, headers=headers)
if response.status_code == 200:
    data = response.json()
    print(f"✅ Successfully purchased {data['node']['name']}")
else:
    print(f"❌ Failed to purchase Node 4: {response.status_code}")
    exit(1)

# Check user profile shows Node 4 purchased
print("\n7. Verifying Node 4 purchase status...")
response = session.get(f"{API_URL}/user/profile", headers=headers)
if response.status_code == 200:
    data = response.json()
    has_node4 = data['user']['has_purchased_node4']
    print(f"✅ Has purchased Node 4: {has_node4}")
    
    if not has_node4:
        print("❌ Node 4 purchase not reflected in profile")
        exit(1)
else:
    print(f"❌ Failed to get profile: {response.status_code}")
    exit(1)

# Now try to withdraw referral balance (should succeed)
print("\n8. Withdrawing referral balance after Node 4 purchase...")
response = session.post(f"{API_URL}/withdraw", json=withdraw_data, headers=headers)
if response.status_code == 200:
    data = response.json()
    print(f"✅ Successfully withdrew referral balance: {data['message']}")
else:
    print(f"❌ Failed to withdraw referral balance: {response.status_code}")
    exit(1)

# Verify balance was deducted
print("\n9. Verifying balance was deducted...")
response = session.get(f"{API_URL}/user/profile", headers=headers)
if response.status_code == 200:
    data = response.json()
    new_referral_balance = data['user']['referral_balance']
    print(f"✅ New referral balance: {new_referral_balance} TRX")
    
    if new_referral_balance == 0:
        print("✅ Balance correctly deducted!")
    else:
        print(f"❌ Balance not deducted correctly, expected 0, got {new_referral_balance}")
else:
    print(f"❌ Failed to get profile: {response.status_code}")

print("\n🎉 All Node 4 and referral balance withdrawal tests passed!")