import { Body, Controller, Delete, Get, Header, Module, Param, Put, Req, Res, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { AuthModule } from '../auth/auth.module';
import { ServiceImagesService } from './service-images.service';
@Controller('service-images')
export class ServiceImagesController {
 constructor(private readonly images:ServiceImagesService){}
 @Get(':kind/:id/content') async content(@Param('kind') kind:string,@Param('id') id:string,@Res() res:any){
  const bytes=await this.images.publicImage(kind,id);
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  if(!bytes)return res.status(204).end();return res.type('image/webp').send(bytes);
 }
 @Header('Cache-Control','no-store') @UseGuards(AccessTokenGuard) @Get(':kind/:id') get(@Req() req:{auth:{accountId:string}},@Param('kind') kind:string,@Param('id') id:string){return this.images.get(req.auth.accountId,kind,id);}
 @Header('Cache-Control','no-store') @UseGuards(AccessTokenGuard) @Put(':kind/:id') put(@Req() req:{auth:{accountId:string}},@Param('kind') kind:string,@Param('id') id:string,@Body() body:Record<string,unknown>){return this.images.save(req.auth.accountId,kind,id,body);}
 @Header('Cache-Control','no-store') @UseGuards(AccessTokenGuard) @Delete(':kind/:id') remove(@Req() req:{auth:{accountId:string}},@Param('kind') kind:string,@Param('id') id:string,@Body() body:Record<string,unknown>){return this.images.save(req.auth.accountId,kind,id,body,true);}
}
@Module({imports:[AuthModule],controllers:[ServiceImagesController],providers:[ServiceImagesService]})
export class ServiceImagesModule {}
