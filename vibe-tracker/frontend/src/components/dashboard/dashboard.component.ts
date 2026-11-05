import { Component, OnInit, inject, signal, WritableSignal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { ApiService, TicketSummary, TicketTypeOption } from '../../lib/api.service';

/** Predefined color palette for type badges (cycles through available colors) */
const TYPE_COLOR_CLASSES = [
  'bg-info/15 text-info dark:bg-info/25 dark:text-info',    // blue-ish
  'bg-purple/15 text-purple dark:bg-purple/25 dark:text-purple',  // purple
  'bg-destructive/15 text-destructive dark:bg-destructive/25 dark:text-destructive', // red
  'bg-success/15 text-success dark:bg-success/25 dark:text-success', // green
  'bg-warning/15 text-warning dark:bg-warning/25 dark:text-warning', // amber
  'bg-muted/15 text-muted-foreground dark:bg-muted/25 dark:text-muted-foreground', // gray
];

/** Get a consistent color class for a type by hashing its string */
function getTypeColorClass(type: string): string {
  let hash = 0;
  for (let i = 0; i < type.length; i++) {
    hash = ((hash << 5) - hash + type.charCodeAt(i)) | 0;
  }
  return TYPE_COLOR_CLASSES[Math.abs(hash) % TYPE_COLOR_CLASSES.length];
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, NgClass],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Dashboard</h1>
          <p class="text-muted-foreground mt-1">Overview of your tickets</p>
        </div>
        <a routerLink="/tickets/new" class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          New Ticket
        </a>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        @if (loading) {
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="rounded-lg border bg-card p-4 animate-pulse">
              <div class="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div class="h-8 bg-muted rounded w-1/3"></div>
            </div>
          }
        } @else {
          <div class="rounded-lg border bg-card p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-muted-foreground">Total</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="14" x="3" y="2" rx="2"/><path d="M3 4h10"/><path d="M7 10h4"/><path d="M7 14h2"/></svg>
            </div>
            <p class="text-2xl font-bold mt-1">{{ stats.total }}</p>
          </div>
          <div class="rounded-lg border bg-card p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-muted-foreground">Open</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>
            </div>
            <p class="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">{{ stats.open }}</p>
          </div>
          <div class="rounded-lg border bg-card p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-muted-foreground">Closed</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <p class="text-2xl font-bold mt-1 text-muted-foreground">{{ stats.closed }}</p>
          </div>
          <div class="rounded-lg border bg-card p-4">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-muted-foreground">By Type</span>
            </div>
            <div class="flex gap-2 mt-1 text-xs flex-wrap">
              @for (entry of typeStats(); track entry.type) {
                <span class="px-2 py-0.5 rounded-full {{ entry.colorClass }}">{{ entry.type }}: {{ entry.count }}</span>
              }
            </div>
          </div>
        }
      </div>

      <div class="rounded-lg border bg-card">
        <div class="p-4 border-b">
          <h2 class="text-lg font-semibold">Recent Tickets</h2>
        </div>
        @if (loading) {
          <div class="p-4 space-y-3">
            @for (i of [1, 2, 3]; track i) {
              <div class="h-12 bg-muted rounded animate-pulse"></div>
            }
          </div>
        } @else if (tickets.length === 0) {
          <div class="p-8 text-center text-muted-foreground">
            <p class="text-lg mb-2">No tickets yet</p>
            <p class="text-sm">Create your first ticket to get started.</p>
          </div>
        } @else {
          <div class="divide-y">
            @for (ticket of tickets; track ticket.id) {
              <a [routerLink]="['/tickets', ticket.id]" class="flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors">
                <span class="w-2 h-2 rounded-full flex-shrink-0" [class.bg-green-500]="ticket.status === 'open'" [class.bg-muted-foreground]="ticket.status === 'closed'"></span>
                <span class="flex-1 truncate text-sm">{{ ticket.title }}</span>
                <span class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                  [class]="getTypeBadgeClass(ticket.type)">
                  {{ ticket.type }}
                </span>
                <span class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                  [ngClass]="ticket.status === 'open' ? 'bg-success/15 text-success' : 'bg-muted/50 text-muted-foreground'">
                  {{ ticket.status }}
                </span>
              </a>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  api = inject(ApiService);
  loading = true;
  tickets: TicketSummary[] = [];
  stats = { total: 0, open: 0, closed: 0 };
  typeStats = signal<Array<{ type: string; count: number; colorClass: string }>>([]);

  ngOnInit(): void { this.loadTickets(); }

  private loadTickets(): void {
    this.api.getTickets({ limit: 5, sort: 'updated', order: 'desc' }).subscribe({
      next: (res) => { this.tickets = res.tickets; this.updateStats(); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  private updateStats(): void {
    this.api.getTickets({ limit: 9999 }).subscribe({
      next: (res) => {
        const all = res.tickets;
        this.stats = { total: all.length, open: all.filter(t => t.status === 'open').length, closed: all.filter(t => t.status === 'closed').length };

        // Count tickets per type
        const typeMap = new Map<string, number>();
        for (const t of all) {
          typeMap.set(t.type, (typeMap.get(t.type) || 0) + 1);
        }

        // Get configured types and ensure ALL are shown (even with 0 count)
        this.api.getTicketTypes().subscribe({
          next: (configuredTypes) => {
            this.typeStats.set(
              configuredTypes.map(type => ({
                type,
                count: typeMap.get(type) || 0,
                colorClass: getTypeColorClass(type),
              }))
            );
          },
          error: () => {
            // Fallback: show only types that appear in ticket data
            this.typeStats.set(
              Array.from(typeMap.entries())
                .map(([type, count]) => ({ type, count, colorClass: getTypeColorClass(type) }))
            );
          },
        });
      },
      error: () => {},
    });
  }

  getTypeBadgeClass(type: string): string {
    return getTypeColorClass(type);
  }
}
