"""AI Fallback Mixin for Scrapers - Reusable AI enhancement logic."""
import logging
import os
from typing import Optional

from ..utils.ai_extraction import extract_location_with_ai

logger = logging.getLogger("klaro-scraper")

# Feature flag - enable/disable AI fallbacks globally
AI_FALLBACK_ENABLED = os.getenv("AI_FALLBACK_ENABLED", "false").lower() == "true"


class AIScraperMixin:
    """Mixin class that adds AI fallback capabilities to scrapers.

    Usage:
        class MyScraperWithAI(AIScraperMixin, BaseScraper):
            async def parse_job(self, block):
                # Try CSS selector first
                location = extract_from_css(block)

                # Use AI fallback if needed
                location = await self.ai_fallback_location(
                    location=location,
                    title=title,
                    description=description,
                    company=company,
                    job_id=job_id
                )
    """

    # Track AI usage statistics across all instances
    _ai_stats = {
        "location_attempts": 0,
        "location_successes": 0,
        "location_failures": 0
    }

    async def ai_fallback_location(
        self,
        location: str,
        title: str,
        description: str,
        company: str,
        job_id: str,
        source_name: Optional[str] = None
    ) -> str:
        """Attempt AI location extraction if CSS selector failed.

        Args:
            location: Current location from CSS (empty if failed)
            title: Job title
            description: Job description/text
            company: Company/hospital name
            job_id: Job identifier for logging
            source_name: Source identifier (default: self.source_name)

        Returns:
            Location string (original or AI-extracted)
        """
        # If location already found, return it
        if location:
            return location

        # Check if AI fallback is enabled
        if not AI_FALLBACK_ENABLED:
            return location

        source = source_name or getattr(self, 'source_name', 'unknown')

        # Track attempt
        self._ai_stats["location_attempts"] += 1

        logger.warning(f"[{source}] Location not found via CSS for job {job_id}, trying AI...")

        try:
            ai_location = await extract_location_with_ai(
                title=title,
                description=description[:500],  # Limit description length
                company=company
            )

            if ai_location:
                self._ai_stats["location_successes"] += 1
                logger.info(f"[{source}] ✓ AI extracted location for {job_id}: {ai_location}")
                return ai_location
            else:
                self._ai_stats["location_failures"] += 1
                logger.warning(f"[{source}] ✗ AI could not extract location for {job_id}")
                return ""

        except Exception as e:
            self._ai_stats["location_failures"] += 1
            logger.error(f"[{source}] AI extraction error for {job_id}: {e}")
            return ""

    @classmethod
    def get_ai_stats(cls) -> dict:
        """Get AI usage statistics across all scrapers.

        Returns:
            Dict with usage stats: {attempts, successes, failures, success_rate}
        """
        attempts = cls._ai_stats["location_attempts"]
        successes = cls._ai_stats["location_successes"]
        failures = cls._ai_stats["location_failures"]

        success_rate = (successes / attempts * 100) if attempts > 0 else 0

        return {
            "attempts": attempts,
            "successes": successes,
            "failures": failures,
            "success_rate": round(success_rate, 1)
        }

    @classmethod
    def reset_ai_stats(cls):
        """Reset AI usage statistics."""
        cls._ai_stats = {
            "location_attempts": 0,
            "location_successes": 0,
            "location_failures": 0
        }
