// API Client for FastAPI Backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface CaseCreate {
  title: string;
  symptom: string;
}

export interface CaseResponse {
  case_id: string;
  status: string;
}

export interface DiagnoseRequest {
  symptom: string;
  evidence: string;
}

export interface DiagnosisResponse {
  diagnosis: {
    root_cause: string;
    osi_layer: string;
    confidence: number;
    explanation: string;
    next_command: string;
    suggested_fix: string;
  };
}

export async function createCase(data: CaseCreate): Promise<CaseResponse> {
  const response = await fetch(`${API_BASE_URL}/cases`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create case: ${response.statusText}`);
  }

  return response.json();
}

export async function getCases(): Promise<any[]> {
  const response = await fetch(`${API_BASE_URL}/cases`);
  if (!response.ok) throw new Error("Failed to fetch cases");
  return response.json();
}

export async function getCase(id: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/cases/${id}`);
  if (!response.ok) throw new Error("Failed to fetch case");
  return response.json();
}

export async function requestDiagnosis(data: DiagnoseRequest, case_id?: string): Promise<DiagnosisResponse> {
  let url = `${API_BASE_URL}/diagnose`;
  if (case_id) url += `?case_id=${case_id}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to diagnose: ${response.statusText}`);
  }

  return response.json();
}
