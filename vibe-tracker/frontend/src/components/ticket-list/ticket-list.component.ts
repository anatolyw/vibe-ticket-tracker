import { Component, OnInit, inject, signal } from '@angular/core';
import { LucideIconComponent } from '../../lib/lucide-icon.component';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { ApiService, TicketSummary } from '../../lib/api.service';

@Component({
  selector: 'app-ticket-list',
  imports: [RouterLink, LucideIconComponent, NgClass],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Tickets</h1>
          <p class="text-muted-foreground mt-1">Manage and track all tickets</p>
        </div>
        <a routerLink="/tickets/new" class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <lucide-icon name="Ticket" [size]="16"></lucide-icon>
          New Ticket
        </a>
      </div>

      <div class="flex flex-wrap gap-3">
        <div class="relative flex-1 min-w-[200px]">
          <lucide-icon name="Search" [size]="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"></lucide-icon>
          <input type="text" placeholder="Search tickets..." [value]="search()" (input)="onSearch($event)"
            class="w-full pl-9 pr-4 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <select [value]="typeFilter()" (change)="onTypeFilter($event)"
          class="px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Types</option>
          <option value="issue">Issue</option>
          <option value="feat">Feat</option>
          <option value="bug">Bug</option>
        </select>
        <select [value]="statusFilter()" (change)="onStatusFilter($event)"
          class="px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
        </select>
        <select [value]="sort()" (change)="onSort($event)"
          class="px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="updated-desc">Updated ↓</option>
          <option value="updated-asc">Updated ↑</option>
          <option value="created-desc">Created ↓</option>
          <option value="title-asc">Title A-Z</option>
          <option value="title-desc">Title Z-A</option>
        </select>
      </div>

      @if (loading) {
        <div class="space-y-2">
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="h-16 bg-muted rounded animate-pulse"></div>
          }
        </div>
      } @else if (filteredTickets.length === 0) {
        <div class="rounded-lg border bg-card p-8 text-center">
          <lucide-icon name="Ticket" [size]="48" class="mx-auto text-muted-foreground/50 mb-4"></lucide-icon>
          <p class="text-lg font-medium mb-1">No tickets found</p>
          <p class="text-sm text-muted-foreground">@if (search() || typeFilter() || statusFilter()) { Try adjusting your filters. } @else { Create your first ticket to get started. }</p>
        </div>
      } @else {
        <div class="space-y-2">
          @for (ticket of filteredTickets; track ticket.id) {
            <a [routerLink]="['/tickets', ticket.id]" class="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
              <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" [class.bg-green-500]="ticket.status === 'open'" [class.bg-gray-400]="ticket.status === 'closed'"></span>
              <span class="flex-1 truncate group-hover:underline">{{ ticket.title }}</span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                [ngClass]="ticket.type === 'issue' ? 'bg-info/15 text-info' : ticket.type === 'feat' ? 'bg-purple/15 text-purple' : 'bg-destructive/15 text-destructive'">
                {{ ticket.type }}
              </span>
              <span class="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                [ngClass]="ticket.status === 'open' ? 'bg-success/15 text-success' : 'bg-muted/50 text-muted-foreground'">
                {{ ticket.status }}
              </span>
              <span class="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">{{ formatDate(ticket.updated) }}</span>
            </a>
          }
        </div>
        <div class="flex items-center justify-between pt-4">
          <span class="text-sm text-muted-foreground">Showing {{ filteredTickets.length }} of {{ totalCount }} tickets</span>
          <div class="flex gap-2">
            <button [disabled]="currentPage <= 1" (click)="goToPage(currentPage - 1)" class="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50 hover:bg-accent">Previous</button>
            <button [disabled]="currentPage * PAGE_SIZE >= totalCount" (click)="goToPage(currentPage + 1)" class="px-3 py-1.5 rounded-md border text-sm disabled:opacity-50 hover:bg-accent">Next</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class TicketListComponent implements OnInit {
  api = inject(ApiService);
  allTickets: TicketSummary[] = [];
  filteredTickets: TicketSummary[] = [];
  loading = true;

  search = signal('');
  typeFilter = signal('');
  statusFilter = signal('');
  sort = signal('updated-desc');
  currentPage = 1;
  PAGE_SIZE = 25;
  totalCount = 0;

  ngOnInit(): void {
    this.loadTickets();
  }

  private loadTickets(): void {
    this.loading = true;
    this.api.getTickets({ limit: 500, sort: 'updated', order: 'desc' }).subscribe({
      next: (res) => {
        this.allTickets = res.tickets;
        this.totalCount = res.pagination.total;
        this.applyFiltersAndSort();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  applyFiltersAndSort(): void {
    let result = [...this.allTickets];
    const q = this.search().toLowerCase().trim();
    if (q) result = result.filter((t) => t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
    const type = this.typeFilter();
    if (type) result = result.filter((t) => t.type === type);
    const status = this.statusFilter();
    if (status) result = result.filter((t) => t.status === status);

    const [sortBy, sortOrder] = this.sort().split('-') as [string, 'asc' | 'desc'];
    result.sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'title') return dir * a.title.localeCompare(b.title);
      return dir * (new Date(a.updated).getTime() - new Date(b.updated).getTime());
    });

    this.totalCount = result.length;
    const offset = (this.currentPage - 1) * this.PAGE_SIZE;
    this.filteredTickets = result.slice(offset, offset + this.PAGE_SIZE);
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  onTypeFilter(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  onStatusFilter(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  onSort(event: Event): void {
    this.sort.set((event.target as HTMLSelectElement).value);
    this.currentPage = 1;
    this.applyFiltersAndSort();
  }

  goToPage(page: number): void {
    this.currentPage = page;
    const offset = (page - 1) * this.PAGE_SIZE;
    this.filteredTickets = this.allTickets.slice(offset, offset + this.PAGE_SIZE);
  }

  formatDate(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(dateStr).toLocaleDateString();
  }
}
