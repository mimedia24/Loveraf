/* eslint-disable react-native/no-inline-styles */
import React, {useEffect, useState} from 'react';
import {Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View} from 'react-native';
import {Text, TextInput} from '../components/Typography';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BrandLogo, BrandMark} from '../components/BrandLogo';
import {Icon} from '../components/Icon';
import {PrimaryButton, Screen} from '../components/UI';
import {colors, radius, shadow} from '../theme';
import {ScreenProps} from '../types';
import {useAuth} from '../auth';

export function SplashScreen({navigation}: ScreenProps) {
  const {ready,user} = useAuth();
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => navigation.replace(user ? 'Home' : 'Onboarding'), 1300);
    return () => clearTimeout(timer);
  }, [navigation,ready,user]);
  return <SafeAreaView style={s.splash}><View style={s.splashOrbOne}/><View style={s.splashOrbTwo}/><View style={s.splashLogo}><BrandMark size={106}/><Text style={s.splashName}>loveraf</Text><Text style={s.splashTag}>LOVE · TRUST · SHOP</Text></View><View style={s.loader}><View style={s.loaderActive}/></View><Text style={s.version}>UI PREVIEW · VERSION 1.0</Text></SafeAreaView>;
}

const slides = [
  {icon: 'bag', kicker: 'DISCOVER', title: 'Everything you love,\nin one beautiful place.', text: 'Curated products, trusted sellers and exclusive deals—designed around you.'},
  {icon: 'sparkles', kicker: 'SAVE SMARTER', title: 'Rewards that feel\nlike real money.', text: 'Use Promo Balance for up to 10% product discount and track every benefit clearly.'},
  {icon: 'shield', kicker: 'SHOP SAFELY', title: 'Confidence from cart\nto your doorstep.', text: 'Secure checkout, verified sellers, live tracking and simple returns in one flow.'},
];

export function OnboardingScreen({navigation}: ScreenProps) {
  const [index, setIndex] = useState(0);
  const slide = slides[index];
  const next = () => index < slides.length - 1 ? setIndex(index + 1) : navigation.replace('Login');
  return <Screen scroll={false} dark><View style={s.onboard}><View style={s.onboardTop}><BrandLogo compact/><Pressable onPress={() => navigation.replace('Login')}><Text style={s.skip}>Skip</Text></Pressable></View><View style={s.heroVisual}><View style={s.ringLarge}/><View style={s.ringSmall}/><View style={s.heroIcon}><Icon name={slide.icon} size={70} color={colors.white}/></View><View style={s.floatingCard}><Text style={s.floatingLabel}>{index === 1 ? 'PROMO BALANCE' : index === 2 ? 'PROTECTED ORDER' : 'TODAY’S PICKS'}</Text><Text style={s.floatingValue}>{index === 1 ? '৳200' : index === 2 ? '100% secure' : '120+ new'}</Text></View></View><View style={s.onboardSheet}><Text style={s.kicker}>{slide.kicker}</Text><Text style={s.onboardTitle}>{slide.title}</Text><Text style={s.onboardText}>{slide.text}</Text><View style={s.dots}>{slides.map((_, i) => <View key={i} style={[s.dot, i === index && s.dotActive]}/>)}</View><PrimaryButton title={index === slides.length - 1 ? 'Start shopping' : 'Continue'} onPress={next}/><Pressable onPress={() => navigation.replace('Login')}><Text style={s.signInHint}>Already a member? <Text style={s.red}>Login</Text></Text></Pressable></View></View></Screen>;
}

function Field({icon, placeholder, secure, value, onChangeText}: {icon: string; placeholder: string; secure?: boolean; value: string; onChangeText: (v: string) => void}) {
  return <View style={s.field}><Icon name={icon} color={colors.textSoft}/><TextInput value={value} onChangeText={onChangeText} secureTextEntry={secure} placeholder={placeholder} placeholderTextColor={colors.textMuted} style={s.fieldInput}/></View>;
}

