import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from './entities/track.entity';
import { convertAudioToAac } from '../../utils/hls-converter';
import { supabase } from '../../utils/supbabase';

@Injectable()
export class TrackService {
  constructor(
    @InjectRepository(Track) private trackRepository: Repository<Track>,
  ) {}

  async create(
    createTrackDto: {
      trackId: string;
      trackName: string;
      artistName: string;
    },
    categoryId: string,
    userId: string,
    filePath: string,
    duration: number,
    thumbnailPath?: string,
  ) {
    // supbase
    const { data, error } = await supabase
      .from('track')
      .upsert({
        id: createTrackDto.trackId,
        title: createTrackDto.trackName,
        ownerId: userId,
        categoryId,
        artistName: createTrackDto.artistName,
        thumbnailPath: thumbnailPath == '' ? null : thumbnailPath,
        filePath,
        duration,
        viewCount: 0,
      })
      .select();
    if (error) {
      console.log(error);
      throw new BadRequestException(error);
    }
    return data[0];
  }

  async convertToAac(
    inputPath: string,
    opts: {
      bitrate?: string; // '192k' | '256k'...
      sampleRate?: number; // 44100 | 48000
      channels?: number; // 1 | 2
      outPath?: string; // đích .aac (tuỳ chọn)
      overwrite?: boolean; // có ghi đè không
    },
  ) {
    const out = await convertAudioToAac(inputPath, {
      bitrate: opts.bitrate ?? '192k',
      sampleRate: opts.sampleRate ?? 44100,
      channels: opts.channels ?? 2,
      outPath: opts.outPath, // có thể bỏ qua để auto đặt cùng thư mục
      overwrite: opts.overwrite ?? false,
    });
    return out;
  }

  async getTracksByCategoryId(categoryId: string) {
    return supabase
      .from('track')
      .select('*')
      .eq('categoryId', categoryId)
      .then(({ data, error }) => {
        if (error) {
          throw new BadRequestException(error);
        }
        return data;
      });
  }

  async searchTracks(query: string) {
    return supabase
      .from('track')
      .select('*')
      .or(
        `title.ilike.%${query}%,artistName.ilike.%${query}%`,
      )
      .then(({ data, error }) => {
        if (error) {
          throw new BadRequestException(error);
        }
        return data;
      });
  }

  async getTracksByOwnerId(ownerId: string) {
    return supabase
      .from('track')
      .select('*')
      .eq('ownerId', ownerId)
      .then(({ data, error }) => {
        if (error) {
          throw new BadRequestException(error);
        }
        return data;
      });
  }

  async getTrackDetails(trackId: string) {
    return supabase
      .from('track')
      .select('*')
      .eq('id', trackId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          throw new BadRequestException(error);
        }
        return data;
      });
  }

  async getFavouriteTracks(userId: string) {
    return supabase
      .from('playlist')
      .select('track(*)')
      .eq('title', 'Favorite')
      .eq('profileId', userId)
      .then(({ data, error }) => {
        if (error) {
          throw new BadRequestException(error);
        }
        return data.map(item => item.track);
      });
  }

  async incrementViewCount(trackId: string) {
    const { data, error } = await supabase
      .rpc('increment_view_count', { track_id: trackId });

    if (error) {
      throw new BadRequestException(error.message);
    }

    // Vì returns void nên data = null
    return { success: true };
  }

  async getThumbnailBasedOnTrackId(trackId: string): Promise<string | null> {
    const { data, error } = await supabase
      .storage
      .from('thumbnail')
      .list(trackId);

    if (error || !data || data.length === 0) {
      return null;
    }

    const jpgFile = data.find(file => file.name.endsWith('.jpg'));
    if (!jpgFile) {
      return null;
    }

    const { data: publicUrlData } = supabase
      .storage
      .from('thumbnail')
      .getPublicUrl(`${trackId}/${jpgFile.name}`);

    return publicUrlData?.publicUrl ?? null;
  }

  async getLyricsByTrackId(trackId: string): Promise<string | null> {
    const { data, error } = await supabase
      .storage
      .from('lyrics')
      .list(trackId);

    if (error || !data || data.length === 0) {
      return null;
    }

    const txtFile = data.find(file => file.name.endsWith('.txt'));
    if (!txtFile) {
      return null;
    }

    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('lyrics')
      .download(`${trackId}/${txtFile.name}`);

    if (downloadError || !fileData) {
      return null;
    }

    const buffer = await fileData.arrayBuffer();
    return Buffer.from(buffer).toString('utf-8');
  }

  async updateTrack(trackId: string, updateTrackDto: UpdateTrackDto) {
    const { data, error } = await supabase
      .from('track')
      .update(updateTrackDto)
      .eq('id', trackId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error);
    }

    return data;
  }

  async deleteTrack(trackId: string) {
    // Xóa track trong DB
    const { error } = await supabase
      .from('track')
      .delete()
      .eq('id', trackId);

    if (error) {
      throw new BadRequestException(error);
    }

    // Nếu muốn, có thể dọn luôn file liên quan (thumbnail, lyrics, audio)
    try {
      await supabase.storage.from('thumbnail').remove([`${trackId}/thumbnail.jpg`]);
      await supabase.storage.from('lyrics').remove([`${trackId}/lyrics.txt`]);
      await supabase.storage.from('tracks').remove([`${trackId}/${trackId}.aac`]);
    } catch (storageError) {
      console.warn('Failed to clean up storage:', storageError);
    }

    return { message: 'Track deleted successfully' };
  }


}
