/**
 * 校园工具箱 · 参考文献格式转换
 *
 * 支持 GB/T 7714-2015（国内高校毕业论文通用）、APA 7、MLA 9、IEEE、BibTeX 五种格式互转，
 * 并能把已有的一条 GB/T 7714 或 BibTeX 条目反向解析回字段，方便批量改格式。
 */

export type ReferenceType = 'journal' | 'book' | 'thesis' | 'conference' | 'newspaper' | 'web' | 'report' | 'standard';

export interface Reference {
  id: string
  type: ReferenceType
  /** 作者，多个作者用逗号 / 分号 / 顿号分隔 */
  authors: string
  title: string
  /** 期刊名 / 论文集名 / 报纸名 / 网站名 */
  container: string
  /** 出版社 / 学位授予单位 / 发布机构 */
  publisher: string
  city: string
  year: string
  volume: string
  issue: string
  pages: string
  edition: string
  doi: string
  url: string
  /** 引用日期（电子资源用） */
  accessDate: string
}

export const REFERENCE_TYPES: { value: ReferenceType; label: string; marker: string }[] = [
  { value: 'journal', label: '期刊文章', marker: 'J' },
  { value: 'book', label: '专著（图书）', marker: 'M' },
  { value: 'thesis', label: '学位论文', marker: 'D' },
  { value: 'conference', label: '会议论文', marker: 'C' },
  { value: 'newspaper', label: '报纸文章', marker: 'N' },
  { value: 'report', label: '报告', marker: 'R' },
  { value: 'standard', label: '标准', marker: 'S' },
  { value: 'web', label: '电子资源（网页）', marker: 'EB/OL' },
];

export type OutputFormat = 'gb7714' | 'apa' | 'mla' | 'ieee' | 'bibtex';

export const OUTPUT_FORMATS: { value: OutputFormat; label: string }[] = [
  { value: 'gb7714', label: 'GB/T 7714-2015' },
  { value: 'apa', label: 'APA 7th' },
  { value: 'mla', label: 'MLA 9th' },
  { value: 'ieee', label: 'IEEE' },
  { value: 'bibtex', label: 'BibTeX' },
];

interface AuthorParts {
  family: string
  given: string
  full: string
  isChinese: boolean
}

const CHINESE_RE = /[一-龥]/;

export function parseAuthors(input: string): AuthorParts[] {
  return input
    .split(/[,，;；、]|\band\b|&/)
    .map(part => part.trim())
    .filter(Boolean)
    .map((part) => {
      const clean = part.replace(/\.+$/, '').trim();
      const isChinese = CHINESE_RE.test(clean);

      if (isChinese) {
        return { family: clean.slice(0, 1), given: clean.slice(1), full: clean, isChinese };
      }

      if (clean.includes(',')) {
        const [family, given] = clean.split(',').map(item => item.trim());
        return { family: family ?? '', given: given ?? '', full: `${given ?? ''} ${family ?? ''}`.trim(), isChinese };
      }

      const tokens = clean.split(/\s+/).filter(Boolean);
      if (tokens.length === 1) {
        return { family: tokens[0], given: '', full: tokens[0], isChinese };
      }

      // 既有 “John Smith” 也有 “Smith J” 两种写法：最后一个词是姓（除非它像首字母）
      const last = tokens[tokens.length - 1];
      const looksLikeInitial = last.length <= 2 && /^[A-Z]/.test(last) && tokens.length > 2;
      const family = looksLikeInitial ? tokens[0] : last;
      const given = looksLikeInitial ? tokens.slice(1).join(' ') : tokens.slice(0, -1).join(' ');

      return { family, given, full: `${given} ${family}`.trim(), isChinese };
    });
}

function initials(given: string): string {
  return given
    .split(/[\s.-]+/)
    .filter(Boolean)
    .map(part => `${part[0]?.toUpperCase() ?? ''}.`)
    .join(' ');
}

function joinGbAuthors(authors: AuthorParts[]): string {
  if (!authors.length) {
    return '';
  }
  const isChinese = authors[0].isChinese;
  const shown = authors.length > 3 ? authors.slice(0, 3) : authors;
  const text = shown
    .map(author => (author.isChinese ? author.full : `${author.family.toUpperCase()} ${initials(author.given).replace(/\s|\./g, '')}`))
    .join(', ');

  return authors.length > 3 ? `${text}, ${isChinese ? '等' : 'et al'}` : text;
}

function joinApaAuthors(authors: AuthorParts[]): string {
  if (!authors.length) {
    return '';
  }
  const formatted = authors.map(author => `${author.family}, ${initials(author.given)}`.trim().replace(/,$/, ''));
  if (formatted.length === 1) {
    return formatted[0];
  }
  return `${formatted.slice(0, -1).join(', ')}, & ${formatted[formatted.length - 1]}`;
}

