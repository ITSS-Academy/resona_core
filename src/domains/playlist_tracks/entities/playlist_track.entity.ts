import { Entity, ManyToOne, PrimaryColumn, Column, JoinColumn } from 'typeorm';
import { Playlist } from '../../playlist/entities/playlist.entity';
import { Track } from '../../track/entities/track.entity';

@Entity('playlist_tracks')
export class PlaylistTrack {
  @PrimaryColumn('uuid')
  playlistId: string;

  @PrimaryColumn('uuid')
  trackId: string;

  @ManyToOne(() => Playlist, (playlist) => playlist.playlistTracks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'playlistId' })
  playlist: Playlist;

  @ManyToOne(() => Track, (track) => track.playlistTracks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'trackId' })
  track: Track;

  // @Column({ type: 'int', nullable: true })
  // order: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createAt: Date;
}
