import assert from 'node:assert/strict';
import test from 'node:test';
import {sourceRoutes,conflictingRoutes} from './route-uniqueness.mjs';
const source=body=>`import {Controller,Get,Post,All} from '@nestjs/common'; ${body}`;
test('duplicate signatures cannot hide behind parameter names or case',()=>{
 const routes=sourceRoutes(source(`@Controller('Things') class A {@Get(':id') a(){}} @Controller('/things/') class B {@Get(':name/') b(){}}`));
 assert.equal(routes.length,2);assert.equal(conflictingRoutes(routes).length,1);
});
test('separate methods and static paths remain distinct',()=>{
 const routes=sourceRoutes(source(`@Controller('things') class A {@Get(':id') a(){} @Post(':id') b(){} @Get('mine') c(){}}`));
 assert.equal(routes.length,3);assert.equal(conflictingRoutes(routes).length,0);
});
test('route arrays and aliased Nest imports remain visible',()=>{
 const routes=sourceRoutes(`import {Controller as C,Get as Read} from '@nestjs/common'; @C(['a','b']) class A {@Read(['x','y']) a(){}}`);
 assert.deepEqual(routes.map(x=>x.path),['/a/x','/a/y','/b/x','/b/y']);
});
test('namespace imports and controller option paths remain visible',()=>{
 const routes=sourceRoutes(`import * as N from '@nestjs/common'; @N.Controller({path:'a'}) class A {@N.Get() a(){}}`);
 assert.equal(routes[0].path,'/a');assert.equal(routes[0].method,'GET');
});
test('ALL overlaps each explicit method on the same path',()=>{
 const routes=sourceRoutes(source(`@Controller('things') class A {@All() a(){} @Get() b(){} @Post() c(){}}`));assert.equal(conflictingRoutes(routes).length,2);
});
test('dynamic paths and versioned/custom/inherited mappings require explicit review',()=>{
 for(const code of [source(`@Controller(prefix) class A {@Get() a(){}}`),source(`@Controller('a') class A {@Get(route) a(){}}`),`import {Controller,Get,Version} from '@nestjs/common'; @Controller('a') class A {@Version('2') @Get() a(){}}`,source(`@Controller('a') class A extends Base {@Get() a(){}}`)])assert.throws(()=>sourceRoutes(code),/requires? (?:separate route )?review/);
});
test('unrelated decorator names and classes without Controller create no routes',()=>{
 assert.equal(sourceRoutes(`import {Get} from '@nestjs/common'; class A {@Get('a') a(){}}`).length,0);
 assert.equal(sourceRoutes(`import {Controller,Get} from './unrelated'; @Controller('a') class A {@Get() a(){}}`).length,0);
});
