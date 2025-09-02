import { Column, Entity, ManyToMany, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Track } from '../../track/entities/track.entity';

@Entity()
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  name: string;

  @Column('text', { nullable: true })
  color: string;

  @Column('text', { nullable: true })
  image: string;

  @OneToMany(() => Track, (track) => track.category, {
    onDelete: 'CASCADE',
  })
  tracks: Track[];
}
