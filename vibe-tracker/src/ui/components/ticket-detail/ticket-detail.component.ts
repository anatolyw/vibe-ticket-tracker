import { Component, OnInit, inject, signal } from '@angular/core';
import { LucideIconComponent } from '../../lib/lucide-icon.component';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { ApiService, UpdateTicketInput } from '../../lib/api.service';
import { marked } from 'marked';

@Component({
  selector: 'app-ticket-detail',
  imports: [RouterLink, LucideIconComponent],
  template: `
    <div class="max-w-4xl mx-auto space-y-6">
      @if (loading) {
        <div class="space-y-4">
          <div class="h-8 bg-muted rounded animate-pulse w-1/2"></div>
          <div class="h-64 bg-muted rounded animate-pulse"></div>
        </div>
      } @else if (error()) {
        <div class="text-center py-12">
          <lucide-icon name="AlertCircle" [size]="48" class="mx-auto text-muted-foreground/50 mb-4"></lucide-icon>
          <p class="text-lg font-medium mb-2">{{ error() }}</p>
          <a routerLink="/tickets" class="text-primary hover:underline">Back to tickets</a>
        </div>
      } @else if (ticket()) {
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-2 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-medium"
                [class.bg-blue-100]="ticket()!.type === 'issue'" [class.bg-purple-100]="ticket()!.type === 'feat'" [class.bg-red-100]="ticket()!.type === 'bug'"
                [class.text-blue-800]="ticket()!.type === 'issue'" [class.text-purple-800]="ticket()!.type === 'feat'" [class.text-red-800]="ticket()!.type === 'bug'"
                [class.dark:bg-blue-900]="ticket()!.type === 'issue'" [class.dark:bg-purple-900]="ticket()!.type === 'feat'" [class.dark:bg-red-900]="ticket()!.type === 'bug'"
                [class.dark:text-blue-200]="ticket()!.type === 'issue'" [class.dark:text-purple-200]="ticket()!.type === 'feat'" [class.dark:text-red-200]="ticket()!.type === 'bug'">
                {{ ticket()!.type }}
              </span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-medium"
                [class.bg-green-100]="ticket()!.status === 'open'" [class.bg-gray-100]="ticket()!.status === 'closed'"
                [class.text-green-800]="ticket()!.status === 'open'" [class.text-gray-600]="ticket()!.status === 'closed'"
                [class.dark:bg-green-900]="ticket()!.status === 'open'" [class.dark:bg-gray-700]="ticket()!.status === 'closed'"
                [class.dark:text-green-200]="ticket()!.status === 'open'" [class.dark:text-gray-300]="ticket()!.status === 'closed'">
                {{ ticket()!.status }}
              </span>
              <span class="text-xs text-muted-foreground font-mono">{{ ticket()!.id }}</span>
            </div>
            <h1 class="text-2xl font-bold">{{ ticket()!.title }}</h1>
            <p class="text-sm text-muted-foreground mt-1">
              Created {{ formatDate(ticket()!.created) }} &middot; Updated {{ formatDate(ticket()!.updated) }}
            </p>
          </div>
          <div class="flex gap-2 flex-shrink-0">
            @if (isEditing()) {
              <button (click)="saveChanges()" [disabled]="saving()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                <lucide-icon name="Save" [size]="14"></lucide-icon> Save
              </button>
              <button (click)="cancelEdit()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-accent transition-colors">
                <lucide-icon name="X" [size]="14"></lucide-icon> Cancel
              </button>
            } @else {
              <button (click)="toggleEditMode()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium hover:bg-accent transition-colors">
                <lucide-icon name="Edit" [size]="14"></lucide-icon> Edit
              </button>
              <button (click)="toggleStatus()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90" [class.border]="ticket()!.status === 'closed'" [class.hover:bg-accent]="ticket()!.status === 'closed'" [class.bg-primary]="ticket()!.status !== 'closed'" [class.text-primary-foreground]="ticket()!.status !== 'closed'">{{ ticket()!.status === 'open' ? 'Close' : 'Reopen' }}</button>
              <button (click)="confirmDelete()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
                <lucide-icon name="Trash2" [size]="14"></lucide-icon> Delete
              </button>
            }
          </div>
        </div>

        @if (!isEditing()) {
          <div class="rounded-lg border bg-card p-6">
            <div class="prose prose-sm md:prose-base dark:prose-invert" [innerHTML]="renderedContent()"></div>
          </div>
        }

        @if (isEditing()) {
          <div class="rounded-lg border bg-card p-4 space-y-3">
            <div>
              <label class="block text-sm font-medium mb-1">Title</label>
              <input type="text" [value]="editData().title" (input)="onEditField('title', $event)"
                class="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">Type</label>
                <select [value]="editData().type" (change)="onEditField('type', $event)"
                  class="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="issue">Issue</option>
                  <option value="feat">Feat</option>
                  <option value="bug">Bug</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Status</label>
                <select [value]="editData().status" (change)="onEditField('status', $event)"
                  class="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Body (Markdown)</label>
              <textarea [value]="editData().body" (input)="onEditField('body', $event)" rows="16"
                class="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"></textarea>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class TicketDetailComponent implements OnInit {
  api = inject(ApiService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  ticket = signal<any>(null);
  loading = true;
  error = signal('');
  isEditing = signal(false);
  saving = signal(false);

  editData = signal({ title: '', type: 'issue', status: 'open' as 'open' | 'closed', body: '' });
  renderedContent = signal('');

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    this.loadTicket(id);
  }

  private loadTicket(id: string): void {
    this.loading = true;
    this.error.set('');
    this.api.getTicket(id).subscribe({
      next: (ticket) => {
        this.ticket.set(ticket);
        this.renderedContent.set(ticket.body.html);
        this.editData.set({ title: ticket.title, type: ticket.type, status: ticket.status, body: ticket.body.raw });
        this.loading = false;
      },
      error: () => {
        this.error.set('Ticket not found');
        this.loading = false;
      },
    });
  }

  toggleEditMode(): void {
    this.isEditing.update((v) => !v);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
    const t = this.ticket();
    if (t) {
      this.editData.set({ title: t.title, type: t.type, status: t.status, body: t.body.raw });
      this.renderedContent.set(t.body.html);
    }
  }

  onEditField(field: string, event: Event): void {
    const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
    this.editData.update((data) => ({ ...data, [field]: target.value }));
    if (field === 'body') {
      this.renderedContent.set(marked.parse(target.value) as string);
    }
  }

  saveChanges(): void {
    const ticket = this.ticket();
    if (!ticket) return;
    const data = this.editData();
    const updates: UpdateTicketInput = { title: data.title, type: data.type, status: data.status, body: data.body };

    this.saving.set(true);
    this.api.updateTicket(ticket.id, updates).subscribe({
      next: (updated) => {
        this.ticket.set(updated);
        this.renderedContent.set(updated.body.html);
        this.isEditing.set(false);
        this.saving.set(false);
      },
      error: (err) => {
        this.saving.set(false);
        alert(err.error?.error || 'Failed to update ticket');
      },
    });
  }

  toggleStatus(): void {
    const ticket = this.ticket();
    if (!ticket) return;
    const newStatus = ticket.status === 'open' ? 'closed' : 'open';
    this.api.updateTicket(ticket.id, { status: newStatus }).subscribe({
      next: (updated) => {
        this.ticket.set(updated);
        this.renderedContent.set(updated.body.html);
      },
      error: () => alert('Failed to update ticket'),
    });
  }

  confirmDelete(): void {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    const ticket = this.ticket();
    if (!ticket) return;
    this.api.deleteTicket(ticket.id).subscribe({
      next: () => this.router.navigate(['/tickets']),
      error: () => alert('Failed to delete ticket'),
    });
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
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
