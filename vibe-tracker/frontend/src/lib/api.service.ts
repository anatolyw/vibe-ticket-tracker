import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

export interface TicketFrontmatter {
  id: string;
  title: string;
  type: string;
  status: 'open' | 'closed';
  created: string;
  updated: string;
}

export interface TicketBody {
  raw: string;
  html: string;
}

export interface Ticket extends TicketFrontmatter {
  body: TicketBody;
}

export interface TicketSummary {
  id: string;
  title: string;
  type: string;
  status: 'open' | 'closed';
  created: string;
  updated: string;
}

export interface TicketsResponse {
  tickets: Ticket[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface CreateTicketInput {
  title: string;
  type: string;
  description?: string;
}

export interface UpdateTicketInput {
  title?: string;
  type?: string;
  status?: 'open' | 'closed';
  body?: string;
}

/** Available ticket types from the backend config */
export interface TicketTypeOption {
  label: string;
  value: string;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = '/api/tickets';

  constructor(private http: HttpClient) {}

  getTickets(params?: {
    status?: string;
    type?: string;
    search?: string;
    sort?: string;
    order?: string;
    limit?: number;
    offset?: number;
  }): Observable<TicketsResponse> {
    let httpParams = new HttpParams();
    if (params?.status) httpParams = httpParams.set('status', params.status);
    if (params?.type) httpParams = httpParams.set('type', params.type);
    if (params?.search) httpParams = httpParams.set('search', params.search);
    if (params?.sort) httpParams = httpParams.set('sort', params.sort);
    if (params?.order) httpParams = httpParams.set('order', params.order);
    if (params?.limit) httpParams = httpParams.set('limit', String(params.limit));
    if (params?.offset) httpParams = httpParams.set('offset', String(params.offset));
    return this.http.get<TicketsResponse>(this.baseUrl, { params: httpParams });
  }

  getTicket(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.baseUrl}/${id}`);
  }

  getTicketRaw(id: string): Observable<string> {
    return this.http.get(`${this.baseUrl}/${id}/raw`, { responseType: 'text' });
  }

  getSummaries(): Observable<TicketSummary[]> {
    return this.http.get<TicketSummary[]>(`${this.baseUrl}/summaries`);
  }

  createTicket(input: CreateTicketInput): Observable<Ticket> {
    return this.http.post<Ticket>(this.baseUrl, input);
  }

  updateTicket(id: string, updates: UpdateTicketInput): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.baseUrl}/${id}`, updates);
  }

  deleteTicket(id: string): Observable<{ success: boolean; id: string }> {
    return this.http.delete<{ success: boolean; id: string }>(`${this.baseUrl}/${id}`);
  }

  /** Fetch all configured ticket type options from the backend */
  getTicketTypes(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/types`);
  }

  toggleStatus(id: string): Observable<Ticket> {
    return this.getTicket(id).pipe(
      map(ticket => ({
        ...ticket,
        status: ticket.status === 'open' ? 'closed' : 'open',
      }))
    );
  }
}
