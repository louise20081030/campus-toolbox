<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import {
  GRADE_SCALES,
  computeGpa,
  computeImprovementPlan,
  computeTargetPlan,
  generateId,
  getGradeScale,
  parseCustomTable,
  parseScoreInput,
  parseTranscript,
  scoreToPoint,
} from './gpa-calculator.service';
import type { CourseScore } from './gpa-calculator.service';

const message = useMessage();
const { copy, isSupported: canCopy } = useClipboard({ legacy: true });

function createCourse(partial: Partial<CourseScore> = {}): CourseScore {
  return { id: generateId(), name: '', credit: 3, score: null, rawScore: '', included: true, ...partial };
}

const courses = useStorage<CourseScore[]>('gpa-calculator:courses', () => [
  createCourse({ name: '高等数学（上）', credit: 5, rawScore: '88', score: 88 }),
  createCourse({ name: '大学英语', credit: 3, rawScore: '优', score: 95 }),
  createCourse({ name: '数据结构', credit: 4, rawScore: '76', score: 76 }),
  createCourse({ name: '体育（一）', credit: 1, rawScore: '92', score: 92 }),
]);

const scaleId = useStorage('gpa-calculator:scale-id', 'standard4');
const customTableRaw = useStorage('gpa-calculator:custom-table', '90:4.0, 85:3.7, 82:3.3, 78:3.0, 75:2.7, 72:2.3, 68:2.0, 64:1.5, 60:1.0');
const importText = ref('');
const targetScore = useStorage('gpa-calculator:target-score', 90);
const targetGpa = useStorage('gpa-calculator:target-gpa', 3.5);

const scaleOptions = GRADE_SCALES.map(scale => ({ label: scale.name, value: scale.id }));
const customTable = computed(() => parseCustomTable(customTableRaw.value));
const activeScale = computed(() => getGradeScale(scaleId.value));

const result = computed(() => computeGpa({ courses: courses.value, scaleId: scaleId.value, customTable: customTable.value }));
const comparedScales = computed(() =>
  GRADE_SCALES.filter(scale => scale.id !== 'custom').map(scale => ({
    name: scale.name,
    max: scale.max,
    gpa: computeGpa({ courses: courses.value, scaleId: scale.id }).gpa,
  })),
);
const improvementPlan = computed(() =>
  computeImprovementPlan({
    courses: courses.value,
    scaleId: scaleId.value,
    customTable: customTable.value,
    targetScore: targetScore.value,
  }),
);
const targetPlan = computed(() =>
  computeTargetPlan({
    courses: courses.value,
    scaleId: scaleId.value,
    customTable: customTable.value,
    targetGpa: targetGpa.value,
    targetScore: targetScore.value,
  }),
);

function pointOf(course: CourseScore): number {
  return course.score === null ? 0 : scoreToPoint(course.score, activeScale.value, customTable.value);
}

function updateScore(course: CourseScore, raw: string) {
  course.rawScore = raw;
  course.score = parseScoreInput(raw);
}

function addCourse() {
  courses.value = [...courses.value, createCourse()];
}

function removeCourse(id: string) {
  courses.value = courses.value.filter(course => course.id !== id);
}

function clearCourses() {
  courses.value = [];
}

function importCourses() {
  const parsed = parseTranscript(importText.value);
  if (!parsed.length) {
    message.warning('没有解析出课程，请检查格式：每行 “课程名 / 学分 / 成绩” 三列');
    return;
  }
  courses.value = [...courses.value, ...parsed];
  importText.value = '';
  message.success(`已导入 ${parsed.length} 门课程`);
}

function toggleAllIncluded() {
  const allIncluded = courses.value.every(course => course.included);
  courses.value = courses.value.map(course => ({ ...course, included: !allIncluded }));
}

const csv = computed(() => {
  const rows = courses.value.map(course =>
    [course.name, course.credit, course.rawScore, pointOf(course).toFixed(2), course.included ? '是' : '否'].join(','),
  );
  return ['课程名称,学分,成绩,绩点,计入GPA', ...rows].join('\n');
});

async function copyCsv() {
  if (!canCopy.value) {
    message.error('当前浏览器不支持一键复制，请手动选择表格内容');
    return;
  }
  await copy(csv.value);
  message.success('成绩单 CSV 已复制到剪贴板');
}

