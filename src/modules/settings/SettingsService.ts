import { supabase } from '@/core/supabase/client';

/**
 * Settings Service
 * Handles all admin settings operations:
 * - Sequence formatting (work order, tech ID, PO)
 * - Labor rates (default shop rate, customer overrides)
 * - Markup matrix (parts, sublet percentages)
 */

export const SettingsService = {
  /**
   * Get a setting by key
   */
  async getSetting(key: string): Promise<any> {
    const { data, error } = await supabase
      .from('settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    try {
      return JSON.parse((data as any).setting_value);
    } catch {
      return (data as any).setting_value; // Return as string if not JSON
    }
  },

  /**
   * Get multiple settings
   */
  async getSettings(keys: string[]): Promise<Record<string, any>> {
    const { data, error } = await supabase
      .from('settings')
      .select('setting_key, setting_value')
      .in('setting_key', keys);

    if (error) throw error;

    const result: Record<string, any> = {};
    (data || []).forEach((row: any) => {
      try {
        result[row.setting_key] = JSON.parse(row.setting_value);
      } catch {
        result[row.setting_key] = row.setting_value;
      }
    });

    return result;
  },

  /**
   * Update a setting
   */
  async updateSetting(key: string, value: any): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    const { error } = await supabase
      .from('settings')
      .upsert([{
        setting_key: key,
        setting_value: stringValue,
      }] as any);

    if (error) throw error;
  },

  /**
   * Get work order sequence format
   * Default: "WO-{YYYY}-{SEQUENCE}"
   */
  async getWorkOrderSequenceFormat(): Promise<string> {
    const format = await this.getSetting('work_order_sequence_format');
    return format || 'WO-{YYYY}-{SEQUENCE}';
  },

  /**
   * Get tech ID sequence format
   * Default: "TECH-{YYYY}-{SEQUENCE}"
   */
  async getTechIdSequenceFormat(): Promise<string> {
    const format = await this.getSetting('tech_id_sequence_format');
    return format || 'TECH-{YYYY}-{SEQUENCE}';
  },

  /**
   * Get PO number sequence format
   * Default: "PO-{SEQUENCE}"
   */
  async getPoNumberSequenceFormat(): Promise<string> {
    const format = await this.getSetting('po_number_sequence_format');
    return format || 'PO-{SEQUENCE}';
  },

  /**
   * Get default shop labor rate
   */
  async getDefaultLaborRate(): Promise<number> {
    const rate = await this.getSetting('default_labor_rate');
    return parseFloat(rate) || 55.0;
  },

  /**
   * Get parts markup percentage (0-100)
   */
  async getPartsMarkup(): Promise<number> {
    const markup = await this.getSetting('parts_markup_percent');
    return parseFloat(markup) || 20.0;
  },

  /**
   * Get sublet markup percentage (0-100)
   */
  async getSubletMarkup(): Promise<number> {
    const markup = await this.getSetting('sublet_markup_percent');
    return parseFloat(markup) || 15.0;
  },

  /**
   * Format a sequence number using stored template
   * Supports placeholders: {YYYY}, {MM}, {DD}, {SEQUENCE}
   */
  async formatSequenceNumber(
    type: 'work_order' | 'tech_id' | 'po',
    sequenceNumber: number
  ): Promise<string> {
    let format: string;

    if (type === 'work_order') {
      format = await this.getWorkOrderSequenceFormat();
    } else if (type === 'tech_id') {
      format = await this.getTechIdSequenceFormat();
    } else {
      format = await this.getPoNumberSequenceFormat();
    }

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const seq = String(sequenceNumber).padStart(4, '0');

    return format
      .replace('{YYYY}', String(yyyy))
      .replace('{MM}', mm)
      .replace('{DD}', dd)
      .replace('{SEQUENCE}', seq);
  },
};
