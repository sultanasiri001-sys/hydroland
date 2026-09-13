import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { MeController } from './me.controller';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [MeController, ProfileController],
  providers: [ProfileService, AccessTokenGuard],
  exports: [ProfileService],
})
export class ProfileModule {}
