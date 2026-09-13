import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [ProfileController],
  providers: [ProfileService, AccessTokenGuard],
  exports: [ProfileService],
})
export class ProfileModule {}
