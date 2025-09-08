import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';
import { Track } from '../../track/entities/track.entity';

@Entity('history')
export class History {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile: Profile;

  @ManyToOne(() => Track, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trackId' })
  track: Track;

  @CreateDateColumn({ name: 'playedAt' })
  playedAt: Date;
}