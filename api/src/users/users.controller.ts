import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { Can } from '@nestjs/authorization';
import {
  createUserSchema,
  listUsersQuerySchema,
  setUserPasswordSchema,
  updateUsernameSchema,
  updateUserRoleSchema,
} from '@terasandi/contracts';
import type {
  CreateUserDto,
  ListUsersQueryDto,
  SetUserPasswordDto,
  UpdateUsernameDto,
  UpdateUserRoleDto,
  UserPage,
} from '@terasandi/contracts';
import { z } from 'zod';
import type { User } from '../db/schema.js';
import { UserPolicy } from './user.policy.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Can.Anyone()
  me(@CurrentUser() user: User): User {
    return user;
  }

  /** Lists accounts, newest first, for the admin console. */
  @Get()
  @Can(UserPolicy, 'list')
  list(
    @Query({ schema: listUsersQuerySchema }) query: ListUsersQueryDto,
  ): Promise<UserPage<User>> {
    return this.usersService.list(query);
  }

  /** One account by id. Declared after `me` so `me` is not read as an id. */
  @Get(':id')
  @Can(UserPolicy, 'read')
  findOne(@Param('id', { schema: z.uuid() }) id: string): Promise<User> {
    return this.usersService.findOrFail(id);
  }

  /** Creates an account. New accounts start as `user`; admins can promote them. */
  @Post()
  @Can(UserPolicy, 'create')
  create(
    @CurrentUser() actor: User,
    @Body({ schema: createUserSchema }) body: CreateUserDto,
  ): Promise<User> {
    return this.usersService.createWithPassword(body, actor.id);
  }

  /** Renames an account. */
  @Patch(':id')
  @Can(UserPolicy, 'update')
  updateUsername(
    @CurrentUser() actor: User,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: updateUsernameSchema }) body: UpdateUsernameDto,
  ): Promise<User> {
    return this.usersService.updateUsername(id, body.username, actor.id);
  }

  /** Promotes or demotes an account. The last admin cannot be demoted. */
  @Patch(':id/role')
  @Can(UserPolicy, 'updateRole')
  updateRole(
    @CurrentUser() actor: User,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: updateUserRoleSchema }) body: UpdateUserRoleDto,
  ): Promise<User> {
    return this.usersService.updateRole(id, body.role, actor.id);
  }

  /** Sets a new password and signs the account out everywhere. */
  @Patch(':id/password')
  @HttpCode(204)
  @Can(UserPolicy, 'resetPassword')
  async resetPassword(
    @CurrentUser() actor: User,
    @Param('id', { schema: z.uuid() }) id: string,
    @Body({ schema: setUserPasswordSchema }) body: SetUserPasswordDto,
  ): Promise<void> {
    await this.usersService.resetPassword(id, body.password, actor.id);
  }

  /** Signs the account out of every device. */
  @Post(':id/sessions/revoke')
  @HttpCode(204)
  @Can(UserPolicy, 'revokeSessions')
  async revokeSessions(
    @CurrentUser() actor: User,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<void> {
    await this.usersService.revokeSessions(id, actor.id);
  }

  /** Deletes an account. The last admin and your own account are refused. */
  @Delete(':id')
  @HttpCode(204)
  @Can(UserPolicy, 'delete')
  async delete(
    @CurrentUser() actor: User,
    @Param('id', { schema: z.uuid() }) id: string,
  ): Promise<void> {
    await this.usersService.deleteUser(id, actor.id);
  }
}
