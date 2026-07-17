from app.config import settings
from app.core.config import get_settings


def test_legacy_config_shim_uses_core_settings() -> None:
    core_settings = get_settings()

    assert settings.application.project_name == core_settings.application.project_name
    assert settings.application.service_name == core_settings.application.service_name
    assert settings.gemini.model == core_settings.gemini.model
    assert settings.security.api_key_header == core_settings.security.api_key_header
