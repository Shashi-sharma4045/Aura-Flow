"""
Backend Security Regression Test Suite
Validates security headers, production documentation disabling, and authentication enforcement.
"""

import os
import unittest
from starlette.testclient import TestClient


class TestBackendSecurity(unittest.TestCase):
    def setUp(self):
        # Ensure test environment
        os.environ["ENVIRONMENT"] = "development"
        from main import app
        self.client = TestClient(app)

    def test_security_headers_present(self):
        """Regression test: Ensure all mandatory defense-in-depth security headers are attached."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

        # 1. Anti-Clickjacking
        self.assertEqual(response.headers.get("X-Frame-Options"), "DENY")

        # 2. MIME Sniffing Prevention
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")

        # 3. HTTP Strict Transport Security
        self.assertIn("max-age=31536000", response.headers.get("Strict-Transport-Security", ""))

        # 4. Referrer Policy
        self.assertEqual(response.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin")

        # 5. Content Security Policy
        self.assertIn("default-src 'self'", response.headers.get("Content-Security-Policy", ""))

    def test_protected_endpoint_rejects_unauthenticated_request(self):
        """Regression test: Ensure protected endpoints strictly reject requests lacking a valid Bearer token."""
        response = self.client.get("/api/me")
        # Should return 401 Unauthorized or 403 Forbidden
        self.assertIn(response.status_code, [401, 403])

    def test_production_docs_disabled(self):
        """Regression test: Ensure Swagger UI and OpenAPI schemas are disabled in production environment."""
        # Set environment to production and reload app
        os.environ["ENVIRONMENT"] = "production"
        import importlib
        import main
        importlib.reload(main)

        prod_client = TestClient(main.app)

        docs_response = prod_client.get("/docs")
        self.assertEqual(docs_response.status_code, 404, "Swagger UI (/docs) must return 404 in production")

        openapi_response = prod_client.get("/openapi.json")
        self.assertEqual(openapi_response.status_code, 404, "OpenAPI schema (/openapi.json) must return 404 in production")

        # Reset environment back
        os.environ["ENVIRONMENT"] = "development"
        importlib.reload(main)


if __name__ == "__main__":
    unittest.main()
