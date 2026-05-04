from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import random
import os
from google.cloud import firestore

# Initialize Firestore Client
try:
    db = firestore.Client(project="robotic-facet-495106-t3")
except Exception as e:
    print(f"Firestore initialization warning: {e}")
    db = None

app = FastAPI(title="Élan Privé API")

# Configure CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
ASSETS_DIR = os.path.join(FRONTEND_DIR, "assets")

# Serve static files (assets)
app.mount("/assets", StaticFiles(directory=ASSETS_DIR), name="assets")

# Mock Product Data
products = [
    {
        "id": 1,
        "name": "Midnight Silk Gown",
        "category": "Women",
        "price": 2450.00,
        "description": "A fluid silhouette crafted from the finest Italian silk, featuring a delicate drape and a subtle sheen for unforgettable evenings.",
        "image": "assets/gown-blue.png",
        "images": {
            "Midnight Blue": "assets/gown-blue.png",
            "Obsidian": "assets/gown-obsidian.png"
        },
        "sizes": ["XS", "S", "M", "L"],
        "colors": ["Midnight Blue", "Obsidian"]
    },
    {
        "id": 2,
        "name": "Charcoal Tailored Suit",
        "category": "Men",
        "price": 3800.00,
        "description": "Exquisitely tailored from Super 150s wool, this charcoal suit represents the pinnacle of modern sartorial elegance.",
        "image": "assets/suit-charcoal.png",
        "images": {
            "Charcoal": "assets/suit-charcoal.png",
            "Deep Navy": "assets/suit-navy.png"
        },
        "sizes": ["48", "50", "52", "54"],
        "colors": ["Charcoal", "Deep Navy"]
    },
    {
        "id": 3,
        "name": "Ivory Cashmere Sweater",
        "category": "Women",
        "price": 950.00,
        "description": "Pure Mongolian cashmere, knitted with a timeless cable pattern for unparalleled softness and warmth.",
        "image": "assets/sweater-ivory.png",
        "images": {
            "Ivory": "assets/sweater-ivory.png",
            "Soft Sand": "assets/sweater-ivory.png" # Using same for now
        },
        "sizes": ["S", "M", "L"],
        "colors": ["Ivory", "Soft Sand"]
    },
    {
        "id": 4,
        "name": "Navy Velvet Blazer",
        "category": "Men",
        "price": 1250.00,
        "description": "A statement piece in deep navy velvet, featuring silk-satin lapels and a slim, contemporary fit.",
        "image": "assets/blazer-navy.png",
        "images": {
            "Deep Navy": "assets/blazer-navy.png",
            "Forest Green": "assets/blazer-green.png"
        },
        "sizes": ["46", "48", "50", "52"],
        "colors": ["Deep Navy", "Forest Green"]
    },
    {
        "id": 5,
        "name": "Gold Accent Evening Clutch",
        "category": "Accessories",
        "price": 1800.00,
        "description": "Handcrafted calfskin leather with bespoke 24k gold-plated hardware. The ultimate accessory for the Élan Privé woman.",
        "image": "assets/clutch-black.png",
        "images": {
            "Gold/Black": "assets/clutch-black.png",
            "Gold/Ivory": "assets/clutch-black.png"
        },
        "sizes": ["One Size"],
        "colors": ["Gold/Black", "Gold/Ivory"]
    },
    {
        "id": 6,
        "name": "Polished Calfskin Oxfords",
        "category": "Accessories",
        "price": 850.00,
        "description": "Masterfully crafted in Florence, these oxfords feature a hand-burnished finish and Goodyear-welted soles.",
        "image": "assets/oxfords-cognac.png",
        "images": {
            "Cognac": "assets/oxfords-cognac.png",
            "Black": "assets/oxfords-cognac.png"
        },
        "sizes": ["40", "41", "42", "43", "44"],
        "colors": ["Cognac", "Black"]
    },
    {
        "id": 7,
        "name": "Silk Pocket Square",
        "category": "Accessories",
        "price": 150.00,
        "description": "Pure Italian silk with hand-rolled edges, featuring an exclusive Élan Privé heritage print.",
        "image": "assets/pocket-square.png",
        "images": {
            "Champagne": "assets/pocket-square.png",
            "Silver": "assets/pocket-square.png"
        },
        "sizes": ["One Size"],
        "colors": ["Champagne", "Silver"]
    }
]

class ChatMessage(BaseModel):
    message: str

class CheckoutData(BaseModel):
    email: str
    name: str
    address: str
    cartItems: list

class ProfileData(BaseModel):
    email: str
    name: str
    address: str
    phone: str = ""

@app.get("/products")
async def get_products():
    return products

@app.post("/checkout")
async def checkout(data: CheckoutData):
    # Mock payment processing
    return {"status": "success", "order_id": f"EP-{random.randint(10000, 99999)}", "message": "Order placed successfully."}

@app.get("/profile/{email}")
async def get_profile(email: str):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    doc_ref = db.collection("profiles").document(email)
    doc = doc_ref.get()
    if doc.exists:
        return doc.to_dict()
    return {"status": "not_found"}

@app.post("/profile")
async def save_profile(profile: ProfileData):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    doc_ref = db.collection("profiles").document(profile.email)
    doc_ref.set(profile.model_dump())
    return {"status": "success", "message": "Profile saved securely."}

@app.post("/chat")
async def chat(chat_msg: ChatMessage):
    msg = chat_msg.message.lower()
    
    # Le Concierge Logic
    responses = {
        "suit": "Our bespoke suits are crafted from Super 150s wool. Would you like to view our fitting guide for the Charcoal Tailored Suit?",
        "size": "We offer a range of sizes from European 46 to 54 for men, and XS to L for women. Our concierge can assist with precise measurements.",
        "shipping": "Élan Privé offers complimentary white-glove delivery on all orders over $2,000. Standard shipping takes 3-5 business days.",
        "return": "We accept returns within 14 days of delivery. The item must be in its original condition with all tags and packaging intact.",
        "contact": "You may reach our VIP Concierge at concierge@elanprive.com or visit our boutiques in Paris, New York, or Milan.",
        "women": "Our Women's collection features fluid silhouettes and rare materials. The Midnight Silk Gown is currently a seasonal favorite.",
        "men": "The Men's collection emphasizes structural perfection and refined textures. I highly recommend the Navy Velvet Blazer for evening events.",
        "hello": "Greetings. I am Le Concierge. How may I assist you in your pursuit of excellence today?",
        "hi": "Greetings. I am Le Concierge. How may I assist you in your pursuit of excellence today?"
    }
    
    # Default response if no keyword matches
    default_response = "I understand. As your personal concierge, I am here to ensure your experience with Élan Privé is nothing short of exceptional. Could you please specify your inquiry regarding our collections or services?"
    
    response_text = next((val for key, val in responses.items() if key in msg), default_response)
    
    return {"reply": response_text}

# Serve the rest of the frontend files (Mount at the end to avoid shadowing API routes)
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    # Use PORT environment variable for Cloud Run (default to 8080)
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
