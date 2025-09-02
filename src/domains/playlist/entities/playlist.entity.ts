import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';
import { Track } from '../../track/entities/track.entity';
import { PlaylistTrack } from '../../playlist_tracks/entities/playlist_track.entity';

@Entity()
export class Playlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  title: string;

  @Column('text')
  thumbnailPath: string;

  @Column('text', { nullable: true })
  description: string;

  @ManyToOne(() => Profile, (profile) => profile.playlists)
  @JoinColumn()
  profile: Profile;

  @OneToMany(() => PlaylistTrack, (playlistTrack) => playlistTrack.playlist)
  playlistTracks: PlaylistTrack[];
}
