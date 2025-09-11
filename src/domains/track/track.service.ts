import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from './entities/track.entity';
import {
  convertAacToM4a,
  convertAudioToAac,
  convertAudioToM4a,
  getAACAudioDuration,
} from '../../utils/hls-converter';
import { supabase } from '../../utils/supbabase';
import * as fs from 'fs';
import * as path from 'path';

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
    const out = await convertAudioToM4a(inputPath, {
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

  async getTracksBySameArtist(trackId: string): Promise<Track[]> {
    // Get the track to retrieve artistName
    const { data: track, error } = await supabase
      .from('track')
      .select('artistName')
      .eq('id', trackId)
      .single();

    if (error || !track) {
      throw new BadRequestException('Track not found');
    }

    // Find all tracks with the same artistName
    const { data: tracks, error: tracksError } = await supabase
      .from('track')
      .select('*')
      .eq('artistName', track.artistName);

    if (tracksError) {
      throw new BadRequestException(tracksError);
    }

    return tracks;
  }

  async getNewReleasedTracks() {
    return supabase
      .from('track')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          throw new BadRequestException(error);
        }
        return data;
      });
  }

  async getPopularTracks() {
    return supabase
      .from('track')
      .select('*')
      .order('viewCount', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) {
          throw new BadRequestException(error);
        }
        return data;
      });
  }

  async resetAllDuration() {
    // Get all tracks from supabase
    const { data: tracks, error: tracksError } = await supabase
      .from('track')
      .select('id');
    if (tracksError) {
      throw new BadRequestException(tracksError);
    }

    for (const track of tracks ?? []) {
      try {
        // Download AAC file from Supabase storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('tracks')
          .download(`${track.id}/${track.id}.aac`);
        if (downloadError || !fileData) {
          console.warn(`Cannot download AAC for track ${track.id}`);
          continue;
        }
        // Save to temp file
        const tempDir = path.join(__dirname, '../../tmp_aac');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempFile = path.join(tempDir, `${track.id}.aac`);
        const buffer = await fileData.arrayBuffer();
        fs.writeFileSync(tempFile, Buffer.from(buffer));

        // Get duration using spawn/ffprobe
        const duration = await getAACAudioDuration(tempFile);

        // Update duration in Supabase
        await supabase
          .from('track')
          .update({ duration })
          .eq('id', track.id);

        // Clean up temp file
        fs.unlinkSync(tempFile);
      } catch (err) {
        console.warn(`Failed to process track ${track.id}:`, err);
      }
    }
    return tracks;
  }

   async  resetAllDurationAndMigrateToM4A() {
    // 1) Lấy danh sách track
    const { data: tracks, error: tracksError } = await supabase
      .from('track')
      .select('id');
    if (tracksError) throw new BadRequestException(tracksError);

    // Thư mục tạm cho .aac tải về
    const tmpAacDir = path.join(__dirname, '../../tmp_aac');
    if (!fs.existsSync(tmpAacDir)) fs.mkdirSync(tmpAacDir, { recursive: true });

    // Thư mục m4a tạm theo yêu cầu
    const localM4aDir = path.join(process.cwd(), 'public/assets/tracks');
    if (!fs.existsSync(localM4aDir)) fs.mkdirSync(localM4aDir, { recursive: true });

    for (const track of tracks ?? []) {
      const aacStoragePath = `${track.id}/${track.id}.aac`;
      const m4aStoragePath = `${track.id}/${track.id}.m4a`;
      const localAacFile = path.join(tmpAacDir, `${track.id}.aac`);
      const localM4aFile = path.join(localM4aDir, `${track.id}.m4a`);

      try {
        // 2) Tải .aac từ Supabase storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('tracks')
          .download(aacStoragePath);

        if (downloadError || !fileData) {
          console.warn(`Cannot download AAC for track ${track.id}:`, downloadError?.message);
          continue;
        }

        // 3) Lưu .aac tạm
        const buf = Buffer.from(await fileData.arrayBuffer());
        fs.writeFileSync(localAacFile, buf);

        // 4) Convert sang .m4a (remux)
        await convertAacToM4a(localAacFile, localM4aFile, true);

        // 6) Upload .m4a lên Supabase storage (ghi đè nếu tồn tại)
        const m4aBuffer = fs.readFileSync(localM4aFile);
        const { error: uploadError } = await supabase.storage
          .from('tracks')
          .upload(m4aStoragePath, m4aBuffer, {
            contentType: 'audio/mp4', // quan trọng để browser hiểu đúng MIME
            upsert: true,             // cho phép ghi đè
          });

        if (uploadError) {
          throw new Error(`Upload m4a failed: ${uploadError.message}`);
        }

        // 7) Xóa .aac cũ trên storage
        const { error: removeError } = await supabase.storage
          .from('tracks')
          .remove([aacStoragePath]);
        if (removeError) {
          // không fatal — log cảnh báo rồi tiếp tục
          console.warn(`Remove AAC failed for track ${track.id}:`, removeError.message);
        }

        // 8) Lấy public URL (nếu bucket public). Nếu bạn lưu relative path, thay thế phần này.
        const { data: publicUrlData } = supabase.storage
          .from('tracks')
          .getPublicUrl(m4aStoragePath);
        const filePath = publicUrlData?.publicUrl || m4aStoragePath;

        // 9) Cập nhật DB: filePath (+ duration)
        const { error: updateErr } = await supabase
          .from('track')
          .update({ filePath })
          .eq('id', track.id);

        if (updateErr) {
          throw new Error(`DB update failed for ${track.id}: ${updateErr.message}`);
        }

        // 10) Dọn dẹp local
        if (fs.existsSync(localAacFile)) fs.unlinkSync(localAacFile);
        // Nếu muốn giữ file m4a tạm để phục vụ tĩnh từ public/, thì KHÔNG xóa:
        // Nếu không cần giữ local m4a (chỉ là tạm), có thể xoá:
        // if (fs.existsSync(localM4aFile)) fs.unlinkSync(localM4aFile);

        console.log(`✅ Migrated track ${track.id} → m4a, updated filePath & duration`);
      } catch (err) {
        console.warn(`Failed to process track ${track.id}:`, err);
        // Thử dọn dẹp file tạm nếu có
        try { if (fs.existsSync(localAacFile)) fs.unlinkSync(localAacFile); } catch {}
        // Giữ localM4aFile nếu bạn muốn phục vụ tĩnh — nếu không, có thể xoá
        // try { if (fs.existsSync(localM4aFile)) fs.unlinkSync(localM4aFile); } catch {}
      }
    }

    return { count: tracks?.length ?? 0 };
  }
}
