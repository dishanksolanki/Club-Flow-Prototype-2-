/**
 * Events Service
 * Encapsulates Supabase queries for club events, workshops, and RSVPs.
 */

import { supabase } from '../lib/supabaseClient';
import type { EventRow, EventStatus } from '../types/database.types';

export interface CreateEventParams {
  title: string;
  description?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  venue: string;
  organizer_id: string;
  department_id: string;
  status?: EventStatus;
  capacity?: number;
  tags?: string[];
}

export interface UpdateEventParams {
  title?: string;
  description?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  venue?: string;
  status?: EventStatus;
  capacity?: number;
  tags?: string[];
}

export const eventsService = {
  /**
   * Fetch all scheduled club events
   */
  async getEvents(): Promise<{ data: EventRow[] | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });
      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Fetch member RSVPs for a given event
   */
  async getEventRsvps(eventId: string): Promise<{ data: string[] | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('member_id')
        .eq('event_id', eventId);

      return { data: data ? data.map((d) => d.member_id) : [], error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Create a new club event (Department Leads or Executives only)
   */
  async createEvent(params: CreateEventParams): Promise<{ data: EventRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: params.title,
          description: params.description ?? '',
          event_date: params.event_date,
          start_time: params.start_time,
          end_time: params.end_time,
          venue: params.venue,
          organizer_id: params.organizer_id,
          department_id: params.department_id,
          status: params.status ?? 'Upcoming',
          capacity: params.capacity ?? 100,
          tags: params.tags ?? [],
        })
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Update an existing event
   */
  async updateEvent(eventId: string, updates: UpdateEventParams): Promise<{ data: EventRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Toggle current user's RSVP status for an event
   */
  async toggleRsvp(
    eventId: string,
    memberId: string
  ): Promise<{ isRsvped: boolean; error: Error | null }> {
    if (!supabase) {
      return { isRsvped: false, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data: existing } = await supabase
        .from('event_rsvps')
        .select('id')
        .eq('event_id', eventId)
        .eq('member_id', memberId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('event_rsvps')
          .delete()
          .eq('event_id', eventId)
          .eq('member_id', memberId);

        return { isRsvped: false, error };
      } else {
        const { error } = await supabase
          .from('event_rsvps')
          .insert({ event_id: eventId, member_id: memberId });

        return { isRsvped: true, error };
      }
    } catch (err) {
      return { isRsvped: false, error: err as Error };
    }
  },
};
