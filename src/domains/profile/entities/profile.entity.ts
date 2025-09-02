import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany, PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Playlist } from '../../playlist/entities/playlist.entity';
import { Track } from '../../track/entities/track.entity';
import { Comment } from '../../comment/entities/comment.entity';

@Entity()
export class Profile {
  @PrimaryColumn('text')
  id: string;

  @Column('text')
  name: string;

  @Column('text')
  photoUrl: string;

  @Column('text')
  email: string;

  @Column('timestamp', { default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @OneToMany(() => Track, (track) => track.owner, {
    onDelete: 'CASCADE',
  })
  tracks: Track[];

  @OneToMany(() => Playlist, (playlist) => playlist.playlistTracks)
  playlists: Playlist[];

  @OneToMany(() => Comment, (comment) => comment.profile)
  comments: Comment[];

  @ManyToMany(() => Profile, (profile) => profile.following, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  @JoinTable({
    name: 'profile_followers',
    joinColumn: { name: 'followerId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'followingId', referencedColumnName: 'id' },
  })
  followers: Profile[]; // người theo dõi

  @ManyToMany(() => Profile, (profile) => profile.followers)
  following: Profile[]; // người đang theo dõi
}
