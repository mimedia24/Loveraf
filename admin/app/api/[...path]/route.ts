import {NextRequest,NextResponse} from 'next/server';
import {cookies} from 'next/headers';

async function proxy(request:NextRequest,{params}:{params:Promise<{path:string[]}>}) {
  const {path}=await params;
  const route=path.join('/');
  if(!/^(auth\/(login|logout|challenge|verify)|me|admin\/(users|sellers|products|reports|audit)(\/[0-9a-f-]+)?|admin\/rules(\/[a-z_]+)?|admin\/content\/(categories|banners|policies|about|faq)|content\/(categories|banners|policies|about|faq))$/.test(route))
    return NextResponse.json({message:'Not found'},{status:404});
  if(request.method!=='GET'&&request.headers.get('origin')!==(process.env.ADMIN_ORIGIN||'http://localhost:3000'))
    return NextResponse.json({message:'Origin rejected'},{status:403});
  const jar=await cookies(),token=jar.get('loveraf_admin')?.value;
  try {
    const response=await fetch(`${process.env.API_URL||'http://127.0.0.1:3001/api/v1'}/${route}`,{
      method:request.method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},
      body:request.method==='GET'?undefined:await request.text(),cache:'no-store',signal:AbortSignal.timeout(15000)});
    const body=await response.json();
    if(route==='auth/login'&&response.ok) {
      jar.set('loveraf_admin',body.token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:8*3600});
      delete body.token;
    }
    if(route==='auth/logout'||response.status===401)jar.delete('loveraf_admin');
    return NextResponse.json(body,{status:response.status,headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({message:'API is unavailable. Try again.'},{status:503});}
}
export {proxy as GET,proxy as POST,proxy as PATCH};
