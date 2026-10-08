import { Calculator } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.gpa-calculator.title'),
  path: '/gpa-calculator',
  description: translate('tools.gpa-calculator.description'),
  keywords: ['gpa', 'grade', 'point', 'credit', '绩点', '学分', '加权平均分', '成绩', '平均分', 'campus', 'school'],
  component: () => import('./gpa-calculator.vue'),
  icon: Calculator,
  createdAt: new Date('2026-10-08'),
});
