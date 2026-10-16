/**
 * Notifications Service
 * Encapsulates Supabase queries for member notifications and read status tracking.
 */

import { supabase } from '../lib/supabaseClient';
import type { NotificationRow } from '../types/database.types';

export interface CreateNotificationParams {
  recipient_id: string;
  title: string;
  message: string;
  type: string;
  link_tab?: string | null;
  item_id?: string | null;
}

export const notificationsService = {
  /**
   * Fetch all notifications for the authenticated user
   */
  async getNotifications(
    userId?: string
  ): Promise<{ data: NotificationRow[] | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('recipient_id', userId);
      }

      const { data, error } = await query;
      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(
    notificationId: string
  ): Promise<{ data: NotificationRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Mark all notifications as read for a given recipient
   */
  async markAllAsRead(recipientId: string): Promise<{ success: boolean; error: Error | null }> {
    if (!supabase) {
      return { success: false, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', recipientId)
        .eq('read', false);

      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },

  /**
   * Send/create a new notification
   */
  async createNotification(
    params: CreateNotificationParams
  ): Promise<{ data: NotificationRow | null; error: Error | null }> {
    if (!supabase) {
      return { data: null, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: params.recipient_id,
          title: params.title,
          message: params.message,
          type: params.type,
          link_tab: params.link_tab ?? null,
          item_id: params.item_id ?? null,
          read: false,
        })
        .select()
        .single();

      return { data, error };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  },

  /**
   * Delete a notification
   */
  async deleteNotification(
    notificationId: string
  ): Promise<{ success: boolean; error: Error | null }> {
    if (!supabase) {
      return { success: false, error: new Error('Supabase client is not configured (Demo Mode)') };
    }

    try {
      const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err as Error };
    }
  },
};
