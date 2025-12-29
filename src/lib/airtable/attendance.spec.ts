import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAttendanceClient } from './attendance';
import { EVENT_FIELDS, ATTENDANCE_FIELDS } from './config';

// Mock Airtable
vi.mock('airtable', () => {
	const mockSelect = vi.fn();
	const mockCreate = vi.fn();

	return {
		default: {
			configure: vi.fn(),
			base: vi.fn(() => () => ({
				select: mockSelect,
				create: mockCreate,
			})),
		},
	};
});

import Airtable from 'airtable';

describe('attendance', () => {
	let client: ReturnType<typeof createAttendanceClient>;
	let mockTable: {
		select: ReturnType<typeof vi.fn>;
		create: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		client = createAttendanceClient('test-api-key', 'test-base-id');
		mockTable = (Airtable.base('test-base-id') as unknown as () => typeof mockTable)();
	});

	describe('hasUserCheckedIn', () => {
		it('should return true when user has checked in', async () => {
			const mockRecords = [{ id: 'recAttendance1' }];
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue(mockRecords) });

			const result = await client.hasUserCheckedIn('recEvent1', 'recApprentice1');

			expect(result).toBe(true);
			expect(mockTable.select).toHaveBeenCalledWith({
				filterByFormula: `AND({${ATTENDANCE_FIELDS.EVENT}} = "recEvent1", {${ATTENDANCE_FIELDS.APPRENTICE}} = "recApprentice1")`,
				maxRecords: 1,
			});
		});

		it('should return false when user has not checked in', async () => {
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			const result = await client.hasUserCheckedIn('recEvent1', 'recApprentice1');

			expect(result).toBe(false);
		});
	});

	describe('hasExternalCheckedIn', () => {
		it('should return true when email has checked in', async () => {
			const mockRecords = [{ id: 'recAttendance1' }];
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue(mockRecords) });

			const result = await client.hasExternalCheckedIn('recEvent1', 'test@example.com');

			expect(result).toBe(true);
		});

		it('should return false when email has not checked in', async () => {
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			const result = await client.hasExternalCheckedIn('recEvent1', 'test@example.com');

			expect(result).toBe(false);
		});
	});

	describe('createAttendance', () => {
		it('should create attendance record when valid', async () => {
			// Mock getEventInfo - event exists
			const mockEventRecord = {
				get: vi.fn((field: string) => {
					if (field === EVENT_FIELDS.PUBLIC) return false;
					return undefined;
				}),
			};
			// Mock hasUserCheckedIn - no duplicate
			// Mock create
			const mockCreatedRecord = { id: 'recNewAttendance' };

			mockTable.select
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue([mockEventRecord]) }) // getEventInfo
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue([]) }); // hasUserCheckedIn
			mockTable.create.mockResolvedValue(mockCreatedRecord);

			const result = await client.createAttendance({
				eventId: 'recEvent1',
				apprenticeId: 'recApprentice1',
			});

			expect(result.id).toBe('recNewAttendance');
			expect(result.eventId).toBe('recEvent1');
			expect(result.apprenticeId).toBe('recApprentice1');
			expect(result.status).toBe('Present');
			expect(mockTable.create).toHaveBeenCalled();
		});

		it('should throw error when event does not exist', async () => {
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			await expect(
				client.createAttendance({
					eventId: 'nonexistent',
					apprenticeId: 'recApprentice1',
				}),
			).rejects.toThrow('Event not found');
		});

		it('should throw error when user already checked in', async () => {
			// Mock getEventInfo - event exists
			const mockEventRecord = {
				get: vi.fn(() => false),
			};
			// Mock hasUserCheckedIn - duplicate exists
			const mockExistingAttendance = [{ id: 'recExisting' }];

			mockTable.select
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue([mockEventRecord]) })
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue(mockExistingAttendance) });

			await expect(
				client.createAttendance({
					eventId: 'recEvent1',
					apprenticeId: 'recApprentice1',
				}),
			).rejects.toThrow('User has already checked in to this event');
		});
	});

	describe('createExternalAttendance', () => {
		it('should create external attendance when event is public', async () => {
			// Mock getEventInfo - event exists and is public
			const mockEventRecord = {
				get: vi.fn((field: string) => {
					if (field === EVENT_FIELDS.PUBLIC) return true;
					return undefined;
				}),
			};
			const mockCreatedRecord = { id: 'recNewExternal' };

			mockTable.select
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue([mockEventRecord]) }) // getEventInfo
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue([]) }); // hasExternalCheckedIn
			mockTable.create.mockResolvedValue(mockCreatedRecord);

			const result = await client.createExternalAttendance({
				eventId: 'recEvent1',
				name: 'John Doe',
				email: 'john@example.com',
			});

			expect(result.id).toBe('recNewExternal');
			expect(result.externalName).toBe('John Doe');
			expect(result.externalEmail).toBe('john@example.com');
			expect(result.status).toBe('Present');
		});

		it('should throw error when event does not exist', async () => {
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			await expect(
				client.createExternalAttendance({
					eventId: 'nonexistent',
					name: 'John',
					email: 'john@example.com',
				}),
			).rejects.toThrow('Event not found');
		});

		it('should throw error when event is not public', async () => {
			const mockEventRecord = {
				get: vi.fn((field: string) => {
					if (field === EVENT_FIELDS.PUBLIC) return false;
					return undefined;
				}),
			};

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([mockEventRecord]) });

			await expect(
				client.createExternalAttendance({
					eventId: 'recEvent1',
					name: 'John',
					email: 'john@example.com',
				}),
			).rejects.toThrow('External check-in is only allowed for public events');
		});

		it('should throw error when email already checked in', async () => {
			const mockEventRecord = {
				get: vi.fn((field: string) => {
					if (field === EVENT_FIELDS.PUBLIC) return true;
					return undefined;
				}),
			};
			const mockExistingAttendance = [{ id: 'recExisting' }];

			mockTable.select
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue([mockEventRecord]) })
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue(mockExistingAttendance) });

			await expect(
				client.createExternalAttendance({
					eventId: 'recEvent1',
					name: 'John',
					email: 'john@example.com',
				}),
			).rejects.toThrow('This email has already checked in to this event');
		});
	});

	describe('getAttendanceForEvent', () => {
		it('should return mapped attendance records', async () => {
			const mockRecords = [
				{
					id: 'recAtt1',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[ATTENDANCE_FIELDS.APPRENTICE]: ['recApprentice1'],
							[ATTENDANCE_FIELDS.CHECKIN_TIME]: '2025-01-06T10:00:00.000Z',
							[ATTENDANCE_FIELDS.STATUS]: 'Present',
						};
						return data[field];
					}),
				},
				{
					id: 'recAtt2',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[ATTENDANCE_FIELDS.EXTERNAL_NAME]: 'John Doe',
							[ATTENDANCE_FIELDS.EXTERNAL_EMAIL]: 'john@example.com',
							[ATTENDANCE_FIELDS.CHECKIN_TIME]: '2025-01-06T10:05:00.000Z',
							[ATTENDANCE_FIELDS.STATUS]: 'Present',
						};
						return data[field];
					}),
				},
			];

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue(mockRecords) });

			const attendance = await client.getAttendanceForEvent('recEvent1');

			expect(attendance).toHaveLength(2);
			expect(attendance[0]).toEqual({
				id: 'recAtt1',
				eventId: 'recEvent1',
				apprenticeId: 'recApprentice1',
				externalName: undefined,
				externalEmail: undefined,
				checkinTime: '2025-01-06T10:00:00.000Z',
				status: 'Present',
			});
			expect(attendance[1]).toEqual({
				id: 'recAtt2',
				eventId: 'recEvent1',
				apprenticeId: undefined,
				externalName: 'John Doe',
				externalEmail: 'john@example.com',
				checkinTime: '2025-01-06T10:05:00.000Z',
				status: 'Present',
			});
		});

		it('should return empty array when no attendance', async () => {
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			const attendance = await client.getAttendanceForEvent('recEvent1');

			expect(attendance).toEqual([]);
		});
	});
});
