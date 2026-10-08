/**
 * 校园工具箱 · 绩点 / 学分 / 加权平均分换算器
 *
 * 全部计算在浏览器本地完成，成绩数据只保存在 localStorage，不会上传到任何服务器。
 */

export interface CourseScore {
  id: string
  /** 课程名称 */
  name: string
  /** 学分 */
  credit: number
  /** 百分制成绩；等级制成绩会被换算成百分制中位数后填入 */
  score: number | null
  /** 原始输入（可能是 "85"、"优"、"A-"、"" ） */
  rawScore: string
  /** 是否计入 GPA（体育课、任选课、重修前的旧成绩等可以手动排除） */
  included: boolean
}

export interface GradeScale {
  id: string
  name: string
  /** 该算法下的满分绩点 */
  max: number
  /** 算法说明，直接展示给用户，方便对照学校教务处的口径 */
  description: string
  /** 分档表（按分数从高到低匹配） */
  table?: { min: number; point: number }[]
  /** 连续公式（当没有分档表时使用） */
  formula?: (score: number) => number
}

/** 等级制成绩 → 百分制中位数 */
export const LEVEL_TO_SCORE: Record<string, number> = {
  '优': 95,
  '优秀': 95,
  'a': 95,
  'a+': 98,
  'a-': 92,
  '良': 85,
  'b': 85,
  'b+': 88,
  'b-': 82,
  '中': 75,
  'c': 75,
  'c+': 78,
  'c-': 72,
  '及格': 65,
  'd': 65,
  'd+': 68,
  'd-': 62,
  '不及格': 0,
  'f': 0,
  '通过': 75,
  '不通过': 0,
  '合格': 75,
  '不合格': 0,
  'p': 75,
  'np': 0,
};

export const GRADE_SCALES: GradeScale[] = [
  {
    id: 'standard4',
    name: '标准算法（4.0 制）',
    max: 4,
    description: '90 分及以上 = 4.0，每 10 分一档，60 分以下为 0。最常见的粗分档口径。',
    table: [
      { min: 90, point: 4 },
      { min: 80, point: 3 },
      { min: 70, point: 2 },
      { min: 60, point: 1 },
      { min: 0, point: 0 },
    ],
  },
  {
    id: 'beida4',
    name: '北大算法（4.0 制）',
    max: 4,
    description: '90-100→4.0，85-89→3.7，82-84→3.3，78-81→3.0，75-77→2.7，72-74→2.3，68-71→2.0，64-67→1.5，60-63→1.0。',
    table: [
      { min: 90, point: 4 },
      { min: 85, point: 3.7 },
      { min: 82, point: 3.3 },
      { min: 78, point: 3 },
      { min: 75, point: 2.7 },
      { min: 72, point: 2.3 },
      { min: 68, point: 2 },
      { min: 64, point: 1.5 },
      { min: 60, point: 1 },
      { min: 0, point: 0 },
    ],
  },
  {
    id: 'zheda5',
    name: '浙大算法（5.0 制）',
    max: 5,
    description: '绩点 = 分数 ÷ 10 − 5（60 分起算，100 分 = 5.0），60 分以下为 0。',
    formula: score => (score >= 60 ? Math.min(5, score / 10 - 5) : 0),
  },
  {
    id: 'zheda4',
    name: '浙大算法（4.0 制）',
    max: 4,
    description: '85 分及以上 = 4.0，84 分往下每 3 分一档递减，60 分以下为 0。',
    table: [
      { min: 85, point: 4 },
      { min: 82, point: 3.7 },
      { min: 78, point: 3.3 },
      { min: 75, point: 3 },
      { min: 72, point: 2.7 },
      { min: 68, point: 2.3 },
      { min: 64, point: 2 },
      { min: 61, point: 1.5 },
      { min: 60, point: 1 },
      { min: 0, point: 0 },
    ],
  },
  {
    id: 'wes4',
    name: 'WES 算法（4.0 制）',
    max: 4,
    description: '出国申请 WES 成绩认证常用口径：85-100→4.0，80-84→3.7，75-79→3.3，70-74→3.0，65-69→2.7，60-64→2.3。',
    table: [
      { min: 85, point: 4 },
      { min: 80, point: 3.7 },
      { min: 75, point: 3.3 },
      { min: 70, point: 3 },
      { min: 65, point: 2.7 },
      { min: 60, point: 2.3 },
      { min: 0, point: 0 },
    ],
  },
  {
    id: 'custom',
    name: '自定义分档表',
    max: 4,
    description: '按 “分数:绩点” 从高到低填写，例如 90:4.0, 85:3.7, 60:1.0。可用于对齐本校教务处的特殊口径。',
    table: [
      { min: 90, point: 4 },
      { min: 80, point: 3 },
      { min: 70, point: 2 },
      { min: 60, point: 1 },
      { min: 0, point: 0 },
    ],
  },
];

