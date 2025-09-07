import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdateTitleDto } from './dto/update-playlist.dto';
import { supabase } from '../../utils/supbabase';
import { Playlist } from './entities/playlist.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PlaylistService {
  constructor(
    @InjectRepository(Playlist)
    private playlistRepository: Repository<Playlist>,
  ) {}

  async createPlaylist(
    createPlaylistDto: CreatePlaylistDto,
    userId: string,
    thumbnail?: Express.Multer.File,
  ) {
    let thumbnailPath: string | null =
      'https://cajbdmrbdoctltruejun.supabase.co/storage/v1/object/public/thumbnail/492a1aa6-ab7f-4cc6-befc-c8a809db7f3b/thumbnail.jpg';

    // 1. Tạo playlist (thumbnail mặc định)
    const { data: createdData, error: createError } = await supabase
      .from('playlist')
      .insert({
        title: createPlaylistDto.title,
        thumbnailPath: thumbnailPath,
        profileId: userId,
        description: createPlaylistDto.description,
      })
      .select()
      .single();

    if (createError) {
      console.error('Insert error:', createError);
      throw new BadRequestException('Failed to create playlist');
    }

    const playlistId = createdData.id;

    // 2. Nếu có file thì upload vào bucket
    if (thumbnail) {
      const fileName = 'playlist-thumbnail.jpg';
      const filePath = `${playlistId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('playlist-thumbnail')
        .upload(filePath, thumbnail.buffer, {
          contentType: thumbnail.mimetype,
          upsert: true,
        });

      if (uploadError) {
        throw new BadRequestException(uploadError.message);
      }

      const { data: publicUrlData } = supabase.storage
        .from('playlist-thumbnail')
        .getPublicUrl(filePath);

      thumbnailPath = publicUrlData.publicUrl;

      // Cập nhật playlist với thumbnail mới
      const { error: updateError } = await supabase
        .from('playlist')
        .update({ thumbnailPath })
        .eq('id', playlistId);

      if (updateError) {
        throw new BadRequestException(
          'Failed to update playlist with thumbnail',
        );
      }
    }

    // 3. Lấy playlist cuối cùng
    const { data: finalData, error: finalError } = await supabase
      .from('playlist')
      .select()
      .eq('id', playlistId)
      .single();

    if (finalError) {
      throw new BadRequestException('Failed to fetch playlist');
    }

    return finalData;
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

  async updatePlaylist(
    playlistId: string,
    updateDto: UpdateTitleDto, // chứa title optional
    file?: Express.Multer.File,
  ) {
    const bucket = 'thumbnail';
    const folder = `${playlistId}`;

    let thumbnailUrl: string | undefined;

    // Nếu có file thumbnail mới
    if (file) {
      // 1. List files trong folder
      const { data: listData, error: listError } = await supabase.storage
        .from(bucket)
        .list(folder);

      if (listError) {
        throw new BadRequestException('Failed to list thumbnails');
      }

      // 2. Xóa file cũ
      if (listData && listData.length > 0) {
        const filesToDelete = listData.map((f) => `${folder}/${f.name}`);
        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove(filesToDelete);
        if (deleteError) {
          throw new BadRequestException('Failed to delete old thumbnail');
        }
      }

      // 3. Upload file mới
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

      // 4. Lấy public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      thumbnailUrl = publicUrlData.publicUrl;
    }

    // Gom fields cần update
    const updateFields: any = {};
    if (updateDto.title) updateFields.title = updateDto.title;
    if (thumbnailUrl) updateFields.thumbnailPath = thumbnailUrl;

    if (Object.keys(updateFields).length === 0) {
      throw new BadRequestException('Nothing to update');
    }

    // Update playlist
    const { data, error } = await supabase
      .from('playlist')
      .update(updateFields)
      .eq('id', playlistId)
      .select();

    if (error) {
      throw new BadRequestException('Failed to update playlist');
    }

    return data[0];
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

      if (error)
        throw new BadRequestException('Cannot create favorite playlist');

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
