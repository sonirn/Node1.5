from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from pymongo import MongoClient
from typing import Optional, List
from datetime import datetime, timedelta
import os
import hashlib
import uuid
import jwt
import random
import json

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-here')
TRX_RECEIVE_ADDRESS = "TFNHcYdhEq5sgjaWPdR1Gnxgzu3RUKncwu"

# MongoDB connection
client = MongoClient(MONGO_URL)
db = client.trx_mining_db

# Collections
users_collection = db.users
nodes_collection = db.nodes
transactions_collection = db.transactions
referrals_collection = db.referrals

# FastAPI app
app = FastAPI(title="TRX Mining Node API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

# Node configurations
NODE_CONFIGS = {
    "node1": {
        "name": "64 GB Node",
        "price": 50,
        "mining_amount": 500,
        "duration_days": 30,
        "gb": 64
    },
    "node2": {
        "name": "128 GB Node", 
        "price": 75,
        "mining_amount": 500,
        "duration_days": 15,
        "gb": 128
    },
    "node3": {
        "name": "256 GB Node",
        "price": 100,
        "mining_amount": 1000,
        "duration_days": 7,
        "gb": 256
    },
    "node4": {
        "name": "1024 GB Node",
        "price": 250,
        "mining_amount": 1000,
        "duration_days": 3,
        "gb": 1024
    }
}

# Pydantic models
class UserSignup(BaseModel):
    username: str
    password: str
    refer_code: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class NodePurchase(BaseModel):
    node_id: str
    transaction_hash: str

class WithdrawRequest(BaseModel):
    balance_type: str  # "mine" or "referral"
    amount: float

class MockWithdrawal(BaseModel):
    amount: float
    timestamp: datetime

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_refer_code() -> str:
    return str(uuid.uuid4())[:8].upper()

def create_jwt_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_jwt_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    return verify_jwt_token(credentials.credentials)

def mock_verify_trx_transaction(tx_hash: str, expected_amount: float) -> bool:
    # Mock TRX transaction verification
    # In real implementation, this would check the Tron blockchain
    return len(tx_hash) > 10  # Simple mock validation

def calculate_mining_progress(node):
    """Calculate mining progress based on purchase time"""
    if not node.get("active", False):
        return 0
    
    purchase_time = node["purchase_time"]
    now = datetime.utcnow()
    duration = timedelta(days=node["duration_days"])
    
    if now >= purchase_time + duration:
        return 100
    
    elapsed = now - purchase_time
    progress = (elapsed.total_seconds() / duration.total_seconds()) * 100
    return min(progress, 100)

# API Routes
@app.post("/api/auth/signup")
async def signup(user_data: UserSignup):
    # Check if username already exists
    if users_collection.find_one({"username": user_data.username}):
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Validate referral code if provided
    referrer_id = None
    if user_data.refer_code:
        referrer = users_collection.find_one({"refer_code": user_data.refer_code})
        if not referrer:
            raise HTTPException(status_code=400, detail="Invalid referral code")
        referrer_id = referrer["_id"]
    
    # Create user
    user_id = str(uuid.uuid4())
    refer_code = generate_refer_code()
    
    user = {
        "_id": user_id,
        "username": user_data.username,
        "password": hash_password(user_data.password),
        "refer_code": refer_code,
        "mine_balance": 25.0,  # Sign up bonus
        "referral_balance": 0.0,
        "has_purchased_node": False,
        "has_purchased_node4": False,
        "created_at": datetime.utcnow()
    }
    
    users_collection.insert_one(user)
    
    # Track referral if exists
    if referrer_id:
        referrals_collection.insert_one({
            "_id": str(uuid.uuid4()),
            "referrer_id": referrer_id,
            "referred_user_id": user_id,
            "is_valid": False,  # Becomes valid when referred user buys a node
            "created_at": datetime.utcnow()
        })
    
    token = create_jwt_token(user_id)
    
    return {
        "success": True,
        "message": "Sign up successful! Claim your 25 TRX bonus!",
        "token": token,
        "user": {
            "id": user_id,
            "username": user_data.username,
            "refer_code": refer_code,
            "mine_balance": 25.0,
            "referral_balance": 0.0
        }
    }

@app.post("/api/auth/login")
async def login(user_data: UserLogin):
    user = users_collection.find_one({
        "username": user_data.username,
        "password": hash_password(user_data.password)
    })
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["_id"])
    
    return {
        "success": True,
        "token": token,
        "user": {
            "id": user["_id"],
            "username": user["username"],
            "refer_code": user["refer_code"],
            "mine_balance": user["mine_balance"],
            "referral_balance": user["referral_balance"]
        }
    }

