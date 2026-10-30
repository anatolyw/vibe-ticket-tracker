import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { ApiService, TicketSummary } from '../../lib/api.service';

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
            <div class="flex gap-2 mt-1 text-xs">
              <span class="px-2 py-0.5 rounded-full bg-info/15 text-info dark:bg-info/25 dark:text-info">issue: {{ stats.issue || 0 }}</span>
              <span class="px-2 py-0.5 rounded-full bg-purple/15 text-purple dark:bg-purple/25 dark:text-purple">feat: {{ stats.feat || 0 }}</span>
              <span class="px-2 py-0.5 rounded-full bg-destructive/15 text-destructive dark:bg-destructive/25 dark:text-destructive">bug: {{ stats.bug || 0 }}</span>
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
                  [ngClass]="ticket.type === 'issue' ? 'bg-info/15 text-info' : ticket.type === 'feat' ? 'bg-purple/15 text-purple' : 'bg-destructive/15 text-destructive'">
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
  stats = { total: 0, open: 0, closed: 0, issue: 0, feat: 0, bug: 0 };

  ngOnInit(): void { this.loadTickets(); }

  private loadTickets(): void {
    this.api.getTickets({ limit: 5, sort: 'updated', order: 'desc' }).subscribe({
      next: (res) => { this.tickets = res.tickets; this.updateStats(); this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  private updateStats(): void {
    this.api.getTickets().subscribe({
      next: (res) => {
        const all = res.tickets;
        this.stats = { total: all.length, open: all.filter(t => t.status === 'open').length, closed: all.filter(t => t.status === 'closed').length, issue: all.filter(t => t.type === 'issue').length, feat: all.filter(t => t.type === 'feat').length, bug: all.filter(t => t.type === 'bug').length };
      },
      error: () => {},
    });
  }
}
