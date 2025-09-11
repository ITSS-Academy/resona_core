import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { supabase } from '../../utils/supbabase';
import { InjectRepository } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {
  }

  create(createProfileDto: CreateProfileDto) {
    return 'This action adds a new profile';
  }

  findAll() {
    return `This action returns all profile`;
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} profile`;
  // }

  update(id: number, updateProfileDto: UpdateProfileDto) {
    return `This action updates a #${id} profile`;
  }

  remove(id: number) {
    return `This action removes a #${id} profile`;
  }

  async search(query: string) {
    const {data, error} = await supabase.from('profile').select('*').ilike('name', `%${query}%`);
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async followProfile(followerId: string, followingId: string) {
    const {data, error} = await supabase.from('profile_followers').insert({followerId, followingId}).select();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async getFollowers(profileId: string) {
    // 1. Lấy danh sách followerId
    const { data: followers, error } = await supabase
      .from('profile_followers')
      .select('followingId')
      .eq('followerId', profileId); // profileId = người được follow

    if (error) throw new Error(error.message);

    if (!followers?.length) return [];

    // 2. Lấy thông tin profile của các follower
    const ids = followers.map(f => f.followingId);

    const { data: profiles, error: profileError } = await supabase
      .from('profile')
      .select('*')
      .in('id', ids);

    if (profileError) throw new Error(profileError.message);

    return profiles;
  }


  async getProfileById(profileId: string) {
    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .eq('id', profileId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async getPopularProfiles(limit = 10): Promise<(Profile & { followerCount: number })[]> {
    const { entities, raw } = await this.profileRepository
      .createQueryBuilder('profile')
      .leftJoin('profile.followers', 'f')
      .addSelect('COUNT(f.id)', '"followerCount"') // alias giữ nguyên chữ hoa
      .groupBy('profile.id')
      .orderBy('"followerCount"', 'DESC')
      .limit(limit)
      .getRawAndEntities();

    return entities.map((profile, i) => ({
      ...profile,
      followerCount: Number(raw[i].followerCount ?? 0),
    }));
  }

  async getProfileByTrackId(trackId: string) {
    // 1. Get the track to find ownerId
    const { data: track, error: trackError } = await supabase
      .from('track')
      .select('ownerId')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      throw new Error('Track not found');
    }

    // 2. Get the profile by ownerId
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('*')
      .eq('id', track.ownerId)
      .single();

    if (profileError || !profile) {
      throw new Error('Profile not found');
    }

    return profile as Profile;
  }

}
