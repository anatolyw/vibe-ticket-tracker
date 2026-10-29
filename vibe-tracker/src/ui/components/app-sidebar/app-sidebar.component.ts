import { Component, computed, signal, input, output, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { LucideIconComponent } from '../../lib/lucide-icon.component';

const NAV_ITEMS = [
  { label: 'Dashboard', route: '/', iconName: 'LayoutDashboard' },
  { label: 'Tickets', route: '/tickets', iconName: 'Ticket' },
  { label: 'New Ticket', route: '/tickets/new', iconName: 'Plus' },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, LucideIconComponent],
  template: `
    @if (isSmall() && isOpen()) {
      <div class="fixed inset-0 z-20 bg-black/50 transition-opacity" (click)="close.emit()"></div>
    }

    <aside
      class="fixed inset-y-0 left-0 z-30 flex flex-col bg-card border-r border-border transition-all duration-300"
      [class.w-16]="isMedium() || (isLarge() && collapsed())"
      [class.w-64]="isLarge() && !collapsed()"
      [class.-translate-x-full]="isSmall() && !isOpen()"
      [class.translate-x-0]="isSmall() && isOpen()"
    >
      <div class="flex items-center justify-between h-14 px-3 border-b border-border flex-shrink-0">
        @if (isLarge() && !collapsed()) {
          <span class="font-bold text-sm truncate flex-1">Vibe Tracker</span>
          <button (click)="toggleCollapse()" class="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground" aria-label="Collapse sidebar">
            <lucide-icon name="ChevronsLeft" [size]="14"></lucide-icon>
          </button>
        } @else if (isLarge() && collapsed()) {
          <button (click)="toggleCollapse()" class="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground" aria-label="Expand sidebar">
            <lucide-icon name="ChevronLeft" [size]="14"></lucide-icon>
          </button>
        }
      </div>

      <nav class="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        @for (item of navItems(); track item.route) {
          <a [routerLink]="item.route" class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
            [class.bg-accent]="isCurrent(item.route)" [class.text-foreground]="isCurrent(item.route)"
            [class.text-muted-foreground]="!isCurrent(item.route)" [class.hover:bg-accent]="!isCurrent(item.route)">
            <lucide-icon [name]="item.iconName" [size]="18" class="flex-shrink-0"></lucide-icon>
            @if (isLarge() && !collapsed()) { <span class="truncate">{{ item.label }}</span> }
          </a>
        }
      </nav>

      <div class="p-3 border-t border-border text-xs text-muted-foreground flex-shrink-0">
        @if (isLarge() && !collapsed()) { <span>v0.1.0</span> }
      </div>
    </aside>
  `,
})
export class AppSidebarComponent implements OnInit, OnDestroy {
  isOpen = input.required<boolean>();
  close = output<void>();
  collapsed = signal(false);
  private sub?: Subscription;

  navItems = signal(NAV_ITEMS);

  isSmall = computed(() => typeof window !== 'undefined' && window.innerWidth < 768);
  isMedium = computed(() => typeof window !== 'undefined' && window.innerWidth >= 768 && window.innerWidth < 1024);
  isLarge = computed(() => typeof window !== 'undefined' && window.innerWidth >= 1024);

  constructor(private router: Router) {}

  ngOnInit(): void {
    try {
      const stored = localStorage.getItem('vibe-tracker-sidebar-collapsed');
      if (stored !== null) this.collapsed.set(stored === 'true');
    } catch { /* noop */ }
    this.sub = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      if (typeof window !== 'undefined' && window.innerWidth < 768) this.close.emit();
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  toggleCollapse(): void {
    this.collapsed.update((v) => {
      const next = !v;
      try { localStorage.setItem('vibe-tracker-sidebar-collapsed', String(next)); } catch { /* noop */ }
      return next;
    });
  }

  isCurrent(route: string): boolean {
    const current = this.router.url;
    if (route === '/') return current === '/' || current === '';
    return current.startsWith(route);
  }
}
