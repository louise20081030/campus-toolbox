import { CalendarTime } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.schedule-conflict.title'),
  path: '/schedule-conflict',
  description: translate('tools.schedule-conflict.description'),
  keywords: ['schedule', 'timetable', 'conflict', 'free', '课表', '冲突', '选课', '空闲', '周次', 'campus'],
  component: () => import('./schedule-conflict.vue'),
  icon: CalendarTime,
  createdAt: new Date('2026-10-08'),
});
