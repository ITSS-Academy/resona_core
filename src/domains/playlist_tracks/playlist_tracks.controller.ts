import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PlaylistTracksService } from './playlist_tracks.service';
import { CreatePlaylistTrackDto } from './dto/create-playlist_track.dto';
import { UpdatePlaylistTrackDto } from './dto/update-playlist_track.dto';

@Controller('playlist-tracks')
export class PlaylistTracksController {
  constructor(private readonly playlistTracksService: PlaylistTracksService) {}

  @Post()
  create(@Body() createPlaylistTrackDto: CreatePlaylistTrackDto) {
    return this.playlistTracksService.create(createPlaylistTrackDto);
  }

  @Get()
  findAll() {
    return this.playlistTracksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playlistTracksService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlaylistTrackDto: UpdatePlaylistTrackDto) {
    return this.playlistTracksService.update(+id, updatePlaylistTrackDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.playlistTracksService.remove(+id);
  }
}
