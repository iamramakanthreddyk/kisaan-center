#!/usr/bin/env python3
import requests
import json

BASE_URL = "http://localhost:8000/api"

# Login
print("1. Logging in...")
login_resp = requests.post(f"{BASE_URL}/auth/login", json={
    "username": "ramakanthreddy_0_107",
    "password": "reddy@123"
})
print(f"   Status: {login_resp.status_code}")
token = login_resp.json()["data"]["token"]
print(f"   Token: {token[:20]}...")

headers = {"Authorization": f"Bearer {token}"}

# Create transaction
print("\n2. Creating transaction...")
txn_resp = requests.post(f"{BASE_URL}/transactions/create", json={
    "shop_id": 1,
    "farmer_id": 61,
    "buyer_id": 62,
    "product_name": "TestProduct",
    "category_id": 1,
    "quantity": 5,
    "unit_price": 200
}, headers=headers)
print(f"   Status: {txn_resp.status_code}")
txn = txn_resp.json()["data"]
print(f"   Transaction ID: {txn['id']}")
print(f"   Total Amount: ₹{txn['total_amount']}")
print(f"   Farmer Earning: ₹{txn['farmer_earning']}")

# Get farmer balance
print("\n3. Checking farmer balance...")
balance_resp = requests.get(f"{BASE_URL}/balances/user/61", headers=headers)
print(f"   Status: {balance_resp.status_code}")
farmer_balance = balance_resp.json()["data"]["current_balance"]
print(f"   Farmer Balance: ₹{farmer_balance}")

# Get buyer balance
print("\n4. Checking buyer balance...")
balance_resp = requests.get(f"{BASE_URL}/balances/user/62", headers=headers)
print(f"   Status: {balance_resp.status_code}")
buyer_balance = balance_resp.json()["data"]["current_balance"]
print(f"   Buyer Balance: ₹{buyer_balance}")

# Check if ledger is working
print("\n✅ TEST RESULT:")
if farmer_balance > 0 and buyer_balance < 0:
    print("   ✓ LEDGER SYSTEM WORKING!")
    print(f"   Farmer balance increased: {farmer_balance}")
    print(f"   Buyer balance decreased: {buyer_balance}")
else:
    print("   ❌ LEDGER NOT WORKING")
    print(f"   Expected: farmer > 0, buyer < 0")
    print(f"   Got: farmer = {farmer_balance}, buyer = {buyer_balance}")
