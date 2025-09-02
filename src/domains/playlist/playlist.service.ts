import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdateTitleDto } from './dto/update-playlist.dto';
import { supabase } from '../../utils/supbabase';
import { Playlist } from './entities/playlist.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Comment } from '../comment/entities/comment.entity';

@Injectable()
export class PlaylistService {
  constructor(
    @InjectRepository(Playlist)
    private playlistRepository: Repository<Playlist>,
  ) {
  }

  async createPlaylist(createPlaylistDto: CreatePlaylistDto, userId: string) {
    const { data, error } = await supabase
      .from('playlist')
      .insert({
        title: createPlaylistDto.title,
        description: createPlaylistDto.description,
        thumbnailPath:
          'https://cajbdmrbdoctltruejun.supabase.co/storage/v1/object/public/thumbnail/492a1aa6-ab7f-4cc6-befc-c8a809db7f3b/thumbnail.jpg',
        profileId: userId,
      })
      .select();

    if (error) {
      console.log(error);
      throw new BadRequestException('Failed to create playlist');
    }

    return data[0];
  }

  async addTrackToPlaylist(playlistId: string, trackId: string) {
    const { data, error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlistId: playlistId,
        trackId: trackId,
      })
      .select();

    if (error) {
      throw new BadRequestException(error);
    }

    return data[0];
  }

  async deletePlaylist(id: string) {
    const { error } = await supabase
      .from('playlist')
      .delete()
      .eq('id', id)
      .select();
    if (error) {
      throw new BadRequestException('Failed to delete playlist');
    }
    return { message: 'Playlist deleted successfully' };
  }

  async removeTrackFromPlaylist(playlistId: string, trackId: string) {
    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlistId', playlistId)
      .eq('trackId', trackId);

    if (error) {
      throw new BadRequestException(error);
    }

    return { message: 'Track removed from playlist successfully' };
  }

  async updatePlaylistTitle(updateTitleDto: UpdateTitleDto) {
    const { data, error } = await supabase
      .from('playlist')
      .update({ title: updateTitleDto.title })
      .eq('id', updateTitleDto.playlistId)
      .select();

    if (error) {
      throw new BadRequestException(error);
    }

    return data[0];
  }

  async updatePlaylistThumbnailWithFile(
    playlistId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const bucket = 'thumbnail';
    const folder = `${playlistId}`;
    // 1. List files in the folder
    const { data: listData, error: listError } = await supabase.storage
      .from(bucket)
      .list(folder);
    if (listError) {
      throw new BadRequestException('Failed to list thumbnails');
    }
    // 2. Delete old thumbnail if exists
    if (listData && listData.length > 0) {
      const filesToDelete = listData.map((f) => `${folder}/${f.name}`);
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove(filesToDelete);
      if (deleteError) {
        throw new BadRequestException('Failed to delete old thumbnail');
      }
    }
    // 3. Upload new file
    const ext = file.originalname.split('.').pop();
    const filename = `thumbnail.${ext}`;
    const path = `${folder}/${filename}`;
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });
    if (uploadError) {
      throw new BadRequestException('Failed to upload new thumbnail');
    }
    // 4. Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    const publicUrl = publicUrlData.publicUrl;
    // 5. Update DB
    const { data: updateData, error: updateError } = await supabase
      .from('playlist')
      .update({ thumbnailPath: publicUrl })
      .eq('id', playlistId)
      .select();
    if (updateError) {
      throw new BadRequestException('Failed to update playlist thumbnail');
    }
    return updateData[0];
  }

  async getPlaylistTracksWithDetails(playlistId: string) {
    // 1. Get playlist info
    const { data: playlistData, error: playlistError } = await supabase
      .from('playlist')
      .select('*')
      .eq('id', playlistId)
      .single();
    if (playlistError || !playlistData) {
      throw new BadRequestException('Playlist not found');
    }
    // 2. Get all playlist_tracks for this playlist
    const { data: playlistTracks, error: playlistTracksError } = await supabase
      .from('playlist_tracks')
      .select('trackId')
      .eq('playlistId', playlistId);
    if (playlistTracksError) {
      throw new BadRequestException('Failed to get playlist tracks');
    }
    const trackIds = playlistTracks.map((pt) => pt.trackId);
    if (trackIds.length === 0) {
      return { ...playlistData, tracks: [] };
    }
    // 3. Get all tracks with full details
    const { data: tracks, error: tracksError } = await supabase
      .from('track')
      .select('*')
      .in('id', trackIds);
    if (tracksError) {
      throw new BadRequestException('Failed to get tracks');
    }
    return { ...playlistData, tracks };
  }

  async getAllPlaylistsByUser(uid: string) {
    const { data, error } = await supabase
      .from('playlist')
      .select('*')
      .eq('profileId', uid);
    if (error) {
      throw new BadRequestException('Failed to get playlists by user');
    }
    return data;
  }

  async addToFavorite(trackId: string, userId: string) {
    // 1. Tìm playlist Favorite
    const { data: playlist } = await supabase
      .from('playlist')
      .select('*')
      .eq('title', 'Favorite')
      .eq('profileId', userId)
      .single();

    let playlistId = playlist?.id;

    // 2. Nếu chưa có thì tạo mới
    if (!playlistId) {
      const { data: newPlaylist, error } = await supabase
        .from('playlist')
        .insert({
          title: 'Favorite',
          profileId: userId,
          thumbnailPath: 'assets/images/favorite.png',
        })
        .select()
        .single();

      if (error) throw new BadRequestException('Cannot create favorite playlist');

      playlistId = newPlaylist.id;
    }

    // 3. Thêm bài hát vào playlist_song
    const { error: insertError } = await supabase
      .from('playlist_tracks')
      .insert({
        playlistId,
        trackId,
      });

    if (insertError) {
      throw new BadRequestException('Cannot add song to favorite');
    }

    return { message: 'Song added to Favorite' };
  }

  async getFavoritePlaylistByUserId(userId: string) {
    // 1. Tìm playlist Favorite
    const { data: playlist, error } = await supabase
      .from('playlist')
      .select('*')
      .eq('title', 'Favorite')
      .eq('profileId', userId)
      .single();

    if (error) {
      throw new BadRequestException('Failed to get favorite playlist');
    }

    return playlist;
  }

  async getRandomPlaylists(limit: number): Promise<Playlist[]> {
    const qb = this.playlistRepository.createQueryBuilder('playlist')
      .leftJoinAndSelect('playlist.tracks', 'track')
      .orderBy('RANDOM()') // PostgreSQL random
      .take(limit);

    return qb.getMany();
  }

  async searchPlaylists(query: string) {
    const { data, error } = await supabase
      .from('playlist')
      .select('*')
      .ilike('title', `%${query}%`);
    if (error) {
      throw new BadRequestException('Failed to search playlists');
    }
    return data;
  }
}
