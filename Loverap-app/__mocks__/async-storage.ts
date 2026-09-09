const data=new Map<string,string>();
export default {getItem:jest.fn(async(key:string)=>data.get(key)??null),setItem:jest.fn(async(key:string,value:string)=>{data.set(key,value);}),removeItem:jest.fn(async(key:string)=>{data.delete(key);})};
