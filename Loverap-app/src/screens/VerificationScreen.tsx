import React,{useState} from 'react';
import {Alert,StyleSheet,View} from 'react-native';
import {Text,TextInput} from '../components/Typography';
import {Header,PrimaryButton,Screen} from '../components/UI';
import {api} from '../api';
import {useAuth} from '../auth';
import {colors} from '../theme';
import {ScreenProps} from '../types';

export function VerificationScreen({navigation,params}:ScreenProps) {
  const recover=params?.recover===true;
  const {refresh}=useAuth();
  const [channel,setChannel]=useState<'phone'|'email'>('phone'),[login,setLogin]=useState(''),[challenge,setChallenge]=useState('');
  const [code,setCode]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const run=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Request failed.');}finally{setBusy(false);}};
  const send=()=>run(async()=>{
    const r=await api<{challengeId:string}>(recover?'/auth/recovery':'/auth/challenge','POST',recover?{login,channel}:{channel,purpose:'verify'});
    setChallenge(r.challengeId);
  });
  const verify=()=>run(async()=>{
    await api(recover?'/auth/reset-password':'/auth/verify','POST',{challengeId:challenge,code,...(recover?{password}:{})});
    if(recover){Alert.alert('Password updated','Sign in with your new password.');navigation.reset('Login');}
    else {await refresh();Alert.alert('Verified',`${channel==='phone'?'Mobile number':'Email'} verified.`);navigation.replace('Home');}
  });
  return <Screen><Header title={recover?'Reset password':'Verify account'} navigation={navigation}/><View style={s.body}>
    <Text style={s.label}>Verification method</Text><View style={s.row}><PrimaryButton title="Mobile" outline={channel!=='phone'} onPress={()=>{setChannel('phone');setChallenge('');}}/><PrimaryButton title="Email" outline={channel!=='email'} onPress={()=>{setChannel('email');setChallenge('');}}/></View>
    {recover&&<><Text style={s.label}>Email or phone</Text><TextInput autoCapitalize="none" value={login} onChangeText={setLogin} style={s.input}/></>}
    <PrimaryButton title={busy?'Please wait...':challenge?'Resend code':'Send verification code'} onPress={send}/>
    {!!challenge&&<><Text style={s.label}>Six-digit verification code</Text><TextInput keyboardType="number-pad" maxLength={6} value={code} onChangeText={setCode} style={s.input}/>{recover&&<><Text style={s.label}>New password · minimum 10 characters</Text><TextInput secureTextEntry value={password} onChangeText={setPassword} style={s.input}/></>}<PrimaryButton title="Verify" onPress={verify}/></>}
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </View></Screen>;
}
const s=StyleSheet.create({body:{padding:20,gap:16},label:{fontSize:13,color:colors.text,fontWeight:'700'},input:{borderWidth:1,borderColor:colors.line,borderRadius:12,padding:12,color:colors.text,backgroundColor:colors.white},row:{gap:10},error:{color:colors.accent,fontSize:12}});
