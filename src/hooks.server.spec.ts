import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from './hooks.server';

// Mock the session module
vi.mock('$lib/server/session', () => ({
	getSession: vi.fn(),
}));

import { getSession } from '$lib/server/session';

const mockGetSession = vi.mocked(getSession);

type Session = { email: string; type: 'staff' | 'student' } | null;

function createMockEvent(pathname: string) {
	return {
		url: new URL(`http://localhost${pathname}`),
		cookies: {},
		locals: {} as { user: Session },
	};
}

function createMockResolve() {
	return vi.fn().mockResolvedValue(new Response('OK'));
}

describe('hooks.server', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('admin routes protection', () => {
		it('should allow authenticated staff to access /admin', async () => {
			const session = { email: 'staff@example.com', type: 'staff' as const };
			mockGetSession.mockReturnValue(session);

			const event = createMockEvent('/admin');
			const resolve = createMockResolve();

			await handle({ event: event as never, resolve });

			expect(resolve).toHaveBeenCalled();
			expect(event.locals.user).toEqual(session);
		});

		it('should redirect unauthenticated users from /admin to /admin/login', async () => {
			mockGetSession.mockReturnValue(null);

			const event = createMockEvent('/admin');
			const resolve = createMockResolve();

			await expect(handle({ event: event as never, resolve })).rejects.toMatchObject({
				status: 303,
				location: '/admin/login?redirect=%2Fadmin',
			});
		});

		it('should redirect students from /admin to home', async () => {
			const session = { email: 'student@example.com', type: 'student' as const };
			mockGetSession.mockReturnValue(session);

			const event = createMockEvent('/admin');
			const resolve = createMockResolve();

			await expect(handle({ event: event as never, resolve })).rejects.toMatchObject({
				status: 303,
				location: '/',
			});
		});

		it('should allow unauthenticated access to /admin/login', async () => {
			mockGetSession.mockReturnValue(null);

			const event = createMockEvent('/admin/login');
			const resolve = createMockResolve();

			await handle({ event: event as never, resolve });

			expect(resolve).toHaveBeenCalled();
		});
	});

	describe('checkin route', () => {
		it('should allow authenticated users to access /checkin', async () => {
			const session = { email: 'student@example.com', type: 'student' as const };
			mockGetSession.mockReturnValue(session);

			const event = createMockEvent('/checkin');
			const resolve = createMockResolve();

			await handle({ event: event as never, resolve });

			expect(resolve).toHaveBeenCalled();
			expect(event.locals.user).toEqual(session);
		});

		it('should allow unauthenticated access to /checkin for guest check-in', async () => {
			mockGetSession.mockReturnValue(null);

			const event = createMockEvent('/checkin');
			const resolve = createMockResolve();

			await handle({ event: event as never, resolve });

			expect(resolve).toHaveBeenCalled();
			expect(event.locals.user).toBeNull();
		});
	});

	describe('login page redirects', () => {
		it('should redirect authenticated staff from /login to /admin', async () => {
			const session = { email: 'staff@example.com', type: 'staff' as const };
			mockGetSession.mockReturnValue(session);

			const event = createMockEvent('/login');
			const resolve = createMockResolve();

			await expect(handle({ event: event as never, resolve })).rejects.toMatchObject({
				status: 303,
				location: '/admin',
			});
		});

		it('should redirect authenticated students from /login to home', async () => {
			const session = { email: 'student@example.com', type: 'student' as const };
			mockGetSession.mockReturnValue(session);

			const event = createMockEvent('/login');
			const resolve = createMockResolve();

			await expect(handle({ event: event as never, resolve })).rejects.toMatchObject({
				status: 303,
				location: '/',
			});
		});

		it('should redirect authenticated staff from /admin/login to /admin', async () => {
			const session = { email: 'staff@example.com', type: 'staff' as const };
			mockGetSession.mockReturnValue(session);

			const event = createMockEvent('/admin/login');
			const resolve = createMockResolve();

			await expect(handle({ event: event as never, resolve })).rejects.toMatchObject({
				status: 303,
				location: '/admin',
			});
		});
	});

	describe('API routes', () => {
		it('should skip protection for API routes', async () => {
			mockGetSession.mockReturnValue(null);

			const event = createMockEvent('/api/auth/login');
			const resolve = createMockResolve();

			await handle({ event: event as never, resolve });

			expect(resolve).toHaveBeenCalled();
		});
	});

	describe('public routes', () => {
		it('should allow unauthenticated access to home page', async () => {
			mockGetSession.mockReturnValue(null);

			const event = createMockEvent('/');
			const resolve = createMockResolve();

			await handle({ event: event as never, resolve });

			expect(resolve).toHaveBeenCalled();
		});
	});
});
