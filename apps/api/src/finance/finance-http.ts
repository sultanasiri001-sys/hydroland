import { HttpException } from '@nestjs/common';

// Only domain codes reach clients; database statements and internal errors stay private.
export async function financeHttp<T>(action:()=>Promise<T>):Promise<T> {
  try { return await action(); } catch(error) {
    if(error instanceof HttpException)throw error;
    if(error instanceof Error && /^FINANCE_[A-Z_]+$/.test(error.message)) {
      const code=error.message;
      const status=/DENIED|ACCEPTOR_INVALID/.test(code)?403:/NOT_FOUND/.test(code)?404:/EXISTS|NOT_OPEN|NOT_PENDING|NOT_EMPTY|ALREADY_PENDING|MAPPING_AMBIGUOUS/.test(code)?409:400;
      throw new HttpException({message:code,code},status);
    }
    if(['22P02','22003'].includes(String((error as {meta?:{code?:string}})?.meta?.code)))throw new HttpException({message:'FINANCE_INPUT_INVALID',code:'FINANCE_INPUT_INVALID'},400);
    throw error;
  }
}
