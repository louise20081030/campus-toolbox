import { describe, expect, it } from 'vitest';
import {
  computeGpa,
  computeImprovementPlan,
  parseScoreInput,
  parseTranscript,
  scoreToPoint,
} from './gpa-calculator.service';
import type { CourseScore } from './gpa-calculator.service';

function course(name: string, credit: number, score: number | null, included = true): CourseScore {
  return { id: name, name, credit, score, rawScore: String(score ?? ''), included };
}

describe('gpa-calculator', () => {
  it('converts scores with the standard 4.0 scale', () => {
    expect(scoreToPoint(95, { id: 'standard4', name: '', max: 4, description: '', table: [{ min: 90, point: 4 }, { min: 80, point: 3 }, { min: 70, point: 2 }, { min: 60, point: 1 }, { min: 0, point: 0 }] })).toBe(4);
    expect(scoreToPoint(85, { id: 'standard4', name: '', max: 4, description: '', table: [{ min: 90, point: 4 }, { min: 80, point: 3 }, { min: 0, point: 0 }] })).toBe(3);
  });

  it('computes the credit weighted gpa and average', () => {
    const result = computeGpa({
      courses: [course('数学', 4, 90), course('英语', 2, 80)],
      scaleId: 'standard4',
    });

    // (4*4 + 2*3) / 6 = 3.6667
    expect(result.gpa).toBeCloseTo(3.6667, 4);
    expect(result.totalCredit).toBe(6);
    // (4*90 + 2*80) / 6 = 86.6667
    expect(result.weightedAverage).toBeCloseTo(86.6667, 4);
    expect(result.arithmeticAverage).toBe(85);
  });

  it('ignores excluded courses', () => {
    const result = computeGpa({
      courses: [course('数学', 4, 90), course('体育', 1, 60, false)],
      scaleId: 'standard4',
    });

    expect(result.totalCredit).toBe(4);
    expect(result.gpa).toBe(4);
  });

  it('parses level based scores', () => {
    expect(parseScoreInput('优')).toBe(95);
    expect(parseScoreInput('良好')).toBeNull();
    expect(parseScoreInput('88')).toBe(88);
    expect(parseScoreInput('')).toBeNull();
  });

  it('parses a transcript exported from the edu system', () => {
    const parsed = parseTranscript('课程名称\t学分\t成绩\n高等数学\t5\t88\n大学英语\t3\t优');

    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({ name: '高等数学', credit: 5, score: 88 });
    expect(parsed[1]).toMatchObject({ name: '大学英语', credit: 3, score: 95 });
  });

  it('ranks courses by how much they move the gpa', () => {
    const courses = [course('数学', 5, 70), course('英语', 1, 88)];
    const plan = computeImprovementPlan({ courses, scaleId: 'standard4', targetScore: 95 });

    expect(plan[0].name).toBe('数学');
    expect(plan[0].gain).toBeGreaterThan(plan[1]?.gain ?? 0);
    // 5 学分从 2.0 拉到 4.0：(5*4 + 1*3)/6 - (5*2 + 1*3)/6 = 1.6667
    expect(plan[0].gain).toBeCloseTo(1.6667, 4);
  });
});
