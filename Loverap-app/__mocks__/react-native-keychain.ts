let token:string|undefined;
export const ACCESSIBLE={WHEN_UNLOCKED_THIS_DEVICE_ONLY:'test'};
export const getGenericPassword=jest.fn(async()=>token?{username:'session',password:token}:false);
export const setGenericPassword=jest.fn(async(_user:string,value:string)=>{token=value;return true;});
export const resetGenericPassword=jest.fn(async()=>{token=undefined;return true;});