export interface GpaResult {
  /** 学分加权 GPA */
  gpa: number
  /** 已计入的总学分 */
  totalCredit: number
  /** 学分加权平均分（百分制） */
  weightedAverage: number
  /** 算术平均分（不看学分） */
  arithmeticAverage: number
  /** 已取得的总绩点（gpa × 学分） */
  totalPoints: number
  /** 不及格门数 */
  failedCount: number
  /** 参与计算的课程数 */
  courseCount: number
}

export function getGradeScale(id: string): GradeScale {
  return GRADE_SCALES.find(scale => scale.id === id) ?? GRADE_SCALES[0];
}

/** 解析 “90:4.0, 85:3.7, 60:1.0” 形式的自定义分档表 */
export function parseCustomTable(input: string): { min: number; point: number }[] {
  const entries = input
    .split(/[,，\n;；]/)
    .map(part => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [rawMin, rawPoint] = part.split(/[:：\s]+/);
      return { min: Number(rawMin), point: Number(rawPoint) };
    })
    .filter(({ min, point }) => Number.isFinite(min) && Number.isFinite(point))
    .sort((a, b) => b.min - a.min);

  if (!entries.length || entries[entries.length - 1].min > 0) {
    entries.push({ min: 0, point: 0 });
  }

  return entries;
}

export function scoreToPoint(score: number, scale: GradeScale, customTable?: { min: number; point: number }[]): number {
  const table = scale.id === 'custom' ? (customTable ?? scale.table ?? []) : scale.table;

  if (table?.length) {
    const hit = table.find(({ min }) => score >= min);
    return hit ? hit.point : 0;
  }

  if (scale.formula) {
    return scale.formula(score);
  }

  return 0;
}

/** 把 “优 / A- / 88 / 88.5” 之类的原始输入解析成百分制成绩 */
export function parseScoreInput(raw: string): number | null {
  const value = raw.trim();
  if (!value) {
    return null;
  }

  const numeric = Number(value.replace(/分$/, ''));
  if (Number.isFinite(numeric)) {
    return clampScore(numeric);
  }

  const level = LEVEL_TO_SCORE[value.toLowerCase()];
  return level === undefined ? null : level;
}

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }
  return Math.min(100, Math.max(0, score));
}

export function computeGpa({
  courses,
  scaleId,
  customTable,
}: {
  courses: CourseScore[]
  scaleId: string
  customTable?: { min: number; point: number }[]
}): GpaResult {
  const scale = getGradeScale(scaleId);
  const counted = courses.filter(course => course.included && course.score !== null && course.credit > 0);

  const totalCredit = sum(counted.map(course => course.credit));
  const totalPoints = sum(counted.map(course => scoreToPoint(course.score as number, scale, customTable) * course.credit));
  const weightedScoreSum = sum(counted.map(course => (course.score as number) * course.credit));

  return {
    gpa: totalCredit > 0 ? totalPoints / totalCredit : 0,
    totalCredit,
    weightedAverage: totalCredit > 0 ? weightedScoreSum / totalCredit : 0,
    arithmeticAverage: counted.length ? sum(counted.map(course => course.score as number)) / counted.length : 0,
    totalPoints,
    failedCount: counted.filter(course => (course.score as number) < 60).length,
    courseCount: counted.length,
  };
}

/**
 * 提分性价比榜：把每一门课单独拉到目标分数，看 GPA 能涨多少。
 * 这是同类网页工具基本没有的功能 —— 它能直接回答“我下一学期该重点冲哪门课”。
 */
export function computeImprovementPlan({
  courses,
  scaleId,
  customTable,
  targetScore,
}: {
  courses: CourseScore[]
  scaleId: string
  customTable?: { min: number; point: number }[]
  targetScore: number
}): { id: string; name: string; credit: number; score: number; newGpa: number; gain: number }[] {
  const base = computeGpa({ courses, scaleId, customTable });

  return courses
    .filter(course => course.included && course.score !== null && course.credit > 0)
    .map((course) => {
      const score = course.score as number;
      if (score >= targetScore) {
        return { id: course.id, name: course.name, credit: course.credit, score, newGpa: base.gpa, gain: 0 };
      }

      const patched = courses.map(item => (item.id === course.id ? { ...item, score: targetScore } : item));
      const next = computeGpa({ courses: patched, scaleId, customTable });

      return {
        id: course.id,
        name: course.name,
        credit: course.credit,
        score,
        newGpa: next.gpa,
        gain: next.gpa - base.gpa,
      };
    })
    .filter(item => item.gain > 0)
    .sort((a, b) => b.gain - a.gain);
}

