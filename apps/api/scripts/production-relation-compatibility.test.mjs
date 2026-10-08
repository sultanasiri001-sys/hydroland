import test from 'node:test';
import assert from 'node:assert/strict';
import {compareProductionRelations} from './production-relation-compatibility.mjs';
const fixture={constraints:[{table_name:'Shift',name:'center_fkey',kind:'f',validated:true,definition:'FOREIGN KEY (center) REFERENCES Organization(id)'}],indexes:[{table_name:'Shift',name:'center_idx',definition:'CREATE INDEX center_idx ON Shift (center)'}]};
test('matching constraints/indexes never approve production',()=>{const result=compareProductionRelations(fixture,structuredClone(fixture));assert.equal(result.metadataMatches,true);assert.equal(result.productionAdoptionApproved,false);});
test('different parent relationship and unvalidated foreign key are detected',()=>{const candidate=structuredClone(fixture);candidate.constraints[0].definition='FOREIGN KEY (center) REFERENCES OrgUnit(id)';candidate.constraints[0].validated=false;const result=compareProductionRelations(fixture,candidate);assert.deepEqual(result.constraints.changed[0].attributes,['definition','validated']);assert.equal(result.metadataMatches,false);});
test('renamed index remains missing/extra despite equal totals',()=>{const candidate=structuredClone(fixture);candidate.indexes[0].name='other_idx';const result=compareProductionRelations(fixture,candidate);assert.equal(result.indexes.missing.length,1);assert.equal(result.indexes.extra.length,1);});
test('duplicate constraint metadata is rejected',()=>{const candidate=structuredClone(fixture);candidate.constraints.push(candidate.constraints[0]);assert.throws(()=>compareProductionRelations(fixture,candidate),/Duplicate constraints/);});
test('exact renamed index shape is reported without suppressing the diff',()=>{
 const reference={constraints:[],indexes:[{table_name:'Shift',name:'old_idx',definition:'CREATE INDEX old_idx ON public.Shift USING btree (account, status)'}]};
 const candidate={constraints:[],indexes:[{table_name:'Shift',name:'new_idx',definition:'CREATE INDEX new_idx ON public.Shift USING btree (account, status)'}]};
 const result=compareProductionRelations(reference,candidate);
 assert.equal(result.review.renamedIndexes.length,1);assert.equal(result.counts.indexes.missing,1);assert.equal(result.metadataMatches,false);
 for(const definition of ['CREATE UNIQUE INDEX new_idx ON public.Shift USING btree (account, status)','CREATE INDEX new_idx ON public.Shift USING btree (status, account)','CREATE INDEX new_idx ON public.Shift USING btree (account, status DESC)','CREATE INDEX new_idx ON public.Shift USING btree (account, status) WHERE account IS NOT NULL']){
  candidate.indexes[0].definition=definition;assert.equal(compareProductionRelations(reference,candidate).review.renamedIndexes.length,0);
 }
});
test('implicit NO ACTION and CASCADE are substantive update behavior differences',()=>{
 const candidate=structuredClone(fixture);candidate.constraints[0].definition=fixture.constraints[0].definition+' ON UPDATE CASCADE';
 const result=compareProductionRelations(fixture,candidate);assert.equal(result.review.updateActionDifferences.length,1);assert.equal(result.review.updateActionDifferences[0].behaviorMatches,false);assert.equal(result.review.productionAdoptionApproved,false);
 candidate.constraints[0].definition='FOREIGN KEY (center) REFERENCES OrgUnit(id) ON UPDATE CASCADE';assert.equal(compareProductionRelations(fixture,candidate).review.updateActionDifferences.length,0);
 candidate.constraints[0].definition=fixture.constraints[0].definition+' ON UPDATE CASCADE';candidate.constraints[0].validated=false;assert.equal(compareProductionRelations(fixture,candidate).review.updateActionDifferences.length,0);
});
