import { describe, it, expect, vi } from 'vitest';
import { generateMagicToken, verifyMagicToken } from './auth';

// Mock the environment variable
vi.mock('$env/static/private', () => ({
	AUTH_SECRET: 'test-secret-at-least-32-characters-long',
}));

describe('auth', () => {
	describe('generateMagicToken', () => {
		it('should generate a valid JWT token', () => {
			const token = generateMagicToken('test@example.com', 'student');
			expect(token).toBeDefined();
			expect(typeof token).toBe('string');
			expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
		});
	});

	describe('verifyMagicToken', () => {
		it('should verify a valid token and return payload', () => {
			const token = generateMagicToken('test@example.com', 'student');
			const payload = verifyMagicToken(token);

			expect(payload).not.toBeNull();
			expect(payload?.email).toBe('test@example.com');
			expect(payload?.type).toBe('student');
		});

		it('should return null for invalid token', () => {
			const payload = verifyMagicToken('invalid-token');
			expect(payload).toBeNull();
		});

		it('should return null for tampered token', () => {
			const token = generateMagicToken('test@example.com', 'student');
			const tamperedToken = token.slice(0, -5) + 'xxxxx';
			const payload = verifyMagicToken(tamperedToken);
			expect(payload).toBeNull();
		});
	});
});
