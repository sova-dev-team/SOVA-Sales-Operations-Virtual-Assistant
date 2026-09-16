from dataclasses import dataclass
from typing import Protocol

from app.models.entities import EmailLanguage, EmailPurpose, EmailTone


@dataclass(frozen=True)
class EmailGenerationContext:
    company_name: str
    contact_name: str
    latest_interaction_summary: str | None


@dataclass(frozen=True)
class GeneratedEmail:
    subject: str
    body: str
    provider: str
    model: str
    prompt_version: str


class AIEmailProvider(Protocol):
    async def generate(
        self,
        context: EmailGenerationContext,
        purpose: EmailPurpose,
        language: EmailLanguage,
        tone: EmailTone,
    ) -> GeneratedEmail: ...


class FakeAIEmailProvider:
    """Deterministic local adapter; it never calls a network AI provider."""

    async def generate(
        self,
        context: EmailGenerationContext,
        purpose: EmailPurpose,
        language: EmailLanguage,
        tone: EmailTone,
    ) -> GeneratedEmail:
        if language is EmailLanguage.VI:
            subject = f"Trao đổi tiếp về nhu cầu của {context.company_name}"
            body = (
                f"Kính gửi anh/chị {context.contact_name},\n\n"
                f"Tôi liên hệ để trao đổi tiếp về nhu cầu của {context.company_name}. "
                "Anh/chị vui lòng cho biết thời gian phù hợp để chúng ta trao đổi thêm.\n\n"
                "Trân trọng,\nĐội ngũ Việt Delta"
            )
        else:
            subject = f"Following up with {context.company_name}"
            body = (
                f"Hello {context.contact_name},\n\n"
                f"I am reaching out to follow up on {context.company_name}'s needs. "
                "Please let me know a convenient time to continue our conversation.\n\n"
                "Best regards,\nViet Delta team"
            )
        return GeneratedEmail(subject, body, "fake", "deterministic-v1", "email-follow-up-v1")
