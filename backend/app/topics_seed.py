"""Curated topic taxonomy for the onboarding "what would you like to learn"
picker. Seeded once, same idempotent shape as seed_data.py's snippet seed —
safe to call on every startup, no-ops once the topics already exist."""
from app import models

TOPICS = [
    "Frontend", "React", "JavaScript", "TypeScript", "Node.js",
    "Python", "Java", "C++", "SQL", "DBMS",
    "Operating Systems", "Computer Networks", "Docker", "Kubernetes",
    "AWS", "Azure", "DevOps", "System Design", "DSA",
    "Machine Learning", "Linux", "Git",
]


def _slugify(name):
    return name.lower().replace(".", "").replace("+", "plus").replace(" ", "-")


def seed_topics_if_empty(db):
    """Insert the curated topic list if none exist yet. Safe to call on
    every startup — a single query short-circuits once topics exist."""
    if db.query(models.Topic).first():
        return 0

    count = 0
    for name in TOPICS:
        slug = _slugify(name)
        exists = db.query(models.Topic).filter(models.Topic.slug == slug).first()
        if exists:
            continue
        db.add(models.Topic(name=name, slug=slug))
        count += 1

    db.commit()
    return count
