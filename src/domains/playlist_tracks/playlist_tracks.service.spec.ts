import { Test, TestingModule } from '@nestjs/testing';
import { PlaylistTracksService } from './playlist_tracks.service';

describe('PlaylistTracksService', () => {
  let service: PlaylistTracksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlaylistTracksService],
    }).compile();

    service = module.get<PlaylistTracksService>(PlaylistTracksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
