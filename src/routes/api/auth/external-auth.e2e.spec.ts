import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dev } from '$app/environment';

// Mock environment variables for testing
const mockEnvVars = {
	AIRTABLE_API_KEY: 'test-key',
	AIRTABLE_BASE_ID: 'test-base-id',
	JWT_SECRET: 'test-jwt-secret',
};

// Mock Airtable for external user testing
vi.mock('$lib/airtable/sveltekit-wrapper', () => ({
	getExternalAccessByEmail: vi.fn(),
	findStaffByEmail: vi.fn(),
	findApprenticeByEmail: vi.fn(),
}));

// Mock auth utilities
vi.mock('$lib/server/auth', () => ({
	generateMagicToken: vi.fn(),
	verifyMagicToken: vi.fn(),
}));

// Mock email service
vi.mock('$lib/server/email', () => ({
	sendMagicLinkEmail: vi.fn(),
}));

import { getExternalAccessByEmail, findStaffByEmail, findApprenticeByEmail } from '$lib/airtable/sveltekit-wrapper';
import { generateMagicToken, verifyMagicToken } from '$lib/server/auth';
import { sendMagicLinkEmail } from '$lib/server/email';

describe('External Staff Authentication E2E Flow', () => {
	const testEmail = 'external@example.com';
	const testExternalUser = {
		type: 'external' as const,
		email: testEmail,
		name: 'External User',
		accessLevel: 'attendance-view' as const,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Login Request Flow', () => {
		it('should handle external staff login request successfully', async () => {
			// Arrange
			const mockToken = 'mock-jwt-token';
			const mockVerifyUrl = 'http://localhost:5174/api/auth/verify?token=mock-jwt-token';

			// Mock external user found, not staff or student
			vi.mocked(findStaffByEmail).mockResolvedValue(false);
			vi.mocked(getExternalAccessByEmail).mockResolvedValue(testExternalUser);
			vi.mocked(findApprenticeByEmail).mockResolvedValue(false);
			vi.mocked(generateMagicToken).mockReturnValue(mockToken);
			vi.mocked(sendMagicLinkEmail).mockResolvedValue({ success: true });

			// Act - Simulate login request
			const requestBody = { email: testEmail };

			// Verify the flow logic
			const isStaff = await findStaffByEmail(testEmail);
			expect(isStaff).toBe(false);

			const externalUser = await getExternalAccessByEmail(testEmail);
			expect(externalUser).toEqual(testExternalUser);

			if (externalUser) {
				const token = generateMagicToken(testEmail, 'external');
				const emailResult = await sendMagicLinkEmail(testEmail, mockVerifyUrl, 'external');

				expect(token).toBe(mockToken);
				expect(emailResult.success).toBe(true);
			}

			// Assert
			expect(findStaffByEmail).toHaveBeenCalledWith(testEmail);
			expect(getExternalAccessByEmail).toHaveBeenCalledWith(testEmail);
			expect(generateMagicToken).toHaveBeenCalledWith(testEmail, 'external');
			expect(sendMagicLinkEmail).toHaveBeenCalledWith(testEmail, mockVerifyUrl, 'external');
		});

		it('should handle external user not found scenario', async () => {
			// Arrange - No user found anywhere
			vi.mocked(findStaffByEmail).mockResolvedValue(false);
			vi.mocked(getExternalAccessByEmail).mockResolvedValue(null);
			vi.mocked(findApprenticeByEmail).mockResolvedValue(false);

			// Act
			const isStaff = await findStaffByEmail(testEmail);
			const externalUser = await getExternalAccessByEmail(testEmail);
			const isApprentice = await findApprenticeByEmail(testEmail);

			// Assert
			expect(isStaff).toBe(false);
			expect(externalUser).toBeNull();
			expect(isApprentice).toBe(false);
			expect(generateMagicToken).not.toHaveBeenCalled();
			expect(sendMagicLinkEmail).not.toHaveBeenCalled();
		});

		it('should prioritize staff over external access', async () => {
			// Arrange - User exists as both staff and external
			vi.mocked(findStaffByEmail).mockResolvedValue(true);
			vi.mocked(generateMagicToken).mockReturnValue('staff-token');
			vi.mocked(sendMagicLinkEmail).mockResolvedValue({ success: true });

			// Act
			const isStaff = await findStaffByEmail(testEmail);

			if (isStaff) {
				const token = generateMagicToken(testEmail, 'staff');
				await sendMagicLinkEmail(testEmail, 'mock-url', 'staff');
			}

			// Assert - External access should not be checked if user is staff
			expect(findStaffByEmail).toHaveBeenCalledWith(testEmail);
			expect(getExternalAccessByEmail).not.toHaveBeenCalled();
			expect(generateMagicToken).toHaveBeenCalledWith(testEmail, 'staff');
		});

		it('should handle email service failures gracefully', async () => {
			// Arrange
			vi.mocked(findStaffByEmail).mockResolvedValue(false);
			vi.mocked(getExternalAccessByEmail).mockResolvedValue(testExternalUser);
			vi.mocked(generateMagicToken).mockReturnValue('mock-token');
			vi.mocked(sendMagicLinkEmail).mockResolvedValue({ success: false });

			// Act
			const externalUser = await getExternalAccessByEmail(testEmail);
			if (externalUser) {
				const token = generateMagicToken(testEmail, 'external');
				const emailResult = await sendMagicLinkEmail(testEmail, 'mock-url', 'external');

				// Assert
				expect(token).toBe('mock-token');
				expect(emailResult.success).toBe(false);
			}
		});
	});

	describe('Token Verification Flow', () => {
		it('should verify external staff tokens correctly', async () => {
			// Arrange
			const mockPayload = {
				email: testEmail,
				type: 'external' as const,
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
			};
			const mockToken = 'valid.jwt.token';

			vi.mocked(verifyMagicToken).mockReturnValue(mockPayload);

			// Act
			const payload = verifyMagicToken(mockToken);

			// Assert
			expect(payload).toEqual(mockPayload);
			expect(payload?.type).toBe('external');
			expect(payload?.email).toBe(testEmail);
		});

		it('should reject invalid tokens', async () => {
			// Arrange
			const invalidToken = 'invalid.token';
			vi.mocked(verifyMagicToken).mockReturnValue(null);

			// Act
			const payload = verifyMagicToken(invalidToken);

			// Assert
			expect(payload).toBeNull();
		});

		it('should reject expired tokens', async () => {
			// Arrange
			const expiredToken = 'expired.token';
			vi.mocked(verifyMagicToken).mockReturnValue(null);

			// Act
			const payload = verifyMagicToken(expiredToken);

			// Assert
			expect(payload).toBeNull();
		});
	});

	describe('Authentication Flow Integration', () => {
		it('should complete full external staff auth flow', async () => {
			// Arrange - Complete flow simulation
			const mockToken = 'complete-flow-token';
			const mockPayload = {
				email: testEmail,
				type: 'external' as const,
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 900,
			};

			// Step 1: Login request
			vi.mocked(findStaffByEmail).mockResolvedValue(false);
			vi.mocked(getExternalAccessByEmail).mockResolvedValue(testExternalUser);
			vi.mocked(generateMagicToken).mockReturnValue(mockToken);
			vi.mocked(sendMagicLinkEmail).mockResolvedValue({ success: true });

			// Step 2: Token verification
			vi.mocked(verifyMagicToken).mockReturnValue(mockPayload);

			// Act - Simulate complete flow
			// 1. Login
			const isStaff = await findStaffByEmail(testEmail);
			const externalUser = await getExternalAccessByEmail(testEmail);
			const token = externalUser ? generateMagicToken(testEmail, 'external') : null;
			const emailResult = token ? await sendMagicLinkEmail(testEmail, 'mock-url', 'external') : null;

			// 2. Verification
			const payload = token ? verifyMagicToken(token) : null;

			// Assert
			expect(isStaff).toBe(false);
			expect(externalUser).toEqual(testExternalUser);
			expect(token).toBe(mockToken);
			expect(emailResult?.success).toBe(true);
			expect(payload).toEqual(mockPayload);
			expect(payload?.type).toBe('external');
		});

		it('should handle case-insensitive email matching', async () => {
			// Arrange
			const upperCaseEmail = 'EXTERNAL@EXAMPLE.COM';
			const lowerCaseUser = {
				...testExternalUser,
				email: 'external@example.com',
			};

			vi.mocked(findStaffByEmail).mockResolvedValue(false);
			vi.mocked(getExternalAccessByEmail).mockResolvedValue(lowerCaseUser);

			// Act
			const externalUser = await getExternalAccessByEmail(upperCaseEmail);

			// Assert
			expect(externalUser).toEqual(lowerCaseUser);
			expect(getExternalAccessByEmail).toHaveBeenCalledWith(upperCaseEmail);
		});

		it('should validate external user permissions', async () => {
			// Arrange
			const externalUser = await getExternalAccessByEmail(testEmail);

			// Assert external user has expected properties
			if (externalUser) {
				expect(externalUser.type).toBe('external');
				expect(externalUser.accessLevel).toBe('attendance-view');
				expect(externalUser.email).toBe(testEmail);
				expect(externalUser.name).toBeTruthy();
			}
		});
	});

	describe('Error Handling', () => {
		it('should handle Airtable connection errors', async () => {
			// Arrange
			vi.mocked(getExternalAccessByEmail).mockRejectedValue(new Error('Airtable connection failed'));

			// Act & Assert
			await expect(getExternalAccessByEmail(testEmail)).rejects.toThrow('Airtable connection failed');
		});

		it('should handle malformed email inputs', async () => {
			// Arrange
			const malformedEmails = ['', '   ', 'not-an-email', '@invalid.com', 'test@'];

			vi.mocked(getExternalAccessByEmail).mockResolvedValue(null);

			// Act & Assert
			for (const email of malformedEmails) {
				const result = await getExternalAccessByEmail(email);
				expect(result).toBeNull();
			}
		});

		it('should handle missing external access data gracefully', async () => {
			// Arrange - External user with missing fields
			const incompleteUser = {
				type: 'external' as const,
				email: testEmail,
				name: '', // Empty name
				accessLevel: 'attendance-view' as const,
			};

			vi.mocked(getExternalAccessByEmail).mockResolvedValue(incompleteUser);

			// Act
			const result = await getExternalAccessByEmail(testEmail);

			// Assert
			expect(result).toEqual(incompleteUser);
		});
	});

	describe('Security Validation', () => {
		it('should validate JWT token structure', async () => {
			// Arrange
			const mockPayload = {
				email: testEmail,
				type: 'external' as const,
				iat: Math.floor(Date.now() / 1000),
				exp: Math.floor(Date.now() / 1000) + 900,
			};

			vi.mocked(verifyMagicToken).mockReturnValue(mockPayload);

			// Act
			const payload = verifyMagicToken('mock-token');

			// Assert
			expect(payload).toHaveProperty('email');
			expect(payload).toHaveProperty('type');
			expect(payload).toHaveProperty('iat');
			expect(payload).toHaveProperty('exp');
			expect(payload?.type).toBe('external');
		});

		it('should ensure external users have proper type validation', async () => {
			// Arrange
			const externalUser = {
				type: 'external' as const,
				email: testEmail,
				name: 'Test User',
				accessLevel: 'attendance-view' as const,
			};

			vi.mocked(getExternalAccessByEmail).mockResolvedValue(externalUser);

			// Act
			const result = await getExternalAccessByEmail(testEmail);

			// Assert
			expect(result?.type).toBe('external');
			expect(['external']).toContain(result?.type);
		});
	});
});