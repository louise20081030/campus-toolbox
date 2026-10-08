/**
 * 校园工具箱 · 课表冲突检测与空闲时段计算
 *
 * 选课阶段最容易踩的坑：两门课周次单双周不同、但时间重叠，
 * 教务系统往往只提示“时间冲突”而不告诉你是哪几周撞了。这个工具算的是「周次 ∩ 节次」。
 */

export interface Period {
  index: number
  start: string
  end: string
}

export interface CourseSlot {
  id: string
  name: string
  teacher: string
  location: string
  /** 1 = 周一 ... 7 = 周日 */
  day: number
  startPeriod: number
  endPeriod: number
  /** 单双周模式 */
  weekMode: 'all' | 'odd' | 'even' | 'custom'
  /** 自定义周次，如 “1-8,10-16” */
  customWeeks: string
}

export interface Conflict {
  a: CourseSlot
  b: CourseSlot
  day: number
  /** 重叠的节次 */
  periods: number[]
  /** 重叠的周次 */
  weeks: number[]
}

export const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export const DEFAULT_PERIODS: Period[] = [
  { index: 1, start: '08:00', end: '08:45' },
  { index: 2, start: '08:55', end: '09:40' },
  { index: 3, start: '10:00', end: '10:45' },
  { index: 4, start: '10:55', end: '11:40' },
  { index: 5, start: '14:00', end: '14:45' },
  { index: 6, start: '14:55', end: '15:40' },
  { index: 7, start: '16:00', end: '16:45' },
  { index: 8, start: '16:55', end: '17:40' },
  { index: 9, start: '19:00', end: '19:45' },
  { index: 10, start: '19:55', end: '20:40' },
  { index: 11, start: '20:50', end: '21:35' },
  { index: 12, start: '21:45', end: '22:30' },
];

export function totalWeeks(): number {
  return 20;
}

export function periodRangeText(course: CourseSlot): string {
  const start = DEFAULT_PERIODS.find(period => period.index === course.startPeriod)?.start ?? '';
  const end = DEFAULT_PERIODS.find(period => period.index === course.endPeriod)?.end ?? '';
  return `${start}-${end}`;
}

/** 解析 “1 08:00 08:45” 形式的节次时间表 */
export function parsePeriodTable(text: string): Period[] {
  const periods = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [index, start, end] = line.split(/[\s,，]+/);
      return { index: Number(index), start: start ?? '', end: end ?? '' };
    })
    .filter(period => Number.isFinite(period.index) && period.start && period.end);

  return periods.length ? periods : DEFAULT_PERIODS;
}

/** 把 “1-8,10-16” 展开成周次数组 */
export function expandWeeks(input: string): number[] {
  const weeks = new Set<number>();

  for (const part of input.split(/[,，\s]/)) {
    const chunk = part.trim();
    if (!chunk) {
      continue;
    }

    const [rawStart, rawEnd] = chunk.split(/[-~－—]/);
    const start = Number(rawStart);
    const end = rawEnd === undefined ? start : Number(rawEnd);

    if (!Number.isFinite(start)) {
      continue;
    }

    const to = Number.isFinite(end) ? end : start;
    for (let week = Math.min(start, to); week <= Math.max(start, to); week += 1) {
      if (week >= 1 && week <= totalWeeks()) {
        weeks.add(week);
      }
    }
  }

  return [...weeks].sort((a, b) => a - b);
}

export function weeksOf(course: CourseSlot): number[] {
  switch (course.weekMode) {
    case 'odd':
      return Array.from({ length: totalWeeks() }, (_, index) => index + 1).filter(week => week % 2 === 1);
    case 'even':
      return Array.from({ length: totalWeeks() }, (_, index) => index + 1).filter(week => week % 2 === 0);
    case 'custom':
      return expandWeeks(course.customWeeks);
    default:
      return Array.from({ length: totalWeeks() }, (_, index) => index + 1);
  }
}

export function weeksText(course: CourseSlot): string {
  const weeks = weeksOf(course);
  if (course.weekMode === 'all') {
    return '全周';
  }
  if (course.weekMode === 'odd') {
    return '单周';
  }
  if (course.weekMode === 'even') {
    return '双周';
  }
  return weeks.length ? weeks.join('、') : '未填写周次';
}

export function detectConflicts(courses: CourseSlot[]): Conflict[] {
  const conflicts: Conflict[] = [];

  for (let i = 0; i < courses.length; i += 1) {
    for (let j = i + 1; j < courses.length; j += 1) {
      const a = courses[i];
      const b = courses[j];

      if (a.day !== b.day) {
        continue;
      }

      const periods: number[] = [];
      const from = Math.max(a.startPeriod, b.startPeriod);
      const to = Math.min(a.endPeriod, b.endPeriod);
      for (let period = from; period <= to; period += 1) {
        periods.push(period);
      }

      const weeksA = new Set(weeksOf(a));
      const weeks = weeksOf(b).filter(week => weeksA.has(week));

      if (periods.length && weeks.length) {
        conflicts.push({ a, b, day: a.day, periods, weeks });
      }
    }
  }

  return conflicts;
}

export interface FreeBlock {
  day: number
  periods: number[]
  label: string
}

/** 每个工作日/周末的空闲节次（连续段合并成一块） */
export function computeFreePeriods(courses: CourseSlot[]): FreeBlock[] {
  const maxPeriod = Math.max(...DEFAULT_PERIODS.map(period => period.index));

  return DAY_LABELS.map((_, index) => index + 1).map((day) => {
    const busy = new Set<number>();
    for (const course of courses) {
      if (course.day !== day) {
        continue;
      }
      for (let period = course.startPeriod; period <= course.endPeriod; period += 1) {
        busy.add(period);
      }
    }

    const free: number[] = [];
    for (let period = 1; period <= maxPeriod; period += 1) {
      if (!busy.has(period)) {
        free.push(period);
      }
    }

    return {
      day,
      periods: free,
      label: free.length ? groupPeriods(free) : '满课',
    };
  });
}

