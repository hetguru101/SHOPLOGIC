import { supabase } from '@/core/supabase/client';
import type { Json } from '@/core/types/database';
import type { Settings } from '@/core/types/models';
import { mergeConfig } from '@/modules/settings/mergeConfig';

/**
 * Shop settings — stored as one row per shop (`settings.config` JSONB, see 001 + 002 migrations).
 */
export const SettingsService = {
  async fetchConfigForShop(shopId: string): Promise<Settings['config'] | null> {
    const { data: row, error } = await supabase
      .from('settings')
      .select('config')
      .eq('shop_id', shopId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (row?.config) return row.config as Settings['config'];

    const { data: globalRow } = await supabase.from('settings').select('config').is('shop_id', null).limit(1).maybeSingle();

    return (globalRow?.config as Settings['config']) ?? null;
  },

  async updateConfigPatch(shopId: string, patch: Partial<Settings['config']>): Promise<Settings['config']> {
    const current = (await this.fetchConfigForShop(shopId)) ?? {};
    const next = mergeConfig(current as Record<string, unknown>, patch as Record<string, unknown>) as Settings['config'];

    const { data: existing, error: findErr } = await supabase
      .from('settings')
      .select('setting_id')
      .eq('shop_id', shopId)
      .maybeSingle();
    if (findErr && findErr.code !== 'PGRST116') throw findErr;

    if (existing?.setting_id) {
      const { error } = await supabase.from('settings').update({ config: next as unknown as Json }).eq('setting_id', existing.setting_id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('settings').insert({ shop_id: shopId, config: next as unknown as Json });
      if (error) throw error;
    }

    return next;
  },

  async getWorkOrderSequenceFormat(shopId: string): Promise<string> {
    const c = await this.fetchConfigForShop(shopId);
    return c?.work_order_sequence?.format ?? 'WO-{YYYY}-{SEQUENCE}';
  },

  async getTechIdSequenceFormat(shopId: string): Promise<string> {
    const c = await this.fetchConfigForShop(shopId);
    return c?.tech_id_sequence?.format ?? 'TECH-{YYYY}-{SEQUENCE}';
  },

  async getPoNumberSequenceFormat(shopId: string): Promise<string> {
    const c = await this.fetchConfigForShop(shopId);
    return c?.po_sequence?.format ?? 'PO-{SEQUENCE}';
  },

  async getDefaultLaborRate(shopId: string): Promise<number> {
    const c = await this.fetchConfigForShop(shopId);
    const v = c?.default_labor_rate;
    return typeof v === 'number' ? v : 55;
  },

  async formatSequenceNumber(
    shopId: string,
    type: 'work_order' | 'tech_id' | 'po',
    sequenceNumber: number
  ): Promise<string> {
    const c = await this.fetchConfigForShop(shopId);
    let format: string;
    if (type === 'work_order') {
      format = c?.work_order_sequence?.format ?? 'WO-{YYYY}-{SEQUENCE}';
    } else if (type === 'tech_id') {
      format = c?.tech_id_sequence?.format ?? 'T-{SEQUENCE}';
    } else {
      format = c?.po_sequence?.format ?? 'PO-{YYYY}-{SEQUENCE}';
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