@app.get("/api/user/profile")
async def get_profile(current_user: str = Depends(get_current_user)):
    user = users_collection.find_one({"_id": current_user})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's nodes
    user_nodes = list(nodes_collection.find({"user_id": current_user}))
    
    # Update mining progress and balances
    for node in user_nodes:
        if node.get("active", False):
            progress = calculate_mining_progress(node)
            if progress >= 100 and not node.get("completed", False):
                # Mining completed, add to balance
                users_collection.update_one(
                    {"_id": current_user},
                    {"$inc": {"mine_balance": node["mining_amount"]}}
                )
                nodes_collection.update_one(
                    {"_id": node["_id"]},
                    {"$set": {"completed": True, "active": False}}
                )
                user["mine_balance"] += node["mining_amount"]
    
    return {
        "user": {
            "id": user["_id"],
            "username": user["username"],
            "refer_code": user["refer_code"],
            "mine_balance": user["mine_balance"],
            "referral_balance": user["referral_balance"],
            "has_purchased_node": user.get("has_purchased_node", False),
            "has_purchased_node4": user.get("has_purchased_node4", False)
        }
    }

@app.get("/api/nodes")
async def get_nodes(current_user: str = Depends(get_current_user)):
    user_nodes = list(nodes_collection.find({"user_id": current_user}))
    
    nodes_status = {}
    for node_id, config in NODE_CONFIGS.items():
        user_node = next((n for n in user_nodes if n["node_id"] == node_id and n.get("active", False)), None)
        
        if user_node:
            progress = calculate_mining_progress(user_node)
            can_rebuy = progress >= 100
            
            nodes_status[node_id] = {
                "config": config,
                "owned": True,
                "active": user_node.get("active", False),
                "progress": progress,
                "can_rebuy": can_rebuy,
                "purchase_time": user_node.get("purchase_time").isoformat() if user_node.get("purchase_time") else None
            }
        else:
            nodes_status[node_id] = {
                "config": config,
                "owned": False,
                "active": False,
                "progress": 0,
                "can_rebuy": True,
                "purchase_time": None
            }
    
    return {"nodes": nodes_status}

@app.post("/api/nodes/purchase")
async def purchase_node(purchase_data: NodePurchase, current_user: str = Depends(get_current_user)):
    if purchase_data.node_id not in NODE_CONFIGS:
        raise HTTPException(status_code=400, detail="Invalid node ID")
    
    config = NODE_CONFIGS[purchase_data.node_id]
    
    # Check if user already owns this active node
    existing_node = nodes_collection.find_one({
        "user_id": current_user,
        "node_id": purchase_data.node_id,
        "active": True
    })
    
    if existing_node:
        raise HTTPException(status_code=400, detail="You already own this active node")
    
    # Mock TRX transaction verification
    if not mock_verify_trx_transaction(purchase_data.transaction_hash, config["price"]):
        raise HTTPException(status_code=400, detail="Invalid transaction or amount mismatch")
    
    # Create node purchase record
    node_id = str(uuid.uuid4())
    node = {
        "_id": node_id,
        "user_id": current_user,
        "node_id": purchase_data.node_id,
        "node_name": config["name"],
        "price": config["price"],
        "mining_amount": config["mining_amount"],
        "duration_days": config["duration_days"],
        "purchase_time": datetime.utcnow(),
        "active": True,
        "completed": False,
        "transaction_hash": purchase_data.transaction_hash
    }
    
    nodes_collection.insert_one(node)
    
    # Check if this is user's first purchase BEFORE updating status
    user = users_collection.find_one({"_id": current_user})
    is_first_purchase = not user.get("has_purchased_node", False)
    
    # Update user status
    update_data = {"has_purchased_node": True}
    if purchase_data.node_id == "node4":
        update_data["has_purchased_node4"] = True
    
    users_collection.update_one(
        {"_id": current_user},
        {"$set": update_data}
    )
    
    # Validate referral if this is user's first purchase
    if is_first_purchase:
        referral = referrals_collection.find_one({"referred_user_id": current_user})
        if referral and not referral.get("is_valid", False):
            # Make referral valid and reward referrer
            referrals_collection.update_one(
                {"_id": referral["_id"]},
                {"$set": {"is_valid": True, "validated_at": datetime.utcnow()}}
            )
            
            users_collection.update_one(
                {"_id": referral["referrer_id"]},
                {"$inc": {"referral_balance": 50.0}}
            )
    
    return {
        "success": True,
        "message": f"Successfully purchased {config['name']}! Mining started.",
        "node": {
            "id": node_id,
            "name": config["name"],
            "mining_amount": config["mining_amount"],
            "duration_days": config["duration_days"]
        }
    }

