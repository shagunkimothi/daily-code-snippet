"""seed.py — Run once to populate the database with sample snippets.
Usage:  python seed.py

The actual snippet data and idempotent insert logic live in app/seed_data.py
(shared with app.main's automatic startup seed-if-empty hook).
"""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models
from app.seed_data import seed_if_empty

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()
count = seed_if_empty(db)
db.close()

if count:
    print(f"\n✅ Seeded {count} snippets successfully!")
else:
    print("\nDatabase already has public snippets — nothing to do.")
