import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../auth/access-token.guard';
import { StoreOfferingsService } from './store-offerings.service';
type Request = {auth:{accountId:string}};

@Controller('store')
export class StoreOfferingsController {
 constructor(private readonly offers:StoreOfferingsService){}
 @Get('courses') courses(){return this.offers.publicCourses();}
 @UseGuards(AccessTokenGuard) @Post('courses/:id/enroll') enroll(@Req() req:Request,@Param('id') id:string){return this.offers.enroll(req.auth.accountId,id);}
 @UseGuards(AccessTokenGuard) @Get('provider/catalog') catalog(@Req() req:Request){return this.offers.catalog(req.auth.accountId);}
 @UseGuards(AccessTokenGuard) @Post('provider/products') createProduct(@Req() req:Request,@Body() body:Record<string,unknown>){return this.offers.saveProduct(req.auth.accountId,body);}
 @UseGuards(AccessTokenGuard) @Patch('provider/products/:id') updateProduct(@Req() req:Request,@Param('id') id:string,@Body() body:Record<string,unknown>){return this.offers.saveProduct(req.auth.accountId,body,id);}
 @UseGuards(AccessTokenGuard) @Post('provider/courses') createCourse(@Req() req:Request,@Body() body:Record<string,unknown>){return this.offers.saveCourse(req.auth.accountId,body);}
 @UseGuards(AccessTokenGuard) @Patch('provider/courses/:id') updateCourse(@Req() req:Request,@Param('id') id:string,@Body() body:Record<string,unknown>){return this.offers.saveCourse(req.auth.accountId,body,id);}
 @UseGuards(AccessTokenGuard) @Patch('provider/products/:id/status') productStatus(@Req() req:Request,@Param('id') id:string,@Body() body:Record<string,unknown>){return this.offers.changeStatus(req.auth.accountId,'products',id,body);}
 @UseGuards(AccessTokenGuard) @Patch('provider/courses/:id/status') courseStatus(@Req() req:Request,@Param('id') id:string,@Body() body:Record<string,unknown>){return this.offers.changeStatus(req.auth.accountId,'courses',id,body);}
 @UseGuards(AccessTokenGuard) @Delete('provider/products/:id') deleteProduct(@Req() req:Request,@Param('id') id:string,@Body() body:Record<string,unknown>){return this.offers.changeStatus(req.auth.accountId,'products',id,body,true);}
 @UseGuards(AccessTokenGuard) @Delete('provider/courses/:id') deleteCourse(@Req() req:Request,@Param('id') id:string,@Body() body:Record<string,unknown>){return this.offers.changeStatus(req.auth.accountId,'courses',id,body,true);}
}
