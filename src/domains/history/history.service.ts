import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateHistoryDto } from './dto/create-history.dto';
import { UpdateHistoryDto } from './dto/update-history.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile } from '../profile/entities/profile.entity';
import { Track } from '../track/entities/track.entity';
import { supabase } from '../../utils/supbabase';
import { uuid } from '@supabase/supabase-js/dist/main/lib/helpers';

@Injectable()
export class HistoryService {
  async addToHistory(userId: string, trackId: string) {
    // Kiểm tra xem record đã tồn tại chưa
    const { data: existing, error: findError } = await supabase
      .from('history')
      .select('id')
      .eq('profileId', userId)
      .eq('trackId', trackId)
      .single();

    if (findError && findError.code !== 'PGRST116') {
      // code PGRST116 = không tìm thấy record
      throw new BadRequestException('Failed to check history');
    }

    if (existing) {
      // Nếu đã có -> update playedAt
      const { data, error } = await supabase
        .from('history')
        .update({ playedAt: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Failed to update history');
      }
      return data;
    } else {
      // Nếu chưa có -> insert mới
      const { data, error } = await supabase
        .from('history')
        .insert({
          id: uuid(),
          profileId: userId,
          trackId,
          playedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        throw new BadRequestException('Failed to add to history');
      }
      return data;
    }
  }

  async getHistoryByUser(userId: string, limit: number = 50) {
    const { data, error } = await supabase
      .from('history')
      .select(
        `
        id,
        playedAt,
        track:trackId (*)
      `,
      )
      .eq('profileId', userId)
      .order('playedAt', { ascending: false })
      .limit(limit);

    if (error) {
      throw new BadRequestException('Failed to fetch history');
    }

    return data;
  }

  async clearHistory(userId: string) {
    const { error } = await supabase
      .from('history')
      .delete()
      .eq('profileId', userId);

    if (error) {
      throw new BadRequestException('Failed to clear history');
    }

    return { message: 'History cleared' };
  }
}
