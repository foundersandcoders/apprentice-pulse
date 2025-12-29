import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEventsClient } from './events';

// Mock Airtable
vi.mock('airtable', () => {
	const mockSelect = vi.fn();
	const mockFind = vi.fn();
	const mockCreate = vi.fn();
	const mockUpdate = vi.fn();
	const mockDestroy = vi.fn();

	return {
		default: {
			configure: vi.fn(),
			base: vi.fn(() => () => ({
				select: mockSelect,
				find: mockFind,
				create: mockCreate,
				update: mockUpdate,
				destroy: mockDestroy,
			})),
		},
	};
});

import Airtable from 'airtable';

describe('events', () => {
	let client: ReturnType<typeof createEventsClient>;
	let mockTable: {
		select: ReturnType<typeof vi.fn>;
		find: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
		update: ReturnType<typeof vi.fn>;
		destroy: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		client = createEventsClient('test-api-key', 'test-base-id');
		// Get reference to mock table
		mockTable = (Airtable.base('test-base-id') as unknown as () => typeof mockTable)();
	});

	describe('listEvents', () => {
		it('should return mapped events', async () => {
			const mockRecords = [
				{
					id: 'rec123',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							fldMCZijN6TJeUdFR: 'Week 1 Monday',
							fld8AkM3EanzZa5QX: '2025-01-06T10:00:00.000Z',
							fldcXDEDkeHvWTnxE: ['recCohort1'],
							fldo7fwAsFhkA1icC: 'Regular class',
							fld9XBHnCWBtZiZah: 'https://survey.example.com',
							fldcPf53fVfStFZsa: ['recAttend1', 'recAttend2'], // ATTENDANCE field
						};
						return data[field];
					}),
				},
			];

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue(mockRecords) });

			const events = await client.listEvents();

			expect(events).toHaveLength(1);
			expect(events[0]).toEqual({
				id: 'rec123',
				name: 'Week 1 Monday',
				dateTime: '2025-01-06T10:00:00.000Z',
				cohortId: 'recCohort1',
				eventType: 'Regular class',
				surveyUrl: 'https://survey.example.com',
				isPublic: false,
				checkInCode: undefined,
				attendanceCount: 2,
			});
		});
	});

	describe('getEvent', () => {
		it('should return event when found', async () => {
			const mockRecord = {
				id: 'rec123',
				get: vi.fn((field: string) => {
					const data: Record<string, unknown> = {
						fldMCZijN6TJeUdFR: 'Workshop',
						fld8AkM3EanzZa5QX: '2025-01-07T14:00:00.000Z',
						fldcXDEDkeHvWTnxE: ['recCohort2'],
						fldo7fwAsFhkA1icC: 'Workshop',
						fld9XBHnCWBtZiZah: undefined,
					};
					return data[field];
				}),
			};

			// getEvent uses select() with RECORD_ID filter instead of find()
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([mockRecord]) });

			const event = await client.getEvent('rec123');

			expect(event).toEqual({
				id: 'rec123',
				name: 'Workshop',
				dateTime: '2025-01-07T14:00:00.000Z',
				cohortId: 'recCohort2',
				eventType: 'Workshop',
				surveyUrl: undefined,
				isPublic: false,
				checkInCode: undefined,
			});
		});

		it('should return null when not found', async () => {
			// getEvent uses select() - empty array means not found
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			const event = await client.getEvent('nonexistent');

			expect(event).toBeNull();
		});
	});

	describe('createEvent', () => {
		it('should create and return new event', async () => {
			const mockRecord = { id: 'recNew123' };
			mockTable.create.mockResolvedValue(mockRecord);

			const input = {
				name: 'New Event',
				dateTime: '2025-01-08T09:00:00.000Z',
				cohortId: 'recCohort1',
				eventType: 'Workshop' as const,
				surveyUrl: 'https://survey.example.com',
			};

			const event = await client.createEvent(input);

			expect(event).toEqual({
				id: 'recNew123',
				...input,
				isPublic: false,
				checkInCode: undefined,
			});
			expect(mockTable.create).toHaveBeenCalled();
		});
	});

	describe('updateEvent', () => {
		it('should update and return event', async () => {
			const mockRecord = {
				id: 'rec123',
				get: vi.fn((field: string) => {
					const data: Record<string, unknown> = {
						fldMCZijN6TJeUdFR: 'Updated Name',
						fld8AkM3EanzZa5QX: '2025-01-06T10:00:00.000Z',
						fldcXDEDkeHvWTnxE: ['recCohort1'],
						fldo7fwAsFhkA1icC: 'Regular class',
						fld9XBHnCWBtZiZah: undefined,
					};
					return data[field];
				}),
			};
			mockTable.update.mockResolvedValue(mockRecord);

			const event = await client.updateEvent('rec123', { name: 'Updated Name' });

			expect(event.name).toBe('Updated Name');
			expect(mockTable.update).toHaveBeenCalledWith('rec123', expect.any(Object));
		});
	});

	describe('deleteEvent', () => {
		it('should delete event', async () => {
			mockTable.destroy.mockResolvedValue({});

			await client.deleteEvent('rec123');

			expect(mockTable.destroy).toHaveBeenCalledWith('rec123');
		});
	});
});