export function LoginScreen({navigation}: ScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {login} = useAuth();
  const [busy,setBusy] = useState(false);
  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const user = await login(email,password);
      navigation.reset(user.email_verified || user.phone_verified ? 'Home' : 'Verification');
    } catch (error) {Alert.alert('Sign in',error instanceof Error ? error.message : 'Please try again.');}
    finally {setBusy(false);}
  };
  return <SafeAreaView style={s.authSafe}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.authWrap}><View style={s.authHeader}><View style={s.authOrb}/><BrandLogo/><Text style={s.authWelcome}>Welcome back</Text><Text style={s.authLead}>Login to continue your Loveraf experience.</Text></View><View style={s.authSheet}><Text style={s.label}>Email or phone</Text><Field icon="user" placeholder="Enter email or phone" value={email} onChangeText={setEmail}/><Text style={s.label}>Password</Text><Field icon="lock" placeholder="Enter password" secure value={password} onChangeText={setPassword}/><View style={s.authActions}><Pressable style={s.remember}><View style={s.checkbox}><Icon name="check" color={colors.white} size={14}/></View><Text style={s.rememberText}>Remember me</Text></Pressable><Pressable onPress={() => navigation.push('Verification',{recover:true})}><Text style={s.red}>Forgot password?</Text></Pressable></View><PrimaryButton title={busy ? 'Please wait...' : 'Login'} onPress={signIn}/><View style={s.or}><View style={s.orLine}/><Text style={s.orText}>or continue with</Text><View style={s.orLine}/></View><View style={s.socialRow}><Pressable style={s.social} onPress={() => Alert.alert('Sign in','This sign-in method is not available yet. Use your email or phone.')}><Text style={s.socialText}>G</Text><Text style={s.socialLabel}>Google</Text></Pressable><Pressable style={s.social} onPress={() => Alert.alert('Sign in','This sign-in method is not available yet. Use your email or phone.')}><Text style={[s.socialText, {color: '#1877F2'}]}>f</Text><Text style={s.socialLabel}>Facebook</Text></Pressable></View><Pressable onPress={() => navigation.push('Register')}><Text style={s.create}>New to Loveraf? <Text style={s.red}>Create a new account</Text></Text></Pressable><Pressable onPress={() => navigation.reset('Home')}><Text style={s.demo}>Continue as guest →</Text></Pressable></View></KeyboardAvoidingView></SafeAreaView>;
}

export function RegisterScreen({navigation}: ScreenProps) {
  const {register} = useAuth();
  const [busy,setBusy] = useState(false);
  const [agreed,setAgreed] = useState(false);
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const submit = async () => {
    if (busy) return;
    if (!agreed) {Alert.alert('Create account','Please accept the terms to continue.');return;}
    setBusy(true);
    try {await register({name,phone,email,password});navigation.reset('Verification');}
    catch (error) {Alert.alert('Create account',error instanceof Error ? error.message : 'Please try again.');}
    finally {setBusy(false);}
  };
  return <Screen><View style={s.registerHeader}><Pressable onPress={navigation.back} style={s.back}><Icon name="back" color={colors.white}/></Pressable><BrandLogo compact/><Text style={s.registerTitle}>Create your new account</Text><Text style={s.registerLead}>Join a smarter, safer marketplace experience.</Text></View><View style={s.registerBody}><Text style={s.label}>Full name</Text><Field icon="user" placeholder="Your full name" value={name} onChangeText={setName}/><Text style={s.label}>Mobile number</Text><Field icon="phone" placeholder="01XXXXXXXXX" value={phone} onChangeText={setPhone}/><Text style={s.label}>Email address</Text><Field icon="message" placeholder="you@example.com" value={email} onChangeText={setEmail}/><Text style={s.label}>Create password</Text><Field icon="lock" placeholder="At least 10 characters" secure value={password} onChangeText={setPassword}/><View style={s.terms}><Pressable accessibilityRole="checkbox" accessibilityState={{checked:agreed}} onPress={()=>setAgreed(!agreed)} style={s.checkbox}>{agreed&&<Icon name="check" color={colors.white} size={14}/>}</Pressable><Text style={s.termsText}>I agree to the <Text style={s.red}>Terms of Service</Text> and <Text style={s.red}>Privacy Policy</Text>.</Text></View><PrimaryButton title={busy ? 'Please wait...' : 'Create account'} onPress={submit}/><Pressable onPress={navigation.back}><Text style={s.create}>Already registered? <Text style={s.red}>Login</Text></Text></Pressable></View></Screen>;
}

