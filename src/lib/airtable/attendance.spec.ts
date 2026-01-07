import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAttendanceClient } from './attendance';
import { EVENT_FIELDS, ATTENDANCE_FIELDS, APPRENTICE_FIELDS } from './config';

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
			const mockRecords = [
				{
					id: 'recAttendance1',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[ATTENDANCE_FIELDS.EVENT]: ['recEvent1'],
							[ATTENDANCE_FIELDS.APPRENTICE]: ['recApprentice1'],
						};
						return data[field];
					}),
				},
			];
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue(mockRecords) });

			const result = await client.hasUserCheckedIn('recEvent1', 'recApprentice1');

			expect(result).toBe(true);
		});

		it('should return false when user has not checked in', async () => {
			const mockRecords = [
				{
					id: 'recAttendance1',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[ATTENDANCE_FIELDS.EVENT]: ['recOtherEvent'],
							[ATTENDANCE_FIELDS.APPRENTICE]: ['recOtherApprentice'],
						};
						return data[field];
					}),
				},
			];
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue(mockRecords) });

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
			// Mock hasUserCheckedIn - duplicate exists (with proper get method for JS filtering)
			const mockExistingAttendance = [
				{
					id: 'recExisting',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[ATTENDANCE_FIELDS.EVENT]: ['recEvent1'],
							[ATTENDANCE_FIELDS.APPRENTICE]: ['recApprentice1'],
						};
						return data[field];
					}),
				},
			];

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

	describe('getAllAttendance', () => {
		it('should return all attendance records', async () => {
			const mockRecords = [
				{
					id: 'recAtt1',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[ATTENDANCE_FIELDS.APPRENTICE]: ['recApprentice1'],
							[ATTENDANCE_FIELDS.EVENT]: ['recEvent1'],
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
							[ATTENDANCE_FIELDS.APPRENTICE]: ['recApprentice2'],
							[ATTENDANCE_FIELDS.EVENT]: ['recEvent1'],
							[ATTENDANCE_FIELDS.CHECKIN_TIME]: '2025-01-06T10:05:00.000Z',
							[ATTENDANCE_FIELDS.STATUS]: 'Late',
						};
						return data[field];
					}),
				},
			];

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue(mockRecords) });

			const attendance = await client.getAllAttendance();

			expect(attendance).toHaveLength(2);
			expect(attendance[0].id).toBe('recAtt1');
			expect(attendance[0].status).toBe('Present');
			expect(attendance[1].id).toBe('recAtt2');
			expect(attendance[1].status).toBe('Late');
		});

		it('should return empty array when no records', async () => {
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			const attendance = await client.getAllAttendance();

			expect(attendance).toEqual([]);
		});
	});

	describe('getAllEvents', () => {
		it('should return all events with cohort IDs', async () => {
			const mockRecords = [
				{
					id: 'recEvent1',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[EVENT_FIELDS.DATE_TIME]: '2025-01-06T09:00:00.000Z',
							[EVENT_FIELDS.COHORT]: ['recCohort1', 'recCohort2'],
						};
						return data[field];
					}),
				},
				{
					id: 'recEvent2',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[EVENT_FIELDS.DATE_TIME]: '2025-01-07T09:00:00.000Z',
							[EVENT_FIELDS.COHORT]: ['recCohort1'],
						};
						return data[field];
					}),
				},
			];

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue(mockRecords) });

			const events = await client.getAllEvents();

			expect(events).toHaveLength(2);
			expect(events[0].id).toBe('recEvent1');
			expect(events[0].cohortIds).toEqual(['recCohort1', 'recCohort2']);
			expect(events[1].id).toBe('recEvent2');
			expect(events[1].cohortIds).toEqual(['recCohort1']);
		});

		it('should handle events without cohorts', async () => {
			const mockRecords = [
				{
					id: 'recEvent1',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[EVENT_FIELDS.DATE_TIME]: '2025-01-06T09:00:00.000Z',
							[EVENT_FIELDS.COHORT]: undefined,
						};
						return data[field];
					}),
				},
			];

			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue(mockRecords) });

			const events = await client.getAllEvents();

			expect(events[0].cohortIds).toEqual([]);
		});
	});

	describe('getApprenticeStats', () => {
		it('should return null when apprentice not found', async () => {
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			const stats = await client.getApprenticeStats('nonexistent');

			expect(stats).toBeNull();
		});
	});

	describe('getCohortAttendanceStats', () => {
		it('should return null when cohort not found', async () => {
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			const stats = await client.getCohortAttendanceStats('nonexistent');

			expect(stats).toBeNull();
		});
	});

	describe('getAttendanceSummary', () => {
		it('should return summary with zero values when no data', async () => {
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			const summary = await client.getAttendanceSummary();

			expect(summary.totalApprentices).toBe(0);
			expect(summary.overall.totalEvents).toBe(0);
			expect(summary.overall.attendanceRate).toBe(0);
			expect(summary.lowAttendanceCount).toBe(0);
			expect(summary.recentCheckIns).toBe(0);
		});
	});

	describe('getApprenticeAttendanceHistory', () => {
		it('should return empty array when apprentice not found', async () => {
			mockTable.select.mockReturnValue({ all: vi.fn().mockResolvedValue([]) });

			const history = await client.getApprenticeAttendanceHistory('nonexistent');

			expect(history).toEqual([]);
		});

		it('should return history entries with attendance status', async () => {
			// Mock apprentice
			const mockApprentice = {
				id: 'recApprentice1',
				get: vi.fn((field: string) => {
					const data: Record<string, unknown> = {
						[APPRENTICE_FIELDS.NAME]: 'Test Apprentice',
						[APPRENTICE_FIELDS.COHORT]: ['recCohort1'],
					};
					return data[field];
				}),
			};

			// Mock events for cohort
			const mockEvents = [
				{
					id: 'recEvent1',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[EVENT_FIELDS.NAME]: 'Monday Class',
							[EVENT_FIELDS.DATE_TIME]: '2025-01-06T09:00:00.000Z',
							[EVENT_FIELDS.COHORT]: ['recCohort1'],
						};
						return data[field];
					}),
				},
				{
					id: 'recEvent2',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[EVENT_FIELDS.NAME]: 'Tuesday Class',
							[EVENT_FIELDS.DATE_TIME]: '2025-01-07T09:00:00.000Z',
							[EVENT_FIELDS.COHORT]: ['recCohort1'],
						};
						return data[field];
					}),
				},
			];

			// Mock attendance (only for first event)
			const mockAttendance = [
				{
					id: 'recAtt1',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[ATTENDANCE_FIELDS.EVENT]: ['recEvent1'],
							[ATTENDANCE_FIELDS.APPRENTICE]: ['recApprentice1'],
							[ATTENDANCE_FIELDS.CHECKIN_TIME]: '2025-01-06T09:05:00.000Z',
							[ATTENDANCE_FIELDS.STATUS]: 'Present',
						};
						return data[field];
					}),
				},
			];

			mockTable.select
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue([mockApprentice]) }) // get apprentice
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue(mockEvents) }) // get events
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue(mockAttendance) }); // get attendance

			const history = await client.getApprenticeAttendanceHistory('recApprentice1');

			expect(history).toHaveLength(2);
			// History is sorted by date descending (most recent first)
			expect(history[0].eventName).toBe('Tuesday Class');
			expect(history[0].status).toBe('Not Check-in'); // No attendance record = Not Check-in
			expect(history[1].eventName).toBe('Monday Class');
			expect(history[1].status).toBe('Present');
			expect(history[1].checkinTime).toBe('2025-01-06T09:05:00.000Z');
		});

		it('should mark events without attendance as Not Check-in', async () => {
			// Mock apprentice with cohort
			const mockApprentice = {
				id: 'recApprentice1',
				get: vi.fn((field: string) => {
					const data: Record<string, unknown> = {
						[APPRENTICE_FIELDS.NAME]: 'Test Apprentice',
						[APPRENTICE_FIELDS.COHORT]: ['recCohort1'],
					};
					return data[field];
				}),
			};

			// Mock event assigned to that cohort
			const mockEvents = [
				{
					id: 'recEvent1',
					get: vi.fn((field: string) => {
						const data: Record<string, unknown> = {
							[EVENT_FIELDS.NAME]: 'Event 1',
							[EVENT_FIELDS.DATE_TIME]: '2025-01-06T09:00:00.000Z',
							[EVENT_FIELDS.COHORT]: ['recCohort1'], // Assigned to apprentice's cohort
						};
						return data[field];
					}),
				},
			];

			mockTable.select
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue([mockApprentice]) })
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue(mockEvents) })
				.mockReturnValueOnce({ all: vi.fn().mockResolvedValue([]) }); // No attendance

			const history = await client.getApprenticeAttendanceHistory('recApprentice1');

			expect(history).toHaveLength(1);
			expect(history[0].status).toBe('Not Check-in');
			expect(history[0].checkinTime).toBeNull();
		});
	});
});