function fmt(value: number, digits = 3): string {
  return Number.isFinite(value) ? value.toFixed(digits).replace(/\.?0+$/, '') || '0' : '0';
}
</script>

<template>
  <div>
    <div text-justify op-70>
      把教务系统的成绩粘贴进来，一次性算出 GPA、学分加权平均分，并横向对比 5 种常见算法。所有计算都在你的浏览器里完成，成绩不会上传到任何服务器。
    </div>

    <n-divider />

    <div flex flex-col gap-3 md:flex-row md:items-end>
      <div flex-1>
        <c-select
          v-model:value="scaleId"
          label="绩点算法"
          :options="scaleOptions"
          searchable
          w-full
        />
      </div>
      <div flex-1>
        <n-statistic label="总学分">
          {{ fmt(result.totalCredit, 1) }}
        </n-statistic>
      </div>
      <div flex-1>
        <n-statistic label="计入课程">
          {{ result.courseCount }} 门
        </n-statistic>
      </div>
    </div>

    <div mt-2 text-13px op-70>
      {{ activeScale.description }}
    </div>

    <div v-if="scaleId === 'custom'" mt-3>
      <c-input-text
        v-model:value="customTableRaw"
        label="自定义分档表（分数:绩点，从高到低）"
        placeholder="90:4.0, 85:3.7, 60:1.0"

        :rows="2"

        autosize multiline monospace
      />
    </div>

    <n-divider />

    <div flex flex-wrap items-center gap-2>
      <c-button @click="addCourse">
        + 添加课程
      </c-button>
      <c-button @click="toggleAllIncluded">
        全选 / 全不选
      </c-button>
      <c-button @click="clearCourses">
        清空
      </c-button>
      <c-button @click="copyCsv">
        复制成绩单 CSV
      </c-button>
    </div>

    <div mt-3 overflow-x-auto>
      <table min-w-640px w-full text-14px>
        <thead>
          <tr text-12px op-60>
            <th py-2 text-left font-400>
              课程名称
            </th>
            <th w-90px py-2 text-left font-400>
              学分
            </th>
            <th w-120px py-2 text-left font-400>
              成绩
            </th>
            <th w-90px py-2 text-left font-400>
              绩点
            </th>
            <th w-70px py-2 text-left font-400>
              计入
            </th>
            <th w-60px py-2 font-400 />
          </tr>
        </thead>
        <tbody>
          <tr v-for="course in courses" :key="course.id" border-t="1px solid light:#00000010 dark:#ffffff10">
            <td py-1 pr-2>
              <n-input v-model:value="course.name" size="small" placeholder="课程名称" />
            </td>
            <td py-1 pr-2>
              <n-input-number v-model:value="course.credit" size="small" :min="0" :max="30" :step="0.5" />
            </td>
            <td py-1 pr-2>
              <n-input
                :value="course.rawScore"
                size="small"
                placeholder="88 或 优"
                @update:value="value => updateScore(course, value ?? '')"
              />
            </td>
            <td py-1 pr-2 op-80>
              {{ course.score === null ? '—' : fmt(pointOf(course), 2) }}
            </td>
            <td py-1>
              <n-switch v-model:value="course.included" size="small" />
            </td>
            <td py-1 text-center>
              <c-button variant="text" size="small" circle @click="removeCourse(course.id)">
                ✕
              </c-button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!courses.length" py-4 text-center text-14px op-60>
        还没有课程，点上面的「添加课程」，或直接从教务系统粘贴导入。
      </div>
    </div>

    <n-divider />

    <div grid gap-3 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1>
      <c-card>
        <n-statistic :label="`GPA（${activeScale.name}）`">
          <span text-30px fw-600>
            {{ fmt(result.gpa) }}
          </span>
          <span text-14px op-50> / {{ activeScale.max }}</span>
        </n-statistic>
      </c-card>
      <c-card>
        <n-statistic label="学分加权平均分">
          <span text-30px fw-600>
            {{ fmt(result.weightedAverage, 2) }}
          </span>
          <span text-14px op-50> 分</span>
        </n-statistic>
      </c-card>
      <c-card>
        <n-statistic label="算术平均分">
          <span text-30px fw-600>
            {{ fmt(result.arithmeticAverage, 2) }}
          </span>
          <span text-14px op-50> 分</span>
        </n-statistic>
      </c-card>
    </div>

    <c-alert v-if="result.failedCount > 0" mt-3 type="warning" :title="`有 ${result.failedCount} 门课程不及格`">
      不及格课程在多数算法下绩点为 0，会明显拉低 GPA，记得确认是否需要重修或覆盖。
    </c-alert>

    <n-divider />

    <h4 mb-2 text-15px fw-600>
      五种算法横向对比
    </h4>
    <div mb-2 text-13px op-60>
      同一份成绩，不同学校的算法能差出 0.5 个绩点。保研、评奖、出国申请前，先看清对方用的是哪一种。
    </div>
    <c-table :data="comparedScales" :headers="[{ key: 'name', label: '算法' }, { key: 'max', label: '满分' }, { key: 'gpa', label: 'GPA' }]">
      <template #gpa="{ value }">
        <span fw-600>{{ fmt(Number(value)) }}</span>
      </template>
    </c-table>

    <n-divider />

    <div grid gap-4 lg:grid-cols-2>
      <div>
        <h4 mb-2 text-15px fw-600>
          提分性价比榜
        </h4>
        <div mb-2 text-13px op-60>
          把某一门课单独考到
          <n-input-number v-model:value="targetScore" size="tiny" :min="60" :max="100" mx-1 w-90px />
          分时，GPA 能涨多少。按涨幅排序 —— 这就是下学期该重点冲的课。
        </div>
        <c-table
          v-if="improvementPlan.length"
          :data="improvementPlan"
          :headers="[
            { key: 'name', label: '课程' },
            { key: 'score', label: '当前分' },
            { key: 'gain', label: 'GPA 涨幅' },
            { key: 'newGpa', label: '提分后 GPA' },
          ]"
        >
          <template #gain="{ value }">
            <span fw-600>+{{ fmt(Number(value)) }}</span>
          </template>
          <template #newGpa="{ value }">
            {{ fmt(Number(value)) }}
          </template>
        </c-table>
        <div v-else text-14px op-60>
          所有课程都已达到目标分，暂时没有可提升的空间。
        </div>
      </div>

      <div>
        <h4 mb-2 text-15px fw-600>
          目标 GPA 反推
        </h4>
        <div mb-2 text-13px op-60>
          想拿到
          <n-input-number v-model:value="targetGpa" size="tiny" :min="0" :max="5" :step="0.1" mx-1 w-90px />
          的 GPA，需要把这些课提到目标分。
        </div>
        <c-card v-if="result.courseCount">
          <div v-if="!targetPlan.neededPoints" op-80>
            当前 GPA 已经达到目标，稳住就行。
          </div>
          <div v-else>
            <div mb-2>
              还差 <b>{{ fmt(targetPlan.neededPoints, 2) }}</b> 个「绩点×学分」。按提分效率从高到低，建议重点冲这几门：
            </div>
            <ul v-if="targetPlan.picked.length" pl-5>
              <li v-for="id in targetPlan.picked" :key="id">
                {{ courses.find(course => course.id === id)?.name || id }}
                <span op-60>（{{ courses.find(course => course.id === id)?.credit }} 学分，现 {{ courses.find(course => course.id === id)?.rawScore }} 分）</span>
              </li>
            </ul>
            <div v-else op-80>
              靠提分已经补不上这个缺口了 —— 更现实的方案是多修几门高分选修课来摊薄。
            </div>
            <div mt-2 op-80>
              按此方案预计 GPA：<b>{{ fmt(targetPlan.finalGpa) }}</b>
              <span v-if="!targetPlan.reachable" ml-2>
                （仍略低于目标）
              </span>
            </div>
          </div>
        </c-card>
      </div>
    </div>

    <n-divider />

    <h4 mb-2 text-15px fw-600>
      从教务系统导入
    </h4>
    <div mb-2 text-13px op-60>
      在教务系统里全选成绩表格，直接粘贴到下面。支持 CSV / TSV / 空格分隔，自动识别「课程名称 / 学分 / 成绩」这几列，成绩里的“优 / 良 / 中”也能识别。
    </div>
    <c-input-text
      v-model:value="importText"
      multiline
      :rows="5"
      monospace
      placeholder="课程名称,学分,成绩&#10;高等数学（上）,5,88&#10;大学英语,3,优"
    />
    <div mt-2>
      <c-button @click="importCourses">
        解析并导入
      </c-button>
    </div>
  </div>
</template>

<style lang="less" scoped>
.n-input-number {
  width: 100%;
}
</style>
