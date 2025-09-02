import { Injectable } from '@nestjs/common';
import { CreatePlaylistTrackDto } from './dto/create-playlist_track.dto';
import { UpdatePlaylistTrackDto } from './dto/update-playlist_track.dto';

@Injectable()
export class PlaylistTracksService {
  create(createPlaylistTrackDto: CreatePlaylistTrackDto) {
    return 'This action adds a new playlistTrack';
  }

  findAll() {
    return `This action returns all playlistTracks`;
  }

  findOne(id: number) {
    return `This action returns a #${id} playlistTrack`;
  }

  update(id: number, updatePlaylistTrackDto: UpdatePlaylistTrackDto) {
    return `This action updates a #${id} playlistTrack`;
  }

  remove(id: number) {
    return `This action removes a #${id} playlistTrack`;
  }
}
