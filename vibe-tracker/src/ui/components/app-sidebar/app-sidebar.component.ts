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
      class="flex flex-col h-full bg-card border-r border-border"
      [class.fixed]="isSmall()"
      [class.inset-y-0]="isSmall()"
      [class.left-0]="isSmall()"
      [class.z-30]="isSmall()"
      [class.w-64]="isSmall() && isOpen()"
      [class.-translate-x-full]="isSmall() && !isOpen()"
      [class.translate-x-0]="!isSmall()"
      [class.hidden]="isSmall() && !isOpen()"
      [class.md\:w-16]="isMedium() || (isLarge() && collapsed())"
      [class.md\:w-64]="isLarge() && !collapsed()"
      [style.position]="isSmall() ? 'fixed' : 'static'"
    >
      <!-- Navigation (stretches to fill all available space, pushing button to bottom) -->
      <nav class="flex-1 flex flex-col py-3 px-2 space-y-1 overflow-y-auto">
        @for (item of navItems(); track item.route) {
          <a [routerLink]="item.route" class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors"
            [class.bg-accent]="isCurrent(item.route)" [class.text-foreground]="isCurrent(item.route)"
            [class.text-muted-foreground]="!isCurrent(item.route)" [class.hover:bg-accent]="!isCurrent(item.route)">
            <lucide-icon [name]="item.iconName" [size]="18" class="flex-shrink-0"></lucide-icon>
            @if ((size() === 'small' && isOpen()) || isLarge()) {
              <span class="truncate">{{ item.label }}</span>
            }
          </a>
        }
      </nav>

      <!-- Collapse/Expand button: always visible, pushed to bottom by flex-1 nav -->
      <div class="p-2 border-t border-border flex justify-center flex-shrink-0">
        <button (click)="onToggleCollapse()" class="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground" [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
          <lucide-icon [name]="collapsed() ? 'ChevronLeft' : 'ChevronsLeft'" [size]="16"></lucide-icon>
        </button>
      </div>
    </aside>
  `,
})
export class AppSidebarComponent implements OnInit, OnDestroy {
  isOpen = input.required<boolean>();
  close = output<void>();
  collapsed = signal(false);
  private sub?: Subscription;
  size = signal<'small' | 'medium' | 'large'>('large');

  navItems = signal(NAV_ITEMS);

  isSmall = computed(() => this.size() === 'small');
  isMedium = computed(() => this.size() === 'medium');
  isLarge = computed(() => this.size() === 'large');

  constructor(private router: Router) {}

  private handleResize = (): void => {
    const w = window.innerWidth;
    this.size.set(w < 768 ? 'small' : w < 1024 ? 'medium' : 'large');
  };

  ngOnInit(): void {
    try {
      const stored = localStorage.getItem('vibe-tracker-sidebar-collapsed');
      if (stored !== null) this.collapsed.set(stored === 'true');
    } catch { /* noop */ }
    this.sub = this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      if (window.innerWidth < 768) this.close.emit();
    });
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    window.removeEventListener('resize', this.handleResize);
  }

  onToggleCollapse = (): void => {
    this.collapsed.update((v) => {
      const next = !v;
      try { localStorage.setItem('vibe-tracker-sidebar-collapsed', String(next)); } catch { /* noop */ }
      return next;
    });
  };

  isCurrent(route: string): boolean {
    const current = this.router.url;
    if (route === '/') return current === '/' || current === '';
    return current.startsWith(route);
  }
}
