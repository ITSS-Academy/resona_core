import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistTracksController } from './playlist_tracks.controller';
import { PlaylistTracksService } from './playlist_tracks.service';

describe('PlaylistTracksController', () => {
  let controller: PlaylistTracksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlaylistTracksController],
      providers: [PlaylistTracksService],
    }).compile();

    controller = module.get<PlaylistTracksController>(PlaylistTracksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
