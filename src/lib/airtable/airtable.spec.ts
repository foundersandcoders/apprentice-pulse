import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAirtableClient } from './airtable';

// Mock Airtable
vi.mock('airtable', () => {
	const mockSelect = vi.fn();

	return {
		default: {
			configure: vi.fn(),
			base: vi.fn(() => () => ({
				select: mockSelect,
			})),
		},
	};
});

import Airtable from 'airtable';

describe('airtable client', () => {
	let client: ReturnType<typeof createAirtableClient>;
	let mockTable: {
		select: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		client = createAirtableClient('test-api-key', 'test-base-id');
		mockTable = (Airtable.base('test-base-id') as unknown as () => typeof mockTable)();
	});

	describe('getExternalAccessByEmail', () => {
		it('should return external user when email matches external access field', async () => {
			// Mock staff record with external access fields
			const mockStaffRecord = {
				get: vi.fn((fieldId: string) => {
					if (fieldId === 'fldsR6gvnOsSEhfh9') { // EXTERNAL_ACCESS_EMAIL
						return 'external@example.com';
					}
					if (fieldId === 'fld5Z9dl265e22TPQ') { // EXTERNAL_ACCESS_NAME
						return 'External User';
					}
					return undefined;
				}),
			};

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([mockStaffRecord]) });

			const result = await client.getExternalAccessByEmail('external@example.com');

			expect(result).toEqual({
				type: 'external',
				email: 'external@example.com',
				name: 'External User',
				accessLevel: 'attendance-view',
			});
		});

		it('should return external user with default name when name field is empty', async () => {
			// Mock staff record with external access email but no name
			const mockStaffRecord = {
				get: vi.fn((fieldId: string) => {
					if (fieldId === 'fldsR6gvnOsSEhfh9') { // EXTERNAL_ACCESS_EMAIL
						return 'external@example.com';
					}
					if (fieldId === 'fld5Z9dl265e22TPQ') { // EXTERNAL_ACCESS_NAME
						return undefined; // No name provided
					}
					return undefined;
				}),
			};

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([mockStaffRecord]) });

			const result = await client.getExternalAccessByEmail('external@example.com');

			expect(result).toEqual({
				type: 'external',
				email: 'external@example.com',
				name: 'External User', // Default name
				accessLevel: 'attendance-view',
			});
		});

		it('should handle case-insensitive email matching', async () => {
			// Mock staff record with lowercase email
			const mockStaffRecord = {
				get: vi.fn((fieldId: string) => {
					if (fieldId === 'fldsR6gvnOsSEhfh9') { // EXTERNAL_ACCESS_EMAIL
						return 'external@example.com';
					}
					if (fieldId === 'fld5Z9dl265e22TPQ') { // EXTERNAL_ACCESS_NAME
						return 'External User';
					}
					return undefined;
				}),
			};

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([mockStaffRecord]) });

			// Search with uppercase email
			const result = await client.getExternalAccessByEmail('EXTERNAL@EXAMPLE.COM');

			expect(result).toEqual({
				type: 'external',
				email: 'external@example.com',
				name: 'External User',
				accessLevel: 'attendance-view',
			});
		});

		it('should return null when email is not found in external access fields', async () => {
			// Mock staff record without external access email
			const mockStaffRecord = {
				get: vi.fn((fieldId: string) => {
					if (fieldId === 'fldsR6gvnOsSEhfh9') { // EXTERNAL_ACCESS_EMAIL
						return undefined; // No external email
					}
					return undefined;
				}),
			};

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([mockStaffRecord]) });

			const result = await client.getExternalAccessByEmail('notfound@example.com');

			expect(result).toBeNull();
		});

		it('should return null when no staff records exist', async () => {
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			const result = await client.getExternalAccessByEmail('external@example.com');

			expect(result).toBeNull();
		});

		it('should return first match when multiple records have the same external email', async () => {
			// Mock multiple staff records with same external email
			const mockStaffRecord1 = {
				get: vi.fn((fieldId: string) => {
					if (fieldId === 'fldsR6gvnOsSEhfh9') { // EXTERNAL_ACCESS_EMAIL
						return 'external@example.com';
					}
					if (fieldId === 'fld5Z9dl265e22TPQ') { // EXTERNAL_ACCESS_NAME
						return 'First User';
					}
					return undefined;
				}),
			};

			const mockStaffRecord2 = {
				get: vi.fn((fieldId: string) => {
					if (fieldId === 'fldsR6gvnOsSEhfh9') { // EXTERNAL_ACCESS_EMAIL
						return 'external@example.com';
					}
					if (fieldId === 'fld5Z9dl265e22TPQ') { // EXTERNAL_ACCESS_NAME
						return 'Second User';
					}
					return undefined;
				}),
			};

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([mockStaffRecord1, mockStaffRecord2]) });

			const result = await client.getExternalAccessByEmail('external@example.com');

			expect(result).toEqual({
				type: 'external',
				email: 'external@example.com',
				name: 'First User', // Returns first match
				accessLevel: 'attendance-view',
			});
		});

		it('should handle Airtable errors gracefully', async () => {
			// Mock Airtable error
			mockTable.select.mockReturnValue({ all: vi.fn().mockRejectedValue(new Error('Airtable API error')) });

			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const result = await client.getExternalAccessByEmail('external@example.com');

			expect(result).toBeNull();
			expect(consoleSpy).toHaveBeenCalledWith(
				'Error fetching external access user:',
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});

		it('should call Airtable with correct parameters', async () => {
			const mockAll = vi.fn().mockResolvedValue([]);
			mockTable.select.mockReturnValue({ all: mockAll });

			await client.getExternalAccessByEmail('test@example.com');

			expect(mockTable.select).toHaveBeenCalledWith({
				returnFieldsByFieldId: true,
			});
			expect(mockAll).toHaveBeenCalled();
		});

		it('should skip records with missing external access email field', async () => {
			// Mock staff records - one with external email, one without
			const mockStaffRecord1 = {
				get: vi.fn((fieldId: string) => {
					if (fieldId === 'fldsR6gvnOsSEhfh9') { // EXTERNAL_ACCESS_EMAIL
						return undefined; // No external email
					}
					return undefined;
				}),
			};

			const mockStaffRecord2 = {
				get: vi.fn((fieldId: string) => {
					if (fieldId === 'fldsR6gvnOsSEhfh9') { // EXTERNAL_ACCESS_EMAIL
						return 'external@example.com';
					}
					if (fieldId === 'fld5Z9dl265e22TPQ') { // EXTERNAL_ACCESS_NAME
						return 'Found User';
					}
					return undefined;
				}),
			};

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([mockStaffRecord1, mockStaffRecord2]) });

			const result = await client.getExternalAccessByEmail('external@example.com');

			expect(result).toEqual({
				type: 'external',
				email: 'external@example.com',
				name: 'Found User',
				accessLevel: 'attendance-view',
			});
		});

		it('should handle empty string in external access name field', async () => {
			// Mock staff record with empty string name
			const mockStaffRecord = {
				get: vi.fn((fieldId: string) => {
					if (fieldId === 'fldsR6gvnOsSEhfh9') { // EXTERNAL_ACCESS_EMAIL
						return 'external@example.com';
					}
					if (fieldId === 'fld5Z9dl265e22TPQ') { // EXTERNAL_ACCESS_NAME
						return ''; // Empty string
					}
					return undefined;
				}),
			};

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([mockStaffRecord]) });

			const result = await client.getExternalAccessByEmail('external@example.com');

			expect(result).toEqual({
				type: 'external',
				email: 'external@example.com',
				name: 'External User', // Should use default for empty string
				accessLevel: 'attendance-view',
			});
		});
	});
});
