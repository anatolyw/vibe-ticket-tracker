import { Component, computed, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideIconComponent } from '../../lib/lucide-icon.component';
import { getIsDark, toggleDark } from '../../lib/theme.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, LucideIconComponent],
  host: { class: 'sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b' },
  template: `
    <div class="h-14 px-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        @if (isSmall()) {
          <button (click)="openSidebar.emit()" class="p-2 rounded-md hover:bg-accent transition-colors" aria-label="Open menu">
            <lucide-icon name="Menu" [size]="20"></lucide-icon>
          </button>
          <h1 class="text-lg font-semibold">Vibe Tracker</h1>
        } @else {
          <h1 class="text-lg font-semibold">Vibe Tracker</h1>
        }
      </div>
      <div class="flex items-center gap-1">
        <button (click)="onToggleDark()" class="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground" [attr.aria-label]="isDark() ? 'Switch to light mode' : 'Switch to dark mode'" [class.text-muted-foreground]="!isDark()">
          @if (isDark()) {
            <lucide-icon name="Sun" [size]="18"></lucide-icon>
          } @else {
            <lucide-icon name="Moon" [size]="18"></lucide-icon>
          }
        </button>
      </div>
    </div>
  `,
})
export class AppHeaderComponent {
  openSidebar = output<void>();
  isDark = computed(() => getIsDark());
  isSmall = computed(() => typeof window !== 'undefined' && window.innerWidth < 768);

  onToggleDark(): void {
    toggleDark();
  }
}
