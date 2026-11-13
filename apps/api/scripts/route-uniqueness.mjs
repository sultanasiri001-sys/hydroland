import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const verbs=new Map(['Get','Post','Put','Patch','Delete','Head','Options','All'].map(x=>[x,x.toUpperCase()]));
const decorators=n=>ts.canHaveDecorators(n)?ts.getDecorators(n)||[]:[];
function literals(node,source){
 if(!node)return [''];
 if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return [node.text];
 if(ts.isArrayLiteralExpression(node)&&node.elements.length)return node.elements.flatMap(x=>literals(x,source));
 throw new Error(`Non-literal route requires review: ${source.fileName}:${source.getLineAndCharacterOfPosition(node.pos).line+1}`);
}
function canonical(prefix,suffix){
 const route=('/'+prefix+'/'+suffix).replace(/\/+/g,'/').replace(/\/$/,'')||'/';
 if(/[?#]/.test(route))throw new Error('Unsupported route syntax requires review');
 return route.replace(/:[A-Za-z_][A-Za-z0-9_]*/g,':param').toLowerCase();
}
export function sourceRoutes(text,filename='fixture.ts'){
 const source=ts.createSourceFile(filename,text,ts.ScriptTarget.Latest,true),imports=new Map(),namespaces=new Set(),routes=[];
 for(const node of source.statements){
  if(!ts.isImportDeclaration(node)||!ts.isStringLiteral(node.moduleSpecifier)||node.moduleSpecifier.text!=='@nestjs/common')continue;
  const bindings=node.importClause?.namedBindings;
  if(bindings&&ts.isNamedImports(bindings))for(const item of bindings.elements)imports.set(item.name.text,item.propertyName?.text||item.name.text);
  if(bindings&&ts.isNamespaceImport(bindings))namespaces.add(bindings.name.text);
 }
 const calls=node=>decorators(node).flatMap(d=>{
  const call=d.expression;if(!ts.isCallExpression(call))return [];
  const expr=call.expression;
  const name=ts.isIdentifier(expr)?imports.get(expr.text):ts.isPropertyAccessExpression(expr)&&ts.isIdentifier(expr.expression)&&namespaces.has(expr.expression.text)?expr.name.text:undefined;
  return name?[{name,args:call.arguments}]:[];
 });
 for(const node of source.statements){
  if(!ts.isClassDeclaration(node))continue;
  const controller=calls(node).find(x=>x.name==='Controller');if(!controller)continue;
  if(node.heritageClauses?.length)throw new Error('Inherited controller requires separate route review');
  let controllerPath=controller.args[0];
  if(controllerPath&&ts.isObjectLiteralExpression(controllerPath)){
   if(controllerPath.properties.some(p=>p.name?.getText(source).replace(/['"]/g,'')==='version'))throw new Error('Versioned controller requires separate route review');
   controllerPath=controllerPath.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(source).replace(/['"]/g,'')==='path')?.initializer;
  }
  const prefixes=literals(controllerPath,source);
  for(const member of node.members){
   const mapped=calls(member);
   if(mapped.some(x=>['Version','RequestMapping'].includes(x.name)))throw new Error('Versioned/custom mapping requires separate route review');
   for(const route of mapped.filter(x=>verbs.has(x.name))){
    if(!ts.isMethodDeclaration(member))throw new Error('Non-method route requires separate route review');
    for(const prefix of prefixes)for(const suffix of literals(route.args[0],source))routes.push({method:verbs.get(route.name),path:canonical(prefix,suffix),file:filename,handler:`${node.name?.text||'anonymous'}.${member.name.getText(source)}`});
   }
  }
 }
 return routes;
}
export function conflictingRoutes(routes){
 const byPath=new Map(),conflicts=[];
 for(const route of routes){const previous=byPath.get(route.path)||[];for(const other of previous)if(other.method===route.method||other.method==='ALL'||route.method==='ALL')conflicts.push([other,route]);previous.push(route);byPath.set(route.path,previous);}
 return conflicts;
}
export async function scanRoutes(directory){
 const routes=[],files=[];
 async function visit(dir){for(const entry of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const name=path.join(dir,entry.name);if(entry.isDirectory())await visit(name);else if(entry.isFile()&&entry.name.endsWith('.ts')&&!entry.name.endsWith('.d.ts'))files.push(name);}}
 await visit(directory);for(const filename of files)routes.push(...sourceRoutes(await fs.readFile(filename,'utf8'),path.relative(directory,filename)));
 return {routes,conflicts:conflictingRoutes(routes),files:files.length};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await scanRoutes(fileURLToPath(new URL('../src',import.meta.url)));
 if(!result.routes.length)throw new Error('No controller routes found');
 console.log(JSON.stringify({files:result.files,literalRoutes:result.routes.length,conflicts:result.conflicts.slice(0,20),conflictCount:result.conflicts.length,scope:'literal controller method signatures; not runtime precedence or full A10 acceptance'}));
 process.exitCode=result.conflicts.length?1:0;
}
