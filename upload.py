import firebase_admin
from firebase_admin import credentials, firestore
import csv


# Initialize Firebase
cred = credentials.Certificate("data/jee-tracker-a46d6-firebase-adminsdk-fbsvc-4f1d9813b8.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# Subjects and file mapping
subjects = {
    "physics": "data/physics.csv",
    "chemistry": "data/chemistry.csv",
    "math": "data/maths.csv"
}

# Default structure for each chapter
def default_chapter(idx, name, questions):
    return {
        "name": name.strip(),
        "priority": int(questions),  # priority now equals number of questions
        "idx": idx,
        "tasks": {
            "notes": False,
            "ex1": False,
            "ex2": False,
            "ex3": False,
            "ex4a": False,
            "ex4b": False,
            "ex5": False,
            "book": False
        }
    }

# Upload chapters from CSV
for subject, filepath in subjects.items():
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)  # expects headers: Chapter,Total Questions,Weightage
        for idx, row in enumerate(reader):
            chapter = row["Chapter"].strip()
            questions = row["Total Questions"].strip()
            if not questions.isdigit():
                questions = 0
            doc_ref = db.collection(subject).document(chapter.lower().replace(" ", "_"))
            doc_ref.set(default_chapter(idx, chapter, questions))
            print(f"Added {chapter} ({questions} questions) to {subject}")