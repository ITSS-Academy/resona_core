import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';
import { Track } from '../../track/entities/track.entity';

@Entity('queue')
export class Queue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile: Profile;

  @ManyToOne(() => Track, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trackId' })
  track: Track;

  @Column({ type: 'int' })
  position: number;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
