import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { supabase } from '../../utils/supbabase';
import { uuid } from '@supabase/supabase-js/dist/main/lib/helpers';
import { Track } from '../track/entities/track.entity';

@Injectable()
export class QueueService {
  async addSongToQueue(userId: string, trackId: string) {
    // Lấy vị trí lớn nhất hiện tại trong queue của user
    const { data: maxData, error: maxError } = await supabase
      .from('queue')
      .select('position')
      .eq('profileId', userId)
      .order('position', { ascending: false })
      .limit(1);

    if (maxError) {
      throw new BadRequestException('Failed to get queue max position');
    }

    const nextPosition = maxData?.[0]?.position + 1 || 0;

    // Thêm bài mới vào cuối
    const { data, error } = await supabase
      .from('queue')
      .insert({
        id: uuid(),
        profileId: userId,
        trackId: trackId,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      console.log(error);
      throw new BadRequestException('Failed to add song to queue');
    }

    return data;
  }


  async getQueueByUser(userId: string) {
    const { data, error } = await supabase
      .from('queue')
      .select(
        `
        id,
        position,
        track:trackId (*)
      `
      )
      .eq('profileId', userId)
      .order('position', { ascending: true });

    if (error) {
      throw new BadRequestException('Failed to get user queue');
    }

    return data;
  }

  async removeSongFromQueue(userId: string, trackId: string) {
    const { error } = await supabase
      .from('queue')
      .delete()
      .eq('profileId', userId)
      .eq('trackId', trackId);

    if (error) {
      throw new BadRequestException('Failed to remove song from queue');
    }

    return { message: 'Song removed from queue' };
  }

  async clearQueue(userId: string) {
    const { error } = await supabase
      .from('queue')
      .delete()
      .eq('profileId', userId);

    if (error) {
      throw new BadRequestException('Failed to clear queue');
    }

    return { message: 'Queue cleared' };
  }

  async getRandomTracksForUser(userId: string, limit: number = 10) {
    const { data, error } = await supabase.rpc('get_random_tracks', {
      user_id: userId,
      limit_count: limit,
    });

    if (error) {
      throw new BadRequestException('Failed to fetch random tracks');
    }

    return data;
  }

  async refillQueue(userId: string, limit: number = 10) {
    // Lấy queue hiện tại để biết position cuối cùng
    const { data: currentQueue, error: queueError } = await supabase
      .from('queue')
      .select('position')
      .eq('profileId', userId)
      .order('position', { ascending: true });

    if (queueError) {
      throw new BadRequestException('Failed to check queue');
    }

    // Xác định vị trí bắt đầu (nếu queue trống thì bắt đầu từ 0)
    const startPosition =
      currentQueue && currentQueue.length > 0
        ? currentQueue[currentQueue.length - 1].position + 1
        : 0;

    // Lấy track random
    const randomTracks = await this.getRandomTracksForUser(userId, limit);

    // Thêm vào queue với position tiếp theo
    for (let i = 0; i < randomTracks.length; i++) {
      await supabase.from('queue').insert({
        profileId: userId,
        trackId: randomTracks[i].id,
        position: startPosition + i,
      });
    }

    return { message: 'Queue refilled', tracks: randomTracks };
  }

  async playSongNow(userId: string, trackId: string) {
    // 1. Clear toàn bộ queue
    await this.clearQueue(userId);

    // 2. Thêm track vào đầu queue (position = 0)
    const { data, error } = await supabase
      .from('queue')
      .insert({
        id: uuid(),
        profileId: userId,
        trackId: trackId,
        position: 0,
      })
      .select()
      .single();

    if (error) throw new BadRequestException('Failed to add song to queue');

    return data;
  }

  async addPlaylistToQueue(userId: string, playlistId: string) {
    // 1️⃣ Lấy vị trí lớn nhất hiện tại trong queue của user
    const { data: maxData, error: maxError } = await supabase
      .from('queue')
      .select('position')
      .eq('profileId', userId)
      .order('position', { ascending: false })
      .limit(1);

    if (maxError) {
      throw new BadRequestException('Failed to get queue max position');
    }

    const nextPosition = maxData?.[0]?.position + 1 || 0;

    // 2️⃣ Lấy tất cả track trong playlist
    const { data: playlistTracks, error: playlistError } = await supabase
      .from('playlist_tracks')
      .select('trackId')
      .eq('playlistId', playlistId)
      .order('createAt', { ascending: true });

    if (playlistError) {
      throw new BadRequestException('Failed to get playlist tracks');
    }

    // 3️⃣ Kiểm tra playlist rỗng
    if (!playlistTracks || playlistTracks.length === 0) {
      return { message: 'Playlist is empty', trackCount: 0 };
    }

    // 4️⃣ Chuẩn bị batch insert
    const rows = playlistTracks.map((pt, i) => ({
      id: uuid(),
      profileId: userId,
      trackId: pt.trackId,
      position: nextPosition + i,
    }));

    // 5️⃣ Insert batch và trả về data
    const { data, error } = await supabase.from('queue').insert(rows).select();

    if (error) {
      throw new BadRequestException('Failed to add playlist to queue');
    }

    return { message: 'Playlist added to queue', trackCount: playlistTracks.length, data };
  }


}
