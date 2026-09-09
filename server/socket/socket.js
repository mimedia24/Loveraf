const {Server}=require('socket.io');
const {Conversation}=require('../models/communication.model');
function configureSocket(httpServer,authService,origins){
  const io=new Server(httpServer,{cors:{origin:origins.length?origins:true,credentials:true}});
  io.use(async(socket,next)=>{try{const token=socket.handshake.auth?.token||String(socket.handshake.headers.authorization||'').replace(/^Bearer /,'');socket.auth=await authService.authenticate(token);next();}catch{next(new Error('Authentication failed'));}});
  io.on('connection',socket=>{socket.join(`user:${socket.auth.user._id}`);socket.on('conversation:join',async id=>{if(await Conversation.exists({_id:id,members:socket.auth.user._id}))socket.join(`conversation:${id}`);});socket.on('conversation:leave',id=>socket.leave(`conversation:${id}`));});
  return io;
}
module.exports={configureSocket};
