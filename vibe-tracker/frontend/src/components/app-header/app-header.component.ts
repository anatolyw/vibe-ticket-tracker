import { Component, output, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { LucideIconComponent } from '../../lib/lucide-icon.component';
import { getIsDark, toggleDark } from '../../lib/theme.service';

@Component({
  selector: 'app-header',
  imports: [LucideIconComponent],
  host: { class: 'flex-shrink-0' },
  template: `
    <div class="h-14 px-4 flex items-center justify-between border-b bg-background">
      <div class="flex items-center gap-3">
        @if (isSmall()) {
          <button (click)="openSidebar.emit()" class="p-2 rounded-md hover:bg-accent transition-colors" aria-label="Open menu">
            <lucide-icon name="Menu" [size]="20"></lucide-icon>
          </button>
        }
        <h1 class="text-lg font-semibold truncate">Vibe Tracker</h1>
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
export class AppHeaderComponent implements OnInit, OnDestroy {
  openSidebar = output<void>();
  private sizeSignal = signal(false);
  isDark = computed(() => getIsDark());
  isSmall = computed(() => this.sizeSignal());

  private handleResize = (): void => {
    this.sizeSignal.set(window.innerWidth < 768);
  };

  ngOnInit(): void {
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize);
  }

  onToggleDark(): void {
    toggleDark();
  }
}
