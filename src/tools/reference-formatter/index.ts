import { Books } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.reference-formatter.title'),
  path: '/reference-formatter',
  description: translate('tools.reference-formatter.description'),
  keywords: ['reference', 'citation', 'bibtex', 'apa', 'mla', 'ieee', 'gb7714', '参考文献', '论文', '引用', 'campus'],
  component: () => import('./reference-formatter.vue'),
  icon: Books,
  createdAt: new Date('2026-10-08'),
});