const s = StyleSheet.create({
  splash: {flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'},
  splashOrbOne: {position: 'absolute', width: 360, height: 360, borderRadius: 200, backgroundColor: '#10284A', top: -170, right: -160},
  splashOrbTwo: {position: 'absolute', width: 240, height: 240, borderRadius: 140, backgroundColor: '#360B21', bottom: -120, left: -100},
  splashLogo: {alignItems: 'center'}, splashName: {fontSize: 48, fontWeight: '300', color: colors.white, letterSpacing: -1.5, marginTop: 10},
  splashTag: {fontSize: 9, color: colors.accent, letterSpacing: 3.5, marginTop: 2}, loader: {position: 'absolute', bottom: 76, width: 88, height: 3, backgroundColor: '#263449', borderRadius: 2},
  loaderActive: {width: 45, height: 3, backgroundColor: colors.accent, borderRadius: 2}, version: {position: 'absolute', bottom: 35, color: '#5E6B80', fontSize: 8, letterSpacing: 1.5},
  onboard: {flex: 1, backgroundColor: colors.ink}, onboardTop: {height: 76, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, skip: {color: '#ABB6C7', fontSize: 13, padding: 8},
  heroVisual: {flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}, ringLarge: {position: 'absolute', width: 300, height: 300, borderRadius: 160, borderWidth: 1, borderColor: '#24354D'}, ringSmall: {position: 'absolute', width: 210, height: 210, borderRadius: 120, borderWidth: 18, borderColor: '#0E1B2C'},
  heroIcon: {width: 146, height: 146, borderRadius: 50, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', transform: [{rotate: '-5deg'}], ...shadow},
  floatingCard: {position: 'absolute', right: 20, bottom: 34, backgroundColor: colors.white, borderRadius: radius.md, padding: 13, minWidth: 135, ...shadow}, floatingLabel: {fontSize: 8, color: colors.textSoft, letterSpacing: 1}, floatingValue: {fontSize: 18, color: colors.text, fontWeight: '800', marginTop: 4},
  onboardSheet: {backgroundColor: colors.white, borderTopLeftRadius: 34, borderTopRightRadius: 34, padding: 25, paddingBottom: 22}, kicker: {fontSize: 10, letterSpacing: 2.2, color: colors.accent, fontWeight: '800'}, onboardTitle: {fontSize: 29, lineHeight: 36, color: colors.text, fontWeight: '800', marginTop: 10}, onboardText: {fontSize: 13.5, lineHeight: 21, color: colors.textSoft, marginTop: 12},
  dots: {flexDirection: 'row', gap: 7, marginVertical: 23}, dot: {width: 7, height: 7, borderRadius: 4, backgroundColor: colors.line}, dotActive: {width: 28, backgroundColor: colors.accent}, signInHint: {textAlign: 'center', marginTop: 17, color: colors.textSoft, fontSize: 12}, red: {color: colors.accent, fontWeight: '700'},
  authSafe: {flex: 1, backgroundColor: colors.ink}, authWrap: {flex: 1}, authHeader: {backgroundColor: colors.ink, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 34, overflow: 'hidden'}, authOrb: {position: 'absolute', width: 190, height: 190, borderRadius: 100, right: -55, top: -80, backgroundColor: '#182D4A'},
  authWelcome: {color: colors.white, fontSize: 30, fontWeight: '800', marginTop: 35}, authLead: {color: '#AEB9C9', fontSize: 13, marginTop: 8}, authSheet: {flex: 1, backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, marginTop: -1},
  label: {fontSize: 12, color: colors.text, fontWeight: '700', marginBottom: 8, marginTop: 14}, field: {height: 54, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15}, fieldInput: {flex: 1, color: colors.text, fontSize: 14, marginLeft: 11},
  authActions: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 17}, remember: {flexDirection: 'row', alignItems: 'center', gap: 8}, checkbox: {width: 20, height: 20, borderRadius: 6, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center'}, rememberText: {fontSize: 12, color: colors.textSoft},
  or: {flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20}, orLine: {height: 1, backgroundColor: colors.line, flex: 1}, orText: {fontSize: 10, color: colors.textMuted}, socialRow: {flexDirection: 'row', gap: 12}, social: {flex: 1, height: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9}, socialText: {fontSize: 18, color: '#4285F4', fontWeight: '900'}, socialLabel: {fontSize: 13, color: colors.text, fontWeight: '600'}, create: {textAlign: 'center', color: colors.textSoft, marginTop: 22, fontSize: 12}, demo: {textAlign: 'center', color: colors.ink, marginTop: 16, fontSize: 11, fontWeight: '700'},
  registerHeader: {backgroundColor: colors.ink, padding: 24, paddingTop: 18, borderBottomLeftRadius: 30, borderBottomRightRadius: 30}, back: {width: 42, height: 42, marginLeft: -10, alignItems: 'center', justifyContent: 'center'}, registerTitle: {color: colors.white, fontSize: 28, fontWeight: '800', marginTop: 25}, registerLead: {color: '#AEB9C9', fontSize: 13, marginTop: 8}, registerBody: {padding: 22}, terms: {flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 18}, termsText: {flex: 1, color: colors.textSoft, fontSize: 11.5, lineHeight: 18},
});