function joinMlaAuthors(authors: AuthorParts[]): string {
  if (!authors.length) {
    return '';
  }
  if (authors.length === 1) {
    const author = authors[0];
    return author.isChinese ? author.full : `${author.family}, ${author.given}`.replace(/,\s*$/, '');
  }
  const first = authors[0];
  const firstText = first.isChinese ? first.full : `${first.family}, ${first.given}`.replace(/,\s*$/, '');

  return authors.length > 2 ? `${firstText}, et al.` : `${firstText}, and ${authors[1].full}`;
}

function joinIeeeAuthors(authors: AuthorParts[]): string {
  if (!authors.length) {
    return '';
  }
  const formatted = authors.map(author => (author.isChinese ? author.full : `${initials(author.given)} ${author.family}`));
  if (formatted.length <= 6) {
    if (formatted.length === 1) {
      return formatted[0];
    }
    return `${formatted.slice(0, -1).join(', ')}, and ${formatted[formatted.length - 1]}`;
  }
  return `${formatted[0]} et al.`;
}

function joinBibAuthors(authors: AuthorParts[]): string {
  return authors.map(author => author.full).join(' and ');
}

function cleanEnd(text: string): string {
  return text.replace(/[.。]\s*$/, '');
}

/** 把 “2020, 12(3): 45-56” 之类拆成卷 / 期 / 页码 */
function splitVolumeIssuePages(source: string): { volume: string; issue: string; pages: string } {
  const volumeMatch = source.match(/(\d+)\s*[（(]\s*(\d+)\s*[)）]\s*[:：]?\s*([\d\-–—]+)?/);
  if (volumeMatch) {
    return { volume: volumeMatch[1], issue: volumeMatch[2], pages: volumeMatch[3] ?? '' };
  }

  const simpleMatch = source.match(/(\d+)\s*[:：]\s*([\d\-–—]+)/);
  if (simpleMatch) {
    return { volume: simpleMatch[1], issue: '', pages: simpleMatch[2] };
  }

  return { volume: '', issue: '', pages: source.match(/([\d]+\s*[-–—]\s*[\d]+)/)?.[1] ?? '' };
}

export function formatReference(reference: Reference, format: OutputFormat): string {
  const authors = parseAuthors(reference.authors);
  const year = reference.year.trim();
  const title = cleanEnd(reference.title.trim());
  const container = cleanEnd(reference.container.trim());
  const publisher = cleanEnd(reference.publisher.trim());
  const city = cleanEnd(reference.city.trim());
  const pages = reference.pages.trim();
  const doi = reference.doi.trim();
  const url = reference.url.trim();

  if (format === 'gb7714') {
    const authorText = joinGbAuthors(authors);
    const place = city || publisher ? `${city}: ${publisher}`.replace(/^:\s*|\s*:$/g, '') : '';

    switch (reference.type) {
      case 'journal': {
        const vol = reference.volume ? `${reference.volume}${reference.issue ? `(${reference.issue})` : ''}` : '';
        return `${authorText}. ${title}[J]. ${container}, ${year}${vol ? `, ${vol}` : ''}${pages ? `: ${pages}` : ''}.`;
      }
      case 'book': {
        const edition = reference.edition.trim();
        return `${authorText}. ${title}[M].${edition ? ` ${edition}版.` : ''} ${place}, ${year}${pages ? `: ${pages}` : ''}.`
          .replace(/\s+/g, ' ')
          .replace(/\s+,/, ',');
      }
      case 'thesis':
        return `${authorText}. ${title}[D]. ${publisher ? `${publisher}` : city}, ${year}.`;
      case 'conference':
        return `${authorText}. ${title}[C]//${container}. ${place}, ${year}${pages ? `: ${pages}` : ''}.`;
      case 'newspaper':
        return `${authorText}. ${title}[N]. ${container}, ${year}${pages ? `(${pages})` : ''}.`;
      case 'report':
        return `${authorText}. ${title}[R]. ${place}, ${year}.`;
      case 'standard':
        return `${authorText}. ${title}[S]. ${place}, ${year}.`;
      default: {
        const access = reference.accessDate ? `[${reference.accessDate}]` : '';
        return `${authorText}. ${title}[EB/OL]. ${year ? `${year}. ` : ''}${url}${access ? ` ${access}` : ''}${doi ? `. DOI:${doi}` : ''}`;
      }
    }
  }

  if (format === 'apa') {
    const authorText = joinApaAuthors(authors);
    const yearPart = year ? ` (${year}).` : '.';

    switch (reference.type) {
      case 'journal': {
        const vol = reference.volume ? `, ${reference.volume}${reference.issue ? `(${reference.issue})` : ''}` : '';
        return `${authorText}${yearPart} ${title}. ${container}${vol}${pages ? `, ${pages}` : ''}.${doi ? ` https://doi.org/${doi}` : url ? ` ${url}` : ''}`;
      }
      case 'book':
        return `${authorText}${yearPart} ${title}${reference.edition ? ` (${reference.edition} ed.)` : ''}. ${publisher}${doi ? `. https://doi.org/${doi}` : ''}`;
      case 'thesis':
        return `${authorText}${yearPart} ${title} [Doctoral dissertation, ${publisher || city}].`;
      case 'conference':
        return `${authorText}${yearPart} ${title}. In ${container}${pages ? ` (pp. ${pages})` : ''}. ${publisher}.`;
      case 'newspaper':
        return `${authorText}${yearPart} ${title}. ${container}${pages ? `, ${pages}` : ''}.`;
      default:
        return `${authorText}${yearPart} ${title}. ${container || publisher}.${url ? ` ${url}` : ''}`;
    }
  }

  if (format === 'mla') {
    const authorText = joinMlaAuthors(authors);

    switch (reference.type) {
      case 'journal': {
        const vol = reference.volume ? `, vol. ${reference.volume}` : '';
        const issue = reference.issue ? `, no. ${reference.issue}` : '';
        return `${authorText}. "${title}." ${container}${vol}${issue}, ${year}, pp. ${pages || 'n. pag.'}.`;
      }
      case 'book':
        return `${authorText}. ${title}. ${publisher}, ${year}.`;
      case 'thesis':
        return `${authorText}. "${title}." Thesis, ${publisher || city}, ${year}.`;
      case 'conference':
        return `${authorText}. "${title}." ${container}, ${year}.`;
      default:
        return `${authorText}. "${title}." ${container || publisher}, ${year}, ${url}.`;
    }
  }

  if (format === 'ieee') {
    const authorText = joinIeeeAuthors(authors);

    switch (reference.type) {
      case 'journal': {
        const vol = reference.volume ? `, vol. ${reference.volume}` : '';
        const issue = reference.issue ? `, no. ${reference.issue}` : '';
        return `${authorText}, "${title}," ${container}${vol}${issue}${pages ? `, pp. ${pages}` : ''}, ${year}.${doi ? ` doi: ${doi}.` : ''}`;
      }
      case 'book':
        return `${authorText}, ${title}. ${city ? `${city}: ` : ''}${publisher}, ${year}.`;
      case 'conference':
        return `${authorText}, "${title}," in ${container}, ${year}${pages ? `, pp. ${pages}` : ''}.`;
      default:
        return `${authorText}, "${title}," ${container || publisher}, ${year}.${url ? ` [Online]. Available: ${url}` : ''}`;
    }
  }

  const fields: string[] = [];
  const bibType = {
    journal: 'article',
    book: 'book',
    thesis: 'thesis',
    conference: 'inproceedings',
    newspaper: 'article',
    report: 'techreport',
    standard: 'misc',
    web: 'misc',
  }[reference.type];

  const key = [
    parseAuthors(reference.authors)[0]?.family.toLowerCase().replace(/\s+/g, '') ?? 'ref',
    year,
    title.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z一-龥]/g, '') ?? '',
  ]
    .filter(Boolean)
    .join('');

  const push = (name: string, value: string) => {
    if (value.trim()) {
      fields.push(`  ${name} = {${value.trim()}}`);
    }
  };

  push('author', joinBibAuthors(parseAuthors(reference.authors)));
  push('title', title);
  push('journal', reference.type === 'journal' || reference.type === 'newspaper' ? container : '');
  push('booktitle', reference.type === 'conference' ? container : '');
  push('school', reference.type === 'thesis' ? publisher : '');
  push('publisher', reference.type === 'book' || reference.type === 'report' ? publisher : '');
  push('address', city);
  push('year', year);
  push('volume', reference.volume);
  push('number', reference.issue);
  push('pages', pages.replace(/-/g, '--'));
  push('doi', doi);
  push('url', url);
  push('note', reference.accessDate ? `[Accessed: ${reference.accessDate}]` : '');

  return `@${bibType}{${key},\n${fields.join(',\n')}\n}`;
}

export function formatAll(reference: Reference): { format: string; label: string; text: string }[] {
  return OUTPUT_FORMATS.map(({ value, label }) => ({ format: value, label, text: formatReference(reference, value) }));
}

const TYPE_BY_MARKER: Record<string, ReferenceType> = {
  'J': 'journal',
  'M': 'book',
  'D': 'thesis',
  'C': 'conference',
  'N': 'newspaper',
  'R': 'report',
  'S': 'standard',
  'EB/OL': 'web',
};

