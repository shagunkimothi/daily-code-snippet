from app.database import SessionLocal
from app.models import User, Favorite

db = SessionLocal()

print("=== USERS ===")
for u in db.query(User).all():
    print("  id=" + str(u.id) + " email=" + str(u.email) + " google_id=" + str(u.google_id))

print("")
print("=== FAVORITES ===")
for f in db.query(Favorite).all():
    print("  id=" + str(f.id) + " user_id=" + str(f.user_id) + " snippet_id=" + str(f.snippet_id))

db.close()