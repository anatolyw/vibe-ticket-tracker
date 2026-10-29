import { Component, input, computed } from '@angular/core';

const ICONS: Record<string, string> = {
  LayoutDashboard: '<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="12" rx="1"/>',
  Ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
  Plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  Sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  Moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  Menu: '<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>',
  ChevronLeft: '<path d="m15 18-6-6 6-6"/>',
  ChevronsLeft: '<path d="m11 17-5-5 5-5"/><path d="m18 17-5-5 5-5"/>',
  Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  Save: '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
  X: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  Edit: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
  Trash2: '<path d="M3 6h18"/><path d="M19 6v1c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1V6"/><path d="M8 6V4c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v2"/><path d="M19 6v14c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1V6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  Eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  EyeOff: '<path d="M10.73 4.24C11.074 3.443 11.53 2.735 12 2c-1.003.163-1.94.53-2.79 1.05"/><circle cx="12" cy="12" r="3"/><path d="M2.07 2.07c1.39 1.39 3.22 3.3 5.93 4.93"/><path d="M15.96 4.24c.47-.38.98-.71 1.54-.97a14.05 14.05 0 0 1 2.43 1.74c1.39 1.39 3.3 3.22 4.93 5.93"/><path d="m2 2 20 20"/>',
  AlertCircle: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  TrendingUp: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  Layout: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
};

export { ICONS };

@Component({
  selector: 'lucide-icon',
  standalone: true,
  template: `
    @if (resolvedIcon()) {
      <svg xmlns="http://www.w3.org/2000/svg" [attr.width]="size()" [attr.height]="size()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [attr.aria-label]="name()" [innerHTML]="resolvedIcon()!" class="lucide-icon-svg"></svg>
    }
  `,
})
export class LucideIconComponent {
  name = input.required<string>();
  size = input(20);
  iconPath = input<string>('');

  resolvedIcon = computed(() => {
    const custom = this.iconPath();
    if (custom) return custom;
    return ICONS[this.name()] || null;
  });
}
