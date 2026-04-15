import pytest
from app.core.fhir_builder import build_fhir_observation
from app.schemas.observation import ObservationCreate


def make_obs(**kwargs):
    defaults = dict(
        code_value="8867-4",
        code_display="Heart rate",
        value_quantity=72.0,
        value_unit="beats/minute",
    )
    return ObservationCreate(**(defaults | kwargs))


def test_fhir_resource_type():
    fhir = build_fhir_observation(make_obs())
    assert fhir["resourceType"] == "Observation"


def test_fhir_code_mapping():
    fhir = build_fhir_observation(make_obs(code_value="8867-4", code_display="Heart rate"))
    coding = fhir["code"]["coding"][0]
    assert coding["code"] == "8867-4"
    assert coding["display"] == "Heart rate"


def test_fhir_value_quantity():
    fhir = build_fhir_observation(make_obs(value_quantity=98.6, value_unit="degF"))
    vq = fhir["valueQuantity"]
    assert vq["value"] == 98.6
    assert vq["unit"] == "degF"


def test_fhir_status_is_final():
    fhir = build_fhir_observation(make_obs())
    assert fhir["status"] == "final"


def test_schema_rejects_negative_value():
    with pytest.raises(Exception):
        make_obs(value_quantity=-1)


def test_schema_rejects_blank_code():
    with pytest.raises(Exception):
        make_obs(code_value="   ")


def test_fhir_has_category():
    fhir = build_fhir_observation(make_obs())
    assert fhir["category"][0]["coding"][0]["code"] == "vital-signs"
