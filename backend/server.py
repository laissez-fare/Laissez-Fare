from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import uuid
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(MONGO_URL)
db = client.rideshare_db

# Pydantic models
class User(BaseModel):
    id: Optional[str] = None
    name: str
    phone: str
    email: str

class RideRequest(BaseModel):
    id: Optional[str] = None
    rider_id: str
    rider_name: str
    rider_phone: str
    origin: str
    destination: str
    initial_price: float
    current_price: Optional[float] = None
    status: str = "open"  # open, negotiating, agreed, completed
    created_at: Optional[datetime] = None
    agreed_driver_id: Optional[str] = None
    agreed_driver_name: Optional[str] = None

class Negotiation(BaseModel):
    id: Optional[str] = None
    ride_id: str
    from_user_id: str
    from_user_name: str
    to_user_id: str
    offer_amount: float
    message: Optional[str] = None
    timestamp: Optional[datetime] = None
    is_accepted: bool = False

class CreateRideRequest(BaseModel):
    rider_name: str
    rider_phone: str
    origin: str
    destination: str
    initial_price: float

class CreateNegotiation(BaseModel):
    ride_id: str
    driver_name: str
    driver_phone: str
    offer_amount: float
    message: Optional[str] = None

class CounterOffer(BaseModel):
    negotiation_id: str
    from_user_name: str
    from_user_phone: str
    offer_amount: float
    message: Optional[str] = None

# API Routes

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/rides")
async def create_ride(ride_data: CreateRideRequest):
    ride_id = str(uuid.uuid4())
    ride = {
        "id": ride_id,
        "rider_id": str(uuid.uuid4()),
        "rider_name": ride_data.rider_name,
        "rider_phone": ride_data.rider_phone,
        "origin": ride_data.origin,
        "destination": ride_data.destination,
        "initial_price": ride_data.initial_price,
        "current_price": ride_data.initial_price,
        "status": "open",
        "created_at": datetime.now(),
        "agreed_driver_id": None,
        "agreed_driver_name": None
    }
    
    await db.rides.insert_one(ride)
    return {"message": "Ride request created", "ride_id": ride_id, "ride": ride}

@app.get("/api/rides")
async def get_available_rides():
    rides = await db.rides.find({"status": {"$in": ["open", "negotiating"]}}).to_list(100)
    for ride in rides:
        ride["_id"] = str(ride["_id"])
    return {"rides": rides}

@app.get("/api/rides/{ride_id}")
async def get_ride(ride_id: str):
    ride = await db.rides.find_one({"id": ride_id})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    ride["_id"] = str(ride["_id"])
    return {"ride": ride}

@app.post("/api/negotiations")
async def create_negotiation(negotiation_data: CreateNegotiation):
    # Get ride details
    ride = await db.rides.find_one({"id": negotiation_data.ride_id})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride["status"] not in ["open", "negotiating"]:
        raise HTTPException(status_code=400, detail="Ride is no longer available for negotiation")
    
    negotiation_id = str(uuid.uuid4())
    driver_id = str(uuid.uuid4())
    
    negotiation = {
        "id": negotiation_id,
        "ride_id": negotiation_data.ride_id,
        "from_user_id": driver_id,
        "from_user_name": negotiation_data.driver_name,
        "from_user_phone": negotiation_data.driver_phone,
        "to_user_id": ride["rider_id"],
        "to_user_name": ride["rider_name"],
        "offer_amount": negotiation_data.offer_amount,
        "message": negotiation_data.message or f"I can do this ride for ${negotiation_data.offer_amount}",
        "timestamp": datetime.now(),
        "is_accepted": False
    }
    
    await db.negotiations.insert_one(negotiation)
    
    # Update ride status to negotiating
    await db.rides.update_one(
        {"id": negotiation_data.ride_id},
        {"$set": {"status": "negotiating", "current_price": negotiation_data.offer_amount}}
    )
    
    return {"message": "Negotiation started", "negotiation_id": negotiation_id}

@app.post("/api/negotiations/counter")
async def create_counter_offer(counter_data: CounterOffer):
    # Get original negotiation
    original_negotiation = await db.negotiations.find_one({"id": counter_data.negotiation_id})
    if not original_negotiation:
        raise HTTPException(status_code=404, detail="Original negotiation not found")
    
    # Create counter offer
    counter_id = str(uuid.uuid4())
    counter_offer = {
        "id": counter_id,
        "ride_id": original_negotiation["ride_id"],
        "from_user_id": original_negotiation["to_user_id"],
        "from_user_name": counter_data.from_user_name,
        "from_user_phone": counter_data.from_user_phone,
        "to_user_id": original_negotiation["from_user_id"],
        "to_user_name": original_negotiation["from_user_name"],
        "offer_amount": counter_data.offer_amount,
        "message": counter_data.message or f"How about ${counter_data.offer_amount}?",
        "timestamp": datetime.now(),
        "is_accepted": False,
        "parent_negotiation_id": counter_data.negotiation_id
    }
    
    await db.negotiations.insert_one(counter_offer)
    
    # Update ride current price
    await db.rides.update_one(
        {"id": original_negotiation["ride_id"]},
        {"$set": {"current_price": counter_data.offer_amount}}
    )
    
    return {"message": "Counter offer made", "negotiation_id": counter_id}

@app.get("/api/negotiations/{ride_id}")
async def get_negotiations(ride_id: str):
    negotiations = await db.negotiations.find({"ride_id": ride_id}).sort("timestamp", 1).to_list(100)
    for negotiation in negotiations:
        negotiation["_id"] = str(negotiation["_id"])
    return {"negotiations": negotiations}

@app.post("/api/rides/{ride_id}/accept/{negotiation_id}")
async def accept_negotiation(ride_id: str, negotiation_id: str):
    # Get negotiation details
    negotiation = await db.negotiations.find_one({"id": negotiation_id})
    if not negotiation:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    # Update ride as agreed
    await db.rides.update_one(
        {"id": ride_id},
        {
            "$set": {
                "status": "agreed",
                "current_price": negotiation["offer_amount"],
                "agreed_driver_id": negotiation["from_user_id"],
                "agreed_driver_name": negotiation["from_user_name"]
            }
        }
    )
    
    # Mark negotiation as accepted
    await db.negotiations.update_one(
        {"id": negotiation_id},
        {"$set": {"is_accepted": True}}
    )
    
    return {"message": "Ride agreement confirmed!", "final_price": negotiation["offer_amount"]}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)