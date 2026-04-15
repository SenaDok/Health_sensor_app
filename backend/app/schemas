from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator


class ObservationCreate(BaseModel):
    """Input: simple sensor reading, we build the FHIR resource."""
    code_system: str = Field(default="http://loinc.org")
    code_value: str = Field(..., example="8867-4")
    code_display: str = Field(..., example="Heart rate")
    value_quantity: float = Field(..., ge=0, le=10000)
    value_unit: str = Field(..., example="beats/minute")
    subject_reference: Optional[str] = Field(default="Patient/demo-patient")

    @validator("code_value")
    def code_not_empty(cls, v):
        if not v.strip():
            raise ValueError("code_value cannot be blank")
        return v.strip()


class ObservationResponse(BaseModel):
    id: UUID
    resource_type: str
    status: str
    code_system: str
    code_value: str
    code_display: str
    value_quantity: float
    value_unit: str
    subject_reference: Optional[str]
    effective_datetime: datetime
    issued: datetime
    raw_fhir: dict

    class Config:
        from_attributes = True


class ObservationList(BaseModel):
    total: int
    items: list[ObservationResponse]
