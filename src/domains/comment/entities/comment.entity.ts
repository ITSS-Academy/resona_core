import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Track } from '../../track/entities/track.entity';
import { Profile } from '../../profile/entities/profile.entity';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @ManyToOne(() => Track, (track) => track.comments, { onDelete: 'CASCADE' })
  track: Track;

  @ManyToOne(() => Profile, (profile) => profile.comments, { onDelete: 'CASCADE' })
  profile: Profile;

  @CreateDateColumn()
  createdAt: Date;
}
