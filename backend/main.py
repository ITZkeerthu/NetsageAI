from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from llm_service import generate_diagnosis
import models
import database
import uuid
from fastapi.middleware.cors import CORSMiddleware

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="NetSage API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For MVP, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CaseCreate(BaseModel):
    title: str
    symptom: str

class EvidenceRequest(BaseModel):
    symptom: str
    evidence: str

@app.get("/")
def read_root():
    return {"message": "Welcome to NetSage API"}

@app.post("/api/v1/cases")
def create_case(case: CaseCreate, db: Session = Depends(database.get_db)):
    case_id = f"CASE-{str(uuid.uuid4())[:8].upper()}"
    db_case = models.Case(id=case_id, title=case.title, symptom=case.symptom)
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return {"case_id": db_case.id, "status": db_case.status}

@app.get("/api/v1/cases")
def get_cases(db: Session = Depends(database.get_db)):
    cases = db.query(models.Case).order_by(models.Case.created_at.desc()).all()
    return [{"id": c.id, "title": c.title, "symptom": c.symptom, "status": c.status, "created_at": c.created_at} for c in cases]

@app.get("/api/v1/cases/{case_id}")
def get_case(case_id: str, db: Session = Depends(database.get_db)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    diagnosis = db.query(models.Diagnosis).filter(models.Diagnosis.case_id == case_id).first()
    
    return {
        "id": case.id,
        "title": case.title,
        "symptom": case.symptom,
        "status": case.status,
        "created_at": case.created_at,
        "diagnosis": diagnosis.__dict__ if diagnosis else None
    }

@app.post("/api/v1/diagnose")
def diagnose(request: EvidenceRequest, case_id: str = None, db: Session = Depends(database.get_db)):
    prompt = f"Symptom: {request.symptom}\n\nEvidence:\n{request.evidence}"
    
    # Call the NVIDIA API via llm_service
    response = generate_diagnosis(prompt)
    
    if "error" in response:
        raise HTTPException(status_code=500, detail=response["error"])
        
    if case_id:
        # Save to DB
        db_diagnosis = models.Diagnosis(
            case_id=case_id,
            root_cause=response.get("root_cause", ""),
            osi_layer=response.get("osi_layer", ""),
            confidence=int(float(response.get("confidence", 0))*100) if isinstance(response.get("confidence"), (float, int)) else 0,
            explanation=response.get("explanation", ""),
            next_command=response.get("next_command", ""),
            suggested_fix=response.get("suggested_fix", "")
        )
        db.add(db_diagnosis)
        # Update case status
        case = db.query(models.Case).filter(models.Case.id == case_id).first()
        if case:
            case.status = "resolved"
        db.commit()
        
    return {"diagnosis": response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
