import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';

// Mock dependencies
vi.mock('$lib/airtable/sveltekit-wrapper', () => ({
	findApprenticeByEmail: vi.fn(),
}));

vi.mock('$lib/server/auth', () => ({
	generateMagicToken: vi.fn(() => 'mock-token'),
}));

vi.mock('$lib/server/email', () => ({
	sendMagicLinkEmail: vi.fn(() => Promise.resolve({ success: true })),
}));

import { findApprenticeByEmail } from '$lib/airtable/sveltekit-wrapper';
import { generateMagicToken } from '$lib/server/auth';

const mockFindApprenticeByEmail = vi.mocked(findApprenticeByEmail);
const mockGenerateMagicToken = vi.mocked(generateMagicToken);

function createMockRequest(body: Record<string, unknown>) {
	return {
		json: vi.fn().mockResolvedValue(body),
	} as unknown as Request;
}

function createMockUrl() {
	return new URL('http://localhost:5173/api/auth/student/login');
}

describe('/api/auth/student/login', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return 400 if email is missing', async () => {
		const request = createMockRequest({});
		const response = await POST({ request, url: createMockUrl() } as never);

		expect(response.status).toBe(400);
		const data = await response.json();
		expect(data.error).toBe('Email is required');
	});

	it('should return 401 if email is not found in apprentices', async () => {
		mockFindApprenticeByEmail.mockResolvedValue(false);

		const request = createMockRequest({ email: 'unknown@example.com' });
		const response = await POST({ request, url: createMockUrl() } as never);

		expect(response.status).toBe(401);
		const data = await response.json();
		expect(data.error).toBe('Email not found');
		expect(mockFindApprenticeByEmail).toHaveBeenCalledWith('unknown@example.com');
	});

	it('should generate magic token for valid apprentice email', async () => {
		mockFindApprenticeByEmail.mockResolvedValue(true);

		const request = createMockRequest({ email: 'student@example.com' });
		const response = await POST({ request, url: createMockUrl() } as never);

		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.message).toBe('Magic link sent! Check your email.');
		expect(mockGenerateMagicToken).toHaveBeenCalledWith('student@example.com', 'student');
	});
});
