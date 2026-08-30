# NetSage API Documentation

## Base URL
`http://localhost:8000/api/v1`

## Endpoints

### 1. Root
- **GET** `/`
- **Description**: Health check endpoint.
- **Response**:
  ```json
  {
    "message": "Welcome to NetSage API"
  }
  ```

### 2. Create Case
- **POST** `/cases`
- **Description**: Initializes a new troubleshooting case.
- **Request Body**:
  ```json
  {
    "title": "String",
    "symptom": "String"
  }
  ```
- **Response**:
  ```json
  {
    "case_id": "CASE-1234ABCD",
    "status": "open"
  }
  ```

### 3. Diagnose (MVP)
- **POST** `/diagnose`
- **Description**: Generates a diagnosis using the NVIDIA LLM API based on symptom and evidence.
- **Request Body**:
  ```json
  {
    "symptom": "String",
    "evidence": "String"
  }
  ```
- **Response**:
  ```json
  {
    "diagnosis": {
      "root_cause": "String",
      "osi_layer": "String",
      "confidence": "Integer",
      "explanation": "String",
      "next_command": "String",
      "suggested_fix": "String"
    }
  }
  ```
