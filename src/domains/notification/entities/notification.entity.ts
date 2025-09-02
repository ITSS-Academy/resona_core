import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Profile } from '../../profile/entities/profile.entity';
import { Track } from '../../track/entities/track.entity';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Profile, { onDelete: 'CASCADE' })
  recipient: Profile;

  @ManyToOne(() => Track, { nullable: true, onDelete: 'CASCADE' })
  track: Track;
}