/**
 * 反推：想达到目标 GPA，还需要补多少“绩点×学分”。
 * 返回按学分从大到小贪心选课时，需要把哪些课提到目标分。
 */
export function computeTargetPlan({
  courses,
  scaleId,
  customTable,
  targetGpa,
  targetScore,
}: {
  courses: CourseScore[]
  scaleId: string
  customTable?: { min: number; point: number }[]
  targetGpa: number
  targetScore: number
}): { reachable: boolean; neededPoints: number; picked: string[]; finalGpa: number } {
  const scale = getGradeScale(scaleId);
  const counted = courses.filter(course => course.included && course.score !== null && course.credit > 0);
  const totalCredit = sum(counted.map(course => course.credit));

  if (!totalCredit) {
    return { reachable: false, neededPoints: 0, picked: [], finalGpa: 0 };
  }

  const currentPoints = sum(
    counted.map(course => scoreToPoint(course.score as number, scale, customTable) * course.credit),
  );
  const neededPoints = targetGpa * totalCredit - currentPoints;

  if (neededPoints <= 0) {
    return { reachable: true, neededPoints: 0, picked: [], finalGpa: currentPoints / totalCredit };
  }

  const candidates = counted
    .map((course) => {
      const current = scoreToPoint(course.score as number, scale, customTable) * course.credit;
      const upgraded = scoreToPoint(clampScore(targetScore), scale, customTable) * course.credit;
      return { id: course.id, gain: upgraded - current };
    })
    .filter(item => item.gain > 0)
    .sort((a, b) => b.gain - a.gain);

  const picked: string[] = [];
  let accumulated = 0;
  for (const candidate of candidates) {
    if (accumulated >= neededPoints) {
      break;
    }
    picked.push(candidate.id);
    accumulated += candidate.gain;
  }

  return {
    reachable: accumulated >= neededPoints,
    neededPoints,
    picked,
    finalGpa: (currentPoints + accumulated) / totalCredit,
  };
}

/** 识别教务系统导出的成绩表：支持 CSV / TSV / 连续空格分隔，中英文表头 */
export function parseTranscript(text: string): CourseScore[] {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const scoredLines = lines
    .map(line => ({ line, score: headerScore(line) }))
    .sort((a, b) => b.score - a.score);

  const headerIndex = scoredLines[0]?.score > 0 ? lines.indexOf(scoredLines[0].line) : -1;
  const body = headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines;

  const columns = headerIndex >= 0 ? splitRow(lines[headerIndex]) : null;
  const nameIdx = columns ? findColumn(columns, ['课程名称', '课程名', '课程', '科目', 'course', 'name']) : 0;
  const creditIdx = columns ? findColumn(columns, ['学分', 'credit', 'credits', '学分/学时']) : 1;
  const scoreIdx = columns ? findColumn(columns, ['成绩', '分数', '总评', '总评成绩', '期末成绩', 'score', 'grade', 'mark']) : 2;

  const courses: CourseScore[] = [];

  for (const line of body) {
    const cells = splitRow(line);
    if (cells.length < 3) {
      continue;
    }

    const name = (cells[nameIdx] ?? cells[0] ?? '').replace(/^["']|["']$/g, '').trim();
    const credit = Number((cells[creditIdx] ?? '').replace(/[^\d.]/g, ''));
    const rawScore = (cells[scoreIdx] ?? '').replace(/^["']|["']$/g, '').trim();

    if (!name || !Number.isFinite(credit) || credit <= 0) {
      continue;
    }

    courses.push({
      id: generateId(),
      name,
      credit,
      score: parseScoreInput(rawScore),
      rawScore,
      included: true,
    });
  }

  return courses;
}

function headerScore(line: string): number {
  const keywords = ['课程', '学分', '成绩', 'course', 'credit', 'score', 'grade'];
  const lower = line.toLowerCase();
  return keywords.reduce((acc, keyword) => (lower.includes(keyword) ? acc + 1 : acc), 0);
}

function splitRow(line: string): string[] {
  if (line.includes('\t')) {
    return line.split('\t');
  }
  if (line.includes(',')) {
    return line.split(',');
  }
  if (line.includes('，')) {
    return line.split('，');
  }
  return line.split(/\s{2,}|\s+/);
}

function findColumn(columns: string[], candidates: string[]): number {
  for (const candidate of candidates) {
    const index = columns.findIndex(column => column.trim().toLowerCase().includes(candidate.toLowerCase()));
    if (index >= 0) {
      return index;
    }
  }
  return -1;
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}
