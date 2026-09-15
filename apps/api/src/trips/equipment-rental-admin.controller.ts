import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin/admin.guard';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { EquipmentRentalAdminService } from './equipment-rental-admin.service';

@UseGuards(AccessTokenGuard,AdminGuard)
@Controller('trips/admin/equipment-rentals')
export class EquipmentRentalAdminController{
  constructor(private readonly rentals:EquipmentRentalAdminService){}
  @Get()
  list(){return this.rentals.list();}
}
