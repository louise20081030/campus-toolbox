<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import {
  DAY_LABELS,
  DEFAULT_PERIODS,
  computeFreePeriods,
  detectConflicts,
  generateId,
  parseSchedule,
  weeksText,
} from './schedule-conflict.service';
import type { CourseSlot } from './schedule-conflict.service';

const message = useMessage();

function createSlot(partial: Partial<CourseSlot> = {}): CourseSlot {
  return {
    id: generateId(),
    name: '',
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

const courses = useStorage<CourseSlot[]>('schedule-conflict:courses', () => [
  createSlot({ name: '高等数学 A', day: 1, startPeriod: 1, endPeriod: 2, location: '教三-301', teacher: '张老师' }),
  createSlot({ name: '大学英语', day: 1, startPeriod: 3, endPeriod: 4, location: '外语楼-202' }),
  createSlot({ name: '体育（篮球）', day: 1, startPeriod: 3, endPeriod: 4, weekMode: 'odd', location: '东操场' }),
  createSlot({ name: '数据结构', day: 3, startPeriod: 5, endPeriod: 6, location: '信息楼-405' }),
  createSlot({ name: '马克思主义基本原理', day: 5, startPeriod: 9, endPeriod: 10, location: '教二-101' }),
]);

const draft = ref(createSlot());
const importText = ref('');

const dayOptions = DAY_LABELS.map((label, index) => ({ label, value: index + 1 }));
const weekModeOptions = [
  { label: '全周', value: 'all' },
  { label: '单周', value: 'odd' },
  { label: '双周', value: 'even' },
  { label: '自定义周次', value: 'custom' },
];
const periodOptions = DEFAULT_PERIODS.map(period => ({
  label: `第 ${period.index} 节 (${period.start})`,
  value: period.index,
}));

const conflicts = computed(() => detectConflicts(courses.value));
const freePeriods = computed(() => computeFreePeriods(courses.value));

const conflictCells = computed(() => {
  const cells = new Set<string>();
  for (const conflict of conflicts.value) {
    for (const period of conflict.periods) {
      cells.add(`${conflict.day}-${period}`);
    }
  }
  return cells;
});

const grid = computed(() =>
  DAY_LABELS.map((_, index) => {
    const day = index + 1;
    return {
      day,
      cells: DEFAULT_PERIODS.map((period) => {
        const items = courses.value.filter(
          course => course.day === day && period.index >= course.startPeriod && period.index <= course.endPeriod,
        );
        return {
          period: period.index,
          time: period.start,
          items,
          hasConflict: items.length > 1 && conflictCells.value.has(`${day}-${period.index}`),
        };
      }),
    };
  }),
);

const summary = computed(() => {
  const weeklyPeriods = courses.value.reduce((acc, course) => acc + (course.endPeriod - course.startPeriod + 1), 0);

  return {
    weeklyCourses: courses.value.length,
    weeklyPeriods,
    weeklyHours: (weeklyPeriods * 45) / 60,
    freeDays: freePeriods.value.filter(block => block.periods.length === DEFAULT_PERIODS.length).map(block => DAY_LABELS[block.day - 1]),
    noMorningDays: freePeriods.value
      .filter(block => block.periods.includes(1) && block.periods.includes(2))
      .map(block => DAY_LABELS[block.day - 1]),
  };
});

function addCourse() {
  if (!draft.value.name.trim()) {
    message.warning('先填一下课程名称');
    return;
  }
  courses.value = [...courses.value, { ...draft.value, id: generateId() }];
  draft.value = createSlot({ day: draft.value.day, startPeriod: draft.value.startPeriod, endPeriod: draft.value.endPeriod });
}

function removeCourse(id: string) {
  courses.value = courses.value.filter(course => course.id !== id);
}

function importCourses() {
  const parsed = parseSchedule(importText.value);
  if (!parsed.length) {
    message.warning('没有解析出课程，试试 “高等数学 周一 1-2节 1-16周 教三301” 这样的格式');
    return;
  }
  courses.value = [...courses.value, ...parsed];
  importText.value = '';
  message.success(`已导入 ${parsed.length} 门课程`);
}

function clearCourses() {
  courses.value = [];
}
</script>

<template>
  <div>
    <div text-justify op-70>
      把想选的课填进来，它会按「星期 × 节次 × 周次」做交集检测 —— 单双周错开的课不会被误判成冲突，撞车的课会精确到「第几周、第几节」。
    </div>

    <n-divider />

    <div flex flex-wrap items-end gap-2>
      <div min-w-180px flex-1>
        <c-input-text v-model:value="draft.name" label="课程名称" placeholder="高等数学 A" />
      </div>
      <div w-120px>
        <c-select v-model:value="draft.day" label="星期" :options="dayOptions" />
      </div>
      <div w-150px>
        <c-select v-model:value="draft.startPeriod" label="开始节次" :options="periodOptions" searchable />
      </div>
      <div w-150px>
        <c-select v-model:value="draft.endPeriod" label="结束节次" :options="periodOptions" searchable />
      </div>
      <div w-140px>
        <c-select v-model:value="draft.weekMode" label="周次" :options="weekModeOptions" />
      </div>
      <div v-if="draft.weekMode === 'custom'" w-140px>
        <c-input-text v-model:value="draft.customWeeks" label="周次范围" placeholder="1-8,10-16" />
      </div>
      <div min-w-140px flex-1>
        <c-input-text v-model:value="draft.location" label="上课地点" placeholder="教三-301" />
      </div>
    </div>

    <div mt-3 flex gap-2>
      <c-button @click="addCourse">
        + 添加课程
      </c-button>
      <c-button @click="clearCourses">
        清空
      </c-button>
    </div>

    <div v-if="courses.length" mt-3 overflow-x-auto>
      <table min-w-560px w-full text-14px>
        <thead>
          <tr text-12px op-60>
            <th py-2 text-left font-400>
              课程
            </th>
            <th w-70px py-2 text-left font-400>
              星期
            </th>
            <th w-90px py-2 text-left font-400>
              节次
            </th>
            <th w-160px py-2 text-left font-400>
              周次
            </th>
            <th w-140px py-2 text-left font-400>
              地点
            </th>
            <th w-60px py-2 font-400 />
          </tr>
        </thead>
        <tbody>
          <tr v-for="course in courses" :key="course.id" border-t="1px solid light:#00000010 dark:#ffffff10">
            <td py-1 pr-2>
              {{ course.name }}
              <span v-if="course.teacher" text-12px op-50>（{{ course.teacher }}）</span>
            </td>
            <td py-1 pr-2>
              {{ DAY_LABELS[course.day - 1] }}
            </td>
            <td py-1 pr-2>
              {{ course.startPeriod === course.endPeriod ? `第 ${course.startPeriod} 节` : `第 ${course.startPeriod}-${course.endPeriod} 节` }}
            </td>
            <td py-1 pr-2 op-80>
              {{ weeksText(course) }}
            </td>
            <td py-1 pr-2 op-70>
              {{ course.location }}
            </td>
            <td py-1 text-center>
              <c-button variant="text" size="small" circle @click="removeCourse(course.id)">
                ✕
              </c-button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <n-divider />

    <c-alert v-if="conflicts.length" type="warning" :title="`检测到 ${conflicts.length} 处冲突`">
      下面这些课在相同节次、相同周次撞车了，选课系统里它们可能只显示“时间冲突”但说不清是哪几周。
    </c-alert>
    <div v-else flex items-center gap-2 op-80>
      <n-tag type="success" size="small" round>
        无冲突
      </n-tag>
      <span>当前课表没有时间重叠，可以放心提交。</span>
    </div>

    <div v-if="conflicts.length" mt-3 overflow-x-auto>
      <table min-w-560px w-full text-14px>
        <thead>
          <tr text-12px op-60>
            <th py-2 text-left font-400>
              冲突课程
            </th>
            <th w-80px py-2 text-left font-400>
              星期
            </th>
            <th w-100px py-2 text-left font-400>
              重叠节次
            </th>
            <th py-2 text-left font-400>
              重叠周次
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(conflict, index) in conflicts" :key="index" border-t="1px solid light:#00000010 dark:#ffffff10">
            <td py-2 pr-2>
              <b>{{ conflict.a.name }}</b> × <b>{{ conflict.b.name }}</b>
            </td>
            <td py-2 pr-2>
              {{ DAY_LABELS[conflict.day - 1] }}
            </td>
            <td py-2 pr-2>
              第 {{ conflict.periods.join('、') }} 节
            </td>
            <td py-2>
              <span op-80>{{ conflict.weeks.join('、') }} 周</span>
              <span text-12px op-50>（共 {{ conflict.weeks.length }} 周）</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <n-divider />

    <h4 mb-2 text-15px fw-600>
      周课表
    </h4>
    <div overflow-x-auto>
      <table min-w-720px w-full border-collapse text-12px>
        <thead>
          <tr>
            <th w-60px py-1 font-400 op-60 />
            <th v-for="column in grid" :key="column.day" py-1 font-500 op-70>
              {{ DAY_LABELS[column.day - 1] }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="period in DEFAULT_PERIODS" :key="period.index">
            <td py-1 text-center op-60>
              <div>{{ period.index }}</div>
              <div text-11px>
                {{ period.start }}
              </div>
            </td>
            <td
              v-for="column in grid"
              :key="`${column.day}-${period.index}`"
              class="border border-gray-200 border-solid dark:border-gray-700"

              px-1 py-1 text-center
            >
              <div
                v-for="item in column.cells.find(cell => cell.period === period.index)?.items ?? []"
                :key="item.id"

                mb-1px b-rd-3px pa-1 text-11px lh-1.3
                :class="column.cells.find(cell => cell.period === period.index)?.hasConflict
                  ? 'important:bg-#e54545 important:text-white'
                  : 'important:bg-#1ea54c22'"
              >
                <div truncate>
                  {{ item.name }}
                </div>
                <div v-if="item.weekMode !== 'all'" text-10px op-70>
                  {{ item.weekMode === 'odd' ? '单周' : item.weekMode === 'even' ? '双周' : item.customWeeks }}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <n-divider />

    <div grid gap-4 lg:grid-cols-2>
      <div>
        <h4 mb-2 text-15px fw-600>
          空闲时段
        </h4>
        <div mb-2 text-13px op-60>
          按节次列出每周的空档，找自习、社团活动、实习时间都用它。
        </div>
        <c-table
          :data="freePeriods"
          :headers="[{ key: 'day', label: '星期' }, { key: 'label', label: '空闲节次' }, { key: 'count', label: '空档数' }]"
        >
          <template #day="{ row }">
            {{ DAY_LABELS[Number(row.day) - 1] }}
          </template>
          <template #count="{ row }">
            {{ (row.periods as number[]).length }} / {{ DEFAULT_PERIODS.length }}
          </template>
        </c-table>
      </div>

      <div>
        <h4 mb-2 text-15px fw-600>
          课表概览
        </h4>
        <div mb-2 text-13px op-60>
          一周跑多少趟教室，心里先有个数。
        </div>
        <c-card>
          <div flex flex-col gap-2>
            <div flex justify-between>
              <span op-70>课程门数</span><b>{{ summary.weeklyCourses }} 门</b>
            </div>
            <div flex justify-between>
              <span op-70>每周课时</span><b>{{ summary.weeklyPeriods }} 节（约 {{ summary.weeklyHours.toFixed(1) }} 小时）</b>
            </div>
            <div flex justify-between>
              <span op-70>整天没课</span><b>{{ summary.freeDays.length ? summary.freeDays.join('、') : '没有' }}</b>
            </div>
            <div flex justify-between>
              <span op-70>可以睡懒觉（前两节没课）</span><b>{{ summary.noMorningDays.length ? summary.noMorningDays.join('、') : '没有' }}</b>
            </div>
          </div>
        </c-card>
      </div>
    </div>

    <n-divider />

    <h4 mb-2 text-15px fw-600>
      批量粘贴导入
    </h4>
    <div mb-2 text-13px op-60>
      从教务系统或选课群里复制多行课表直接粘进来，每行一门课，例如「高等数学 周一 1-2节 1-16周 教三301」。
    </div>
    <c-input-text
      v-model:value="importText"
      multiline
      :rows="4"
      monospace
      placeholder="高等数学 周一 1-2节 1-16周 教三301&#10;体育（篮球） 周一 3-4节 单周 东操场"
    />
    <div mt-2>
      <c-button @click="importCourses">
        解析并导入
      </c-button>
    </div>
  </div>
</template>
