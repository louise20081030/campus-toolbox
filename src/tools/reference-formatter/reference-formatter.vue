<script setup lang="ts">
import { useStorage } from '@vueuse/core';
import {
  OUTPUT_FORMATS,
  REFERENCE_TYPES,
  convertBatch,
  formatReference,
  generateId,
  parseBibtex,
  parseGb7714,
} from './reference-formatter.service';
import type { OutputFormat, Reference, ReferenceType } from './reference-formatter.service';

const message = useMessage();
const { copy, isSupported: canCopy } = useClipboard({ legacy: true });

function createReference(partial: Partial<Reference> = {}): Reference {
  return {
    id: generateId(),
    type: 'journal',
    authors: '',
    title: '',
    container: '',
    publisher: '',
    city: '',
    year: '',
    volume: '',
    issue: '',
    pages: '',
    edition: '',
    doi: '',
    url: '',
    accessDate: '',
    ...partial,
  };
}

const reference = useStorage<Reference>('reference-formatter:reference', () =>
  createReference({
    type: 'journal',
    authors: '张三, 李四',
    title: '基于深度学习的课表推荐算法研究',
    container: '计算机学报',
    year: '2023',
    volume: '46',
    issue: '8',
    pages: '1723-1738',
  }),
undefined,
{ mergeDefaults: true },
);

const batchInput = ref('');
const batchFormat = useStorage<OutputFormat>('reference-formatter:batch-format', 'gb7714');

const typeOptions = REFERENCE_TYPES.map(({ value, label }) => ({ label, value }));
const formatOptions = OUTPUT_FORMATS.map(({ value, label }) => ({ label, value }));

const outputs = computed(() =>
  OUTPUT_FORMATS.map(({ value, label }) => ({
    format: value,
    label,
    text: formatReference(reference.value, value),
  })),
);

const batchResult = computed(() => convertBatch(batchInput.value, batchFormat.value));

function resetReference() {
  reference.value = createReference({ type: reference.value.type });
}

function setField(field: string, value: unknown) {
  (reference.value as unknown as Record<string, string>)[field] = String(value ?? '');
}

function parseIntoForm() {
  const text = batchInput.value.trim();
  if (!text) {
    message.warning('先把一条文献粘贴到下面的输入框');
    return;
  }

  const parsed = text.startsWith('@') ? parseBibtex(text) : parseGb7714(text.split(/\r?\n/)[0]);
  if (!parsed) {
    message.warning('没能识别出这条文献，GB/T 7714 条目需要带 [J]/[M] 这类文献类型标识');
    return;
  }

  reference.value = { ...createReference(), ...parsed };
  message.success('已解析并填入上方表单');
}

async function copyText(text: string) {
  if (!canCopy.value) {
    message.error('当前浏览器不支持一键复制');
    return;
  }
  await copy(text);
  message.success('已复制');
}

const fieldLabels: Record<string, string> = {
  authors: '作者（多个用逗号分隔）',
  title: '题名',
  container: '期刊 / 论文集 / 报纸名',
  publisher: '出版社 / 学位授予单位',
  city: '出版地',
  year: '年份',
  volume: '卷',
  issue: '期',
  pages: '起止页码',
  edition: '版次',
  doi: 'DOI',
  url: 'URL',
  accessDate: '引用日期',
};

const visibleFields = computed(() => {
  const type = reference.value.type as ReferenceType;
  const base = ['authors', 'title'];

  if (type === 'journal') {
    return [...base, 'container', 'year', 'volume', 'issue', 'pages', 'doi'];
  }
  if (type === 'book') {
    return [...base, 'edition', 'city', 'publisher', 'year', 'pages'];
  }
  if (type === 'thesis') {
    return [...base, 'publisher', 'city', 'year'];
  }
  if (type === 'conference') {
    return [...base, 'container', 'city', 'publisher', 'year', 'pages'];
  }
  if (type === 'newspaper') {
    return [...base, 'container', 'year', 'pages'];
  }
  if (type === 'web') {
    return [...base, 'container', 'year', 'url', 'accessDate', 'doi'];
  }
  return [...base, 'city', 'publisher', 'year'];
});
</script>

<template>
  <div>
    <div text-justify op-70>
      论文交稿前最烦的就是改参考文献格式。填一次字段，同时输出 GB/T 7714-2015、APA 7、MLA 9、IEEE 和 BibTeX；也可以把已有的文献粘贴进来反向解析，批量换成另一种格式。
    </div>

    <n-divider />

    <div flex flex-wrap items-end gap-2>
      <div w-200px>
        <c-select v-model:value="reference.type" label="文献类型" :options="typeOptions" searchable />
      </div>
      <div>
        <c-button @click="resetReference">
          清空字段
        </c-button>
      </div>
    </div>

    <div grid mt-3 gap-x-3 gap-y-2 lg:grid-cols-3 md:grid-cols-2>
      <c-input-text
        v-for="field in visibleFields"
        :key="field"
        :value="String(reference[field as keyof Reference] ?? '')"
        :label="fieldLabels[field] ?? field"
        :placeholder="field === 'authors' ? '张三, 李四' : ''"
        @update:value="(value: string) => setField(field, value)"
      />
    </div>

    <n-divider />

    <h4 mb-2 text-15px fw-600>
      五种格式输出
    </h4>
    <div flex flex-col gap-3>
      <c-card v-for="output in outputs" :key="output.format">
        <div flex items-start justify-between gap-2>
          <div flex-1>
            <div mb-1 text-13px op-60>
              {{ output.label }}
            </div>
            <div whitespace-pre-wrap text-14px lh-1.6 font-mono>
              {{ output.text }}
            </div>
          </div>
          <c-button size="small" @click="copyText(output.text)">
            复制
          </c-button>
        </div>
      </c-card>
    </div>

    <n-divider />

    <h4 mb-2 text-15px fw-600>
      批量转换 / 反向解析
    </h4>
    <div mb-2 text-13px op-60>
      把已有的参考文献粘进来（BibTeX 或一行一条的 GB/T 7714），选择目标格式一键转换；也可以点「解析并填入表单」把第一条拆回字段。
    </div>

    <c-input-text
      v-model:value="batchInput"
      multiline
      :rows="5"
      monospace
      placeholder="@article{zhang2023,&#10;  author = {Zhang San and Li Si},&#10;  title = {...}&#10;}"
    />

    <div mt-3 flex flex-wrap items-end gap-2>
      <div w-220px>
        <c-select v-model:value="batchFormat" label="目标格式" :options="formatOptions" />
      </div>
      <c-button @click="parseIntoForm">
        解析并填入表单
      </c-button>
    </div>

    <div v-if="batchResult.ok.length || batchResult.failed.length" mt-3>
      <div v-if="batchResult.ok.length">
        <div mb-1 flex items-center justify-between>
          <span text-13px op-60>转换结果（{{ batchResult.ok.length }} 条）</span>
          <c-button size="small" @click="copyText(batchResult.ok.join('\n'))">
            全部复制
          </c-button>
        </div>
        <c-card>
          <div whitespace-pre-wrap text-13px lh-1.7 font-mono>
            {{ batchResult.ok.join('\n') }}
          </div>
        </c-card>
      </div>
      <c-alert v-if="batchResult.failed.length" mt-3 type="warning" :title="`${batchResult.failed.length} 条没能识别`">
        GB/T 7714 条目需要带 [J]、[M]、[D] 这类文献类型标识；BibTeX 需要以 @article、@book 开头。
      </c-alert>
    </div>
  </div>
</template>
