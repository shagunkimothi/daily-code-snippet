from sqlalchemy.orm import Session
from .database import SessionLocal
from .models import Snippet

SNIPPETS = [
    ("Python", "Hello World", "print('Hello World')"),
    ("JavaScript", "Alert", "alert('Hello World');"),
    ("HTML", "Basic Page", "<h1>Hello World</h1>"),
    ("CSS", "Center Div", "display:flex; justify-content:center;"),
    ("C++", "Hello World", "#include <iostream>\nint main(){ std::cout<<\"Hello\"; }"),
    ("Java", "Hello World", "System.out.println(\"Hello\");"),
]


def seed():
    db: Session = SessionLocal()
    if db.query(Snippet).count() > 0:
        return

    for lang, title, code in SNIPPETS:
        db.add(
            Snippet(
                title=title,
                language=lang,
                code=code,
                explanation="Basic example",
                is_public=True,
            )
        )

    db.commit()
    db.close()


if __name__ == "__main__":
    seed()
