import { Component, OnInit, inject, signal, WritableSignal } from '@angular/core';
import { LucideIconComponent } from '../../lib/lucide-icon.component';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, CreateTicketInput, TicketTypeOption } from '../../lib/api.service';

@Component({
  selector: 'app-ticket-create',
  imports: [RouterLink, LucideIconComponent, FormsModule],
  template: `
    <div class="max-w-2xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">New Ticket</h1>
          <p class="text-muted-foreground mt-1">Create a new ticket to track your work</p>
        </div>
        <a routerLink="/tickets" class="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground" aria-label="Back to tickets">
          <lucide-icon name="X" [size]="20"></lucide-icon>
        </a>
      </div>

      <form (ngSubmit)="onSubmit()" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1.5">Title *</label>
          <input type="text" [value]="title()" (input)="onTitleInput($event)" placeholder="e.g., Add login page with OIDC auth"
            class="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" required maxlength="200" />
          <span class="text-xs text-muted-foreground">{{ title().length }}/200</span>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Type *</label>
          <select (change)="onTypeChange($event)"
            class="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            @for (t of ticketTypes(); track t.value) {
              <option [value]="t.value" [selected]="t.value === type()">{{ t.label }}</option>
            }
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1.5">Description</label>
          <textarea [value]="description()" (input)="onDescInput($event)" placeholder="Describe what needs to be done..."
            rows="8" class="w-full px-3 py-2 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"></textarea>
          <p class="text-xs text-muted-foreground mt-1">Markdown supported</p>
        </div>

        <div class="flex gap-3 pt-2">
          <button type="submit" [disabled]="submitting() || type() === ''"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
            <lucide-icon name="Save" [size]="16"></lucide-icon>
            {{ submitting() ? 'Creating...' : 'Create Ticket' }}
          </button>
          <a routerLink="/tickets" class="inline-flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium hover:bg-accent transition-colors">
            Cancel
          </a>
        </div>

        @if (error()) {
          <div class="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{{ error() }}</div>
        }
        @if (success()) {
          <div class="p-3 rounded-md bg-success/15 text-success text-sm">
            Ticket created! Redirecting...
          </div>
        }
      </form>
    </div>
  `,
})
export class TicketCreateComponent implements OnInit {
  api = inject(ApiService);
  router = inject(Router);

  title = signal('');
  type = signal('');
  description = signal('');
  submitting = signal(false);
  error = signal('');
  success = signal(false);
  ticketTypes: WritableSignal<TicketTypeOption[]> = signal([]);

  ngOnInit(): void {
    this.loadTicketTypes();
  }

  private loadTicketTypes(): void {
    this.api.getTicketTypes().subscribe({
      next: (types) => {
        const options = types.map(type => ({
          label: this.formatTypeLabel(type),
          value: type,
        }));
        this.ticketTypes.set(options);
        // Always default to first available type
        if (options.length > 0) {
          this.type.set(options[0].value);
        }
      },
      error: () => {
        this.error.set('Failed to load ticket types');
      },
    });
  }

  private formatTypeLabel(type: string): string {
    return type.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  onTitleInput(event: Event): void {
    this.title.set((event.target as HTMLInputElement).value);
  }

  onTypeChange(event: Event): void {
    this.type.set((event.target as HTMLSelectElement).value);
  }

  onDescInput(event: Event): void {
    this.description.set((event.target as HTMLTextAreaElement).value);
  }

  onSubmit(): void {
    this.error.set('');
    if (!this.title().trim()) {
      this.error.set('Title is required');
      return;
    }
    if (!this.type()) {
      this.error.set('Please select a type');
      return;
    }

    this.submitting.set(true);
    const input: CreateTicketInput = {
      title: this.title().trim(),
      type: this.type(),
      description: this.description().trim(),
    };

    this.api.createTicket(input).subscribe({
      next: (ticket) => {
        this.success.set(true);
        setTimeout(() => {
          this.router.navigate(['/tickets', ticket.id]);
        }, 1000);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err.error?.error || 'Failed to create ticket');
      },
    });
  }
}
