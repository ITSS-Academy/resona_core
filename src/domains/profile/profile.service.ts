import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { supabase } from '../../utils/supbabase';

@Injectable()
export class ProfileService {
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

  async search(username: string) {
    const {data, error} = await supabase.from('profile').select().ilike('username', `%${username}%`);
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async followProfile(followerId: string, followingId: string) {
    const {data, error} = await supabase.from('follows').insert({followerId, followingId}).select();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async getFollowers(profileId: string) {
    const {data, error} = await supabase.from('follows').select('followerId').eq('followingId', profileId);
    if (error) {
      throw new Error(error.message);
    }
    return data;
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
}
