import { Component, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeaderComponent } from './components/app-header/app-header.component';
import { AppSidebarComponent } from './components/app-sidebar/app-sidebar.component';
import { VIBE_TRACKER_VERSION } from './version';

// ── Version helpers ────────────────────────────────────────────────────

/** Compute the display version: window override (e.g. e2e addInitScript) → bundled const → 'dev'. */
function getVersion(): string {
  if (typeof window !== 'undefined') {
    const w = window as unknown as Record<string, unknown>;
    if (w.VIBE_TRACKER_VERSION) {
      return String(w.VIBE_TRACKER_VERSION);
    }
  }
  return VIBE_TRACKER_VERSION || 'dev';
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppHeaderComponent, AppSidebarComponent],
  template: `
    <div class="flex h-screen bg-background overflow-hidden flex-col">
      <app-header (openSidebar)="mobileSidebarOpen.set(true)" />

      <div class="flex flex-1 min-h-0 overflow-hidden">
        <app-sidebar
          [isOpen]="mobileSidebarOpen()"
          (close)="mobileSidebarOpen.set(false)"
        />
        <main class="flex-1 overflow-y-auto p-4 md:p-6">
          <router-outlet />
        </main>
      </div>

      <footer class="flex-shrink-0 px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center justify-end">
        <span>{{ version() }}</span>
      </footer>
    </div>
  `,
})
export class AppComponent implements OnInit, OnDestroy {
  mobileSidebarOpen = signal(false);
  private sizeSignal = signal<'small' | 'medium' | 'large'>('large');

  isSmall = computed(() => this.sizeSignal() === 'small');
  version = computed(() => getVersion());

  private handleResize = (): void => {
    const w = window.innerWidth;
    this.sizeSignal.set(w < 768 ? 'small' : w < 1024 ? 'medium' : 'large');
  };

  ngOnInit(): void {
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.handleResize);
  }
}
