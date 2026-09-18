import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
export default [{
 files:['src/**/*.ts'],
 languageOptions:{parser,parserOptions:{ecmaVersion:2022,sourceType:'module'}},
 plugins:{'@typescript-eslint':tseslint},
 rules:{
  'no-undef':'off',
  'no-unused-vars':'off',
  '@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}],
  'no-console':'off'
 }
}];
