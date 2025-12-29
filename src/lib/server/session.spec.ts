import { describe, it, expect, vi } from 'vitest';
import { getSession, setSession, clearSession } from './session';

// Mock the Cookies interface
function createMockCookies(initialValue?: string) {
	let cookieValue = initialValue;
	return {
		get: vi.fn(() => cookieValue),
		set: vi.fn((name: string, value: string) => {
			cookieValue = value;
		}),
		delete: vi.fn(() => {
			cookieValue = undefined;
		}),
	};
}

describe('session', () => {
	describe('getSession', () => {
		it('should return null when no session cookie exists', () => {
			const cookies = createMockCookies();
			const result = getSession(cookies as never);
			expect(result).toBeNull();
		});

		it('should return session data when valid cookie exists', () => {
			const sessionData = { email: 'test@example.com', type: 'staff' as const };
			const cookies = createMockCookies(JSON.stringify(sessionData));
			const result = getSession(cookies as never);
			expect(result).toEqual(sessionData);
		});

		it('should return null for invalid JSON', () => {
			const cookies = createMockCookies('not-valid-json');
			const result = getSession(cookies as never);
			expect(result).toBeNull();
		});

		it('should return null for incomplete session data', () => {
			const cookies = createMockCookies(JSON.stringify({ email: 'test@example.com' }));
			const result = getSession(cookies as never);
			expect(result).toBeNull();
		});
	});

	describe('setSession', () => {
		it('should set session cookie with correct options', () => {
			const cookies = createMockCookies();
			const sessionData = { email: 'test@example.com', type: 'staff' as const };

			setSession(cookies as never, sessionData);

			expect(cookies.set).toHaveBeenCalledWith(
				'session',
				JSON.stringify(sessionData),
				expect.objectContaining({
					path: '/',
					httpOnly: true,
					secure: false, // false in dev/test, true in production
					sameSite: 'lax',
					maxAge: 60 * 60 * 24 * 90, // 90 days
				}),
			);
		});
	});

	describe('clearSession', () => {
		it('should delete session cookie', () => {
			const cookies = createMockCookies(JSON.stringify({ email: 'test@example.com', type: 'staff' }));

			clearSession(cookies as never);

			expect(cookies.delete).toHaveBeenCalledWith('session', { path: '/' });
		});
	});
});