/** 反向解析一条 GB/T 7714 文献条目 */
export function parseGb7714(line: string): Reference | null {
  const markerMatch = line.match(/\[(J|M|D|C|N|R|S|EB\/OL)\]/);
  if (!markerMatch) {
    return null;
  }

  const type = TYPE_BY_MARKER[markerMatch[1]] ?? 'journal';
  const markerIndex = markerMatch.index ?? 0;
  const authors = line.slice(0, markerIndex).replace(/[.。]$/, '').trim();
  const tail = line.slice(markerIndex + markerMatch[0].length).replace(/^[.\s。]+/, '');

  const segments = tail.split(/[.。]/).map(part => part.trim()).filter(Boolean);
  const title = segments[0] ?? '';
  const remainder = tail.slice(title.length);
  const { volume, issue, pages } = splitVolumeIssuePages(remainder);

  const yearMatch = remainder.match(/(19|20)\d{2}/);
  const urlMatch = remainder.match(/https?:\/\/\S+/);
  const doiMatch = remainder.match(/DOI:\s*(\S+)/i);
  const containerMatch = remainder.match(/[,，]\s*([^,，:：]+?)\s*[,，]\s*(19|20)\d{2}/);

  return {
    id: generateId(),
    type,
    authors,
    title,
    container: containerMatch ? containerMatch[1].trim() : (segments[1] ?? '').split(/[,，]/)[0].trim(),
    publisher: '',
    city: '',
    year: yearMatch ? yearMatch[0] : '',
    volume,
    issue,
    pages,
    edition: '',
    doi: doiMatch ? doiMatch[1] : '',
    url: urlMatch ? urlMatch[0].replace(/[.。,，]$/, '') : '',
    accessDate: remainder.match(/\[(\d{4}[-/]\d{1,2}[-/]\d{1,2})\]/)?.[1] ?? '',
  };
}

const BIB_TYPE_MAP: Record<string, ReferenceType> = {
  article: 'journal',
  book: 'book',
  thesis: 'thesis',
  mastersthesis: 'thesis',
  phdthesis: 'thesis',
  inproceedings: 'conference',
  techreport: 'report',
  misc: 'web',
};

/** 反向解析一条 BibTeX 条目 */
export function parseBibtex(chunk: string): Reference | null {
  const match = chunk.match(/@(\w+)\s*\{\s*([^,]*),([\s\S]*)\}?$/);
  if (!match) {
    return null;
  }

  const [, rawType, , body] = match;
  const fields: Record<string, string> = {};
  const fieldRe = /(\w+)\s*=\s*\{([^}]*)\}/g;
  let fieldMatch = fieldRe.exec(body);
  while (fieldMatch) {
    fields[fieldMatch[1].toLowerCase()] = fieldMatch[2].trim();
    fieldMatch = fieldRe.exec(body);
  }

  const type: ReferenceType = BIB_TYPE_MAP[rawType.toLowerCase()] ?? 'journal';

  const pages = (fields.pages ?? '').replace(/--/g, '-');
  const note = fields.note ?? '';

  return {
    id: generateId(),
    type,
    authors: (fields.author ?? '').replace(/\s+and\s+/g, ', '),
    title: fields.title ?? '',
    container: fields.journal ?? fields.booktitle ?? '',
    publisher: fields.publisher ?? fields.school ?? fields.organization ?? '',
    city: fields.address ?? '',
    year: fields.year ?? '',
    volume: fields.volume ?? '',
    issue: fields.number ?? '',
    pages,
    edition: fields.edition ?? '',
    doi: fields.doi ?? '',
    url: fields.url ?? '',
    accessDate: note.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/)?.[1] ?? '',
  };
}

/** 批量转换：自动识别输入是 BibTeX 还是 GB/T 7714（一行一条） */
export function convertBatch(input: string, format: OutputFormat): { ok: string[]; failed: string[] } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: [], failed: [] };
  }

  const isBibtex = /@\w+\s*\{/.test(trimmed);
  const chunks = isBibtex
    ? trimmed.split(/(?=@\w+\s*\{)/)
    : trimmed.split(/\r?\n+/);

  const ok: string[] = [];
  const failed: string[] = [];

  for (const rawChunk of chunks) {
    const chunk = rawChunk.trim();
    if (!chunk) {
      continue;
    }

    const reference = chunk.startsWith('@') ? parseBibtex(chunk) : parseGb7714(chunk);
    if (!reference) {
      failed.push(chunk.split(/\r?\n/)[0]);
      continue;
    }
    ok.push(formatReference(reference, format));
  }

  return { ok, failed };
}

export function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}