function groupPeriods(periods: number[]): string {
  const groups: string[] = [];
  let start = periods[0];
  let previous = periods[0];

  for (let i = 1; i <= periods.length; i += 1) {
    const current = periods[i];
    if (current !== previous + 1) {
      groups.push(start === previous ? `第${start}节` : `第${start}-${previous}节`);
      start = current;
    }
    previous = current;
  }

  return groups.join('、');
}

export interface ScheduleSummary {
  weeklyCourses: number
  weeklyPeriods: number
  weeklyMinutes: number
  freeDays: string[]
  busiestDay: string
}

export function summarize(courses: CourseSlot[]): ScheduleSummary {
  const periodsPerDay = DAY_LABELS.map((_, index) => index + 1).map((day) => {
    let count = 0;
    for (const course of courses) {
      if (course.day === day) {
        count += course.endPeriod - course.startPeriod + 1;
      }
    }
    return { day, count };
  });

  const weeklyPeriods = periodsPerDay.reduce((acc, item) => acc + item.count, 0);
  const busiest = [...periodsPerDay].sort((a, b) => b.count - a.count)[0];

  return {
    weeklyCourses: courses.length,
    weeklyPeriods,
    weeklyMinutes: weeklyPeriods * 45,
    freeDays: periodsPerDay.filter(item => item.count === 0).map(item => DAY_LABELS[item.day - 1]),
    busiestDay: busiest && busiest.count > 0 ? `${DAY_LABELS[busiest.day - 1]}（${busiest.count} 节）` : '—',
  };
}

const DAY_KEYWORDS: { day: number; keywords: string[] }[] = [
  { day: 1, keywords: ['周一', '星期一', '一', 'mon', 'monday'] },
  { day: 2, keywords: ['周二', '星期二', '二', 'tue', 'tuesday'] },
  { day: 3, keywords: ['周三', '星期三', '三', 'wed', 'wednesday'] },
  { day: 4, keywords: ['周四', '星期四', '四', 'thu', 'thursday'] },
  { day: 5, keywords: ['周五', '星期五', '五', 'fri', 'friday'] },
  { day: 6, keywords: ['周六', '星期六', '六', 'sat', 'saturday'] },
  { day: 7, keywords: ['周日', '星期日', '星期天', '日', '天', 'sun', 'sunday'] },
];

/**
 * 解析教务系统里复制出来的一行课表，例如：
 * 「高等数学A 周一 第1-2节 1-16周 教三-301 张老师」
 */
export function parseCourseLine(line: string): CourseSlot | null {
  const raw = line.trim();
  if (!raw) {
    return null;
  }

  const lower = raw.toLowerCase();
  const day = DAY_KEYWORDS.find(({ keywords }) => keywords.some(keyword => lower.includes(keyword)))?.day ?? 0;

  // 先把“周次”这一段从字符串里摘掉，避免 “1-16周” 被误判成节次范围
  const weekMatch = raw.match(/(\d+)\s*[-~－—]\s*(\d+)\s*周/);
  const rest = weekMatch ? raw.replace(weekMatch[0], ' ') : raw;
  const periodMatch = rest.match(/(\d+)\s*[-~－—]\s*(\d+)/);

  const startPeriod = periodMatch ? Number(periodMatch[1]) : 1;
  const endPeriod = periodMatch ? Number(periodMatch[2]) : startPeriod;

  let weekMode: CourseSlot['weekMode'] = 'all';
  let customWeeks = '';
  if (weekMatch) {
    weekMode = 'custom';
    customWeeks = `${weekMatch[1]}-${weekMatch[2]}`;
  }
  else if (/单周/.test(raw)) {
    weekMode = 'odd';
  }
  else if (/双周/.test(raw)) {
    weekMode = 'even';
  }

  // 课程名 = 去掉星期、节次、周次、地点、教师之后剩下的第一个词
  const tokens = raw.split(/[\t,，]|\s+/).map(token => token.trim()).filter(Boolean);
  const isMetaToken = (token: string) =>
    /周[一二三四五六日天]?$/.test(token)
    || /^星期/.test(token)
    || /\d+\s*[-~－—]\s*\d+/.test(token)
    || /^\d+$/.test(token)
    || /节$/.test(token)
    || /(老师|教师|任课)$/.test(token)
    || LOCATION_HINTS.some(hint => token.includes(hint));

  const name = tokens.find(token => !isMetaToken(token))?.replace(/^["']|["']$/g, '') ?? tokens[0] ?? '';

  return {
    id: generateId(),
    name,
    teacher: tokens.find(token => /(老师|教师|任课)$/.test(token)) ?? '',
    location: tokens.slice(1).find(token => LOCATION_HINTS.some(hint => token.includes(hint))) ?? '',
    day: day || 1,
    startPeriod: Math.min(startPeriod, endPeriod),
    endPeriod: Math.max(startPeriod, endPeriod),
    weekMode,
    customWeeks,
  };
}

export const LOCATION_HINTS = ['教', '楼', '机房', '实验室', '操场', '馆', '报告厅'];

export function parseSchedule(text: string): CourseSlot[] {
  return text
    .split(/\r?\n/)
    .map(line => parseCourseLine(line))
    .filter((course): course is CourseSlot => course !== null);
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
