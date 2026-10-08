import { describe, expect, it } from 'vitest';
import { detectConflicts, expandWeeks, parseSchedule, weeksOf } from './schedule-conflict.service';
import type { CourseSlot } from './schedule-conflict.service';

function slot(partial: Partial<CourseSlot> & { name: string }): CourseSlot {
  return {
    id: partial.name,
    teacher: '',
    location: '',
    day: 1,
    startPeriod: 1,
    endPeriod: 2,
    weekMode: 'all',
    customWeeks: '',
    ...partial,
  };
}

describe('schedule-conflict', () => {
  it('detects a plain overlap on the same day', () => {
    const conflicts = detectConflicts([
      slot({ name: 'A', day: 1, startPeriod: 1, endPeriod: 2 }),
      slot({ name: 'B', day: 1, startPeriod: 2, endPeriod: 3 }),
    ]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].periods).toEqual([2]);
  });

  it('does not flag odd/even courses that never meet', () => {
    const conflicts = detectConflicts([
      slot({ name: 'A', day: 1, startPeriod: 1, endPeriod: 2, weekMode: 'odd' }),
      slot({ name: 'B', day: 1, startPeriod: 1, endPeriod: 2, weekMode: 'even' }),
    ]);

    expect(conflicts).toHaveLength(0);
  });

  it('computes the exact weeks two courses clash', () => {
    const conflicts = detectConflicts([
      slot({ name: 'A', day: 3, startPeriod: 5, endPeriod: 6, weekMode: 'custom', customWeeks: '1-8' }),
      slot({ name: 'B', day: 3, startPeriod: 5, endPeriod: 6, weekMode: 'custom', customWeeks: '5-12' }),
    ]);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].weeks).toEqual([5, 6, 7, 8]);
  });

  it('expands custom week ranges', () => {
    expect(expandWeeks('1-4,10')).toEqual([1, 2, 3, 4, 10]);
    expect(weeksOf(slot({ name: 'A', weekMode: 'odd' })).slice(0, 3)).toEqual([1, 3, 5]);
  });

  it('parses pasted timetable lines', () => {
    const parsed = parseSchedule('高等数学 周一 1-2节 1-16周 教三301');

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ name: '高等数学', day: 1, startPeriod: 1, endPeriod: 2, weekMode: 'custom', customWeeks: '1-16' });
  });
});