@app.post("/api/withdraw")
async def withdraw(withdraw_data: WithdrawRequest, current_user: str = Depends(get_current_user)):
    user = users_collection.find_one({"_id": current_user})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if withdraw_data.balance_type == "mine":
        if withdraw_data.amount < 25:
            raise HTTPException(status_code=400, detail="Minimum withdrawal for mine balance is 25 TRX")
        
        if withdraw_data.amount > user["mine_balance"]:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # Check if user has purchased any node for first-time withdrawal
        if not user.get("has_purchased_node", False):
            raise HTTPException(status_code=400, detail="You must purchase any node first to withdraw from mine balance")
        
        # Process withdrawal
        users_collection.update_one(
            {"_id": current_user},
            {"$inc": {"mine_balance": -withdraw_data.amount}}
        )
        
    elif withdraw_data.balance_type == "referral":
        if withdraw_data.amount < 50:
            raise HTTPException(status_code=400, detail="Minimum withdrawal for referral balance is 50 TRX")
        
        if withdraw_data.amount > user["referral_balance"]:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # Check if user has purchased Node 4
        if not user.get("has_purchased_node4", False):
            raise HTTPException(status_code=400, detail="You must purchase Node 4 (1024 GB) to withdraw from referral balance")
        
        # Process withdrawal
        users_collection.update_one(
            {"_id": current_user},
            {"$inc": {"referral_balance": -withdraw_data.amount}}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Invalid balance type")
    
    # Record transaction
    transactions_collection.insert_one({
        "_id": str(uuid.uuid4()),
        "user_id": current_user,
        "type": "withdrawal",
        "balance_type": withdraw_data.balance_type,
        "amount": withdraw_data.amount,
        "timestamp": datetime.utcnow()
    })
    
    return {
        "success": True,
        "message": f"Successfully withdrew {withdraw_data.amount} TRX from {withdraw_data.balance_type} balance"
    }

@app.get("/api/referrals")
async def get_referrals(current_user: str = Depends(get_current_user)):
    user = users_collection.find_one({"_id": current_user})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all referrals
    referrals = list(referrals_collection.find({"referrer_id": current_user}))
    
    valid_referrals = []
    invalid_referrals = []
    
    for referral in referrals:
        referred_user = users_collection.find_one({"_id": referral["referred_user_id"]})
        if referred_user:
            referral_info = {
                "username": referred_user["username"],
                "joined_at": referral["created_at"].isoformat(),
                "is_valid": referral.get("is_valid", False)
            }
            
            if referral.get("is_valid", False):
                valid_referrals.append(referral_info)
            else:
                invalid_referrals.append(referral_info)
    
    return {
        "refer_code": user["refer_code"],
        "valid_referrals": valid_referrals,
        "invalid_referrals": invalid_referrals,
        "total_earned": len(valid_referrals) * 50
    }

@app.get("/api/mock-withdrawals")
async def get_mock_withdrawals():
    # Generate mock withdrawal data for homepage animation
    mock_withdrawals = []
    for _ in range(10):
        amount = random.randint(25, 10000)
        timestamp = datetime.utcnow() - timedelta(seconds=random.randint(0, 3600))
        mock_withdrawals.append({
            "amount": amount,
            "timestamp": timestamp.isoformat()
        })
    
    return {"withdrawals": mock_withdrawals}

@app.get("/api/config")
async def get_config():
    return {
        "trx_address": TRX_RECEIVE_ADDRESS,
        "nodes": NODE_CONFIGS
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)