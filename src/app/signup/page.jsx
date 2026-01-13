"use client";

import React, { useState, useEffect } from "react";
import { 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config"; 
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

// Shadcn Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

// Icons
import { 
  Mail, 
  Lock, 
  UserPlus, 
  Chrome, 
  Loader2, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight 
} from "lucide-react";
import { Google } from "@mui/icons-material";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    countryCode: "+91",
    phone: "",
    password: "",
    role: "agent" // Default role
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // If user is already logged in, you might want to redirect based on role
        // For now, we stay on page to allow them to create new accounts if needed
      }
    });
    return () => unsubscribe();
  }, []);

  // Validation: Password Strength
  const checkPasswordStrength = (pwd) => {
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    const medium = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    if (strong.test(pwd)) return "Strong";
    if (medium.test(pwd)) return "Medium";
    return "Weak";
  };

  const handlePasswordChange = (e) => {
    const pwd = e.target.value;
    setFormData({ ...formData, password: pwd });
    setPasswordStrength(checkPasswordStrength(pwd));
  };

  // Logic: Email Validation
  const validateEmail = (email) => {
    const validFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidDomains = ["@test.com", "@tempmail.com", "@mailinator.com"];
    return validFormat.test(email) && !invalidDomains.some((d) => email.endsWith(d));
  };

  // Function: Save User to Firestore
  const saveUserToDb = async (user, role, name, phone) => {
    const collectionName = role === "admin" ? "admins" : "agents";
    await setDoc(doc(db, collectionName, user.uid), {
      uid: user.uid,
      name: name || user.displayName,
      email: user.email,
      phone: phone || "",
      role: role,
      approved: false, // Default to false for admin review
      createdAt: new Date(),
    });
  };

  // HANDLER: Email/Password Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!validateEmail(formData.email)) return toast.error("Invalid email domain.");
    if (formData.phone.length !== 10) return toast.error("Phone number must be 10 digits.");
    if (passwordStrength === "Weak") return toast.error("Password is too weak.");

    setLoading(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await saveUserToDb(user, formData.role, formData.name, `${formData.countryCode}${formData.phone}`);
      
      toast.success("Signup successful! Waiting for admin approval.");
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // HANDLER: Google Signup (Role Based)
  const handleGoogleSignup = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Determine collection based on UI selection
      const collectionName = formData.role === "admin" ? "admins" : "agents";
      const docSnap = await getDoc(doc(db, collectionName, user.uid));

      if (!docSnap.exists()) {
        // New user - Use the role currently selected in the dropdown
        await saveUserToDb(user, formData.role, user.displayName, user.phoneNumber);
        toast.success(`Registered as ${formData.role}. Awaiting approval.`);
        await signOut(auth);
        router.push("/login");
      } else {
        // Existing user
        const data = docSnap.data();
        if (data.approved) {
          toast.success("Welcome back!");
          router.push(data.role === "admin" ? "/data-entry" : "/agent-dashboard");
        } else {
          toast.error("Account pending approval.");
          await signOut(auth);
        }
      }
    } catch (error) {
      toast.error("Google authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFCFE] relative overflow-hidden p-4">
      <Toaster position="top-center" />
      
      {/* Background Orbs */}
      <div className="absolute top-[-5%] left-[-5%] w-[350px] h-[350px] rounded-full bg-theme-muted/30 blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[350px] h-[350px] rounded-full bg-theme-secondary/10 blur-[100px]" />

      <Card className="w-full max-w-[480px] rounded-3xl border-slate-100 shadow-2xl bg-white/80 backdrop-blur-xl z-10 transition-all">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-theme-gradient-from to-theme-gradient-to rounded-2xl flex items-center justify-center mb-2 -rotate-3 shadow-lg shadow-theme-primary/30">
            <UserPlus className="text-white w-7 h-7" />
          </div>
          <CardTitle className="text-3xl font-extrabold text-theme-dark tracking-tight">Create Account</CardTitle>
          <CardDescription className="text-slate-500 font-medium">Join Adwait Tours Management</CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
          <form onSubmit={handleSignup} className="space-y-4">
            
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-theme-dark font-semibold ml-1">Full Name</Label>
              <div className="relative group">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-theme-primary transition-colors" />
                <Input 
                  placeholder="John Doe" 
                  className="pl-10 h-11 border-slate-200 focus-visible:ring-theme-primary" 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label className="text-theme-dark font-semibold ml-1">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-theme-primary transition-colors" />
                <Input 
                  type="email" 
                  placeholder="john@example.com" 
                  className="pl-10 h-11 border-slate-200 focus-visible:ring-theme-primary" 
                  required 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                />
              </div>
            </div>

            {/* Phone & Country Code */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-theme-dark font-semibold ml-1">Code</Label>
                <Select 
                  value={formData.countryCode} 
                  onValueChange={(val) => setFormData({...formData, countryCode: val})}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+91">🇮🇳 +91</SelectItem>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                    <SelectItem value="+44">🇬🇧 +44</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-theme-dark font-semibold ml-1">Phone Number</Label>
                <div className="relative group">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-theme-primary transition-colors" />
                  <Input 
                    type="tel"
                    placeholder="10 digit number" 
                    className="pl-10 h-11 border-slate-200 focus-visible:ring-theme-primary" 
                    required 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* Password with Strength Indicator */}
            <div className="space-y-1.5">
              <Label className="text-theme-dark font-semibold ml-1">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-theme-primary transition-colors" />
                <Input 
                  type={showPassword ? "text" : "password"} 
                  className="pl-10 pr-10 h-11 border-slate-200" 
                  required 
                  value={formData.password} 
                  onChange={handlePasswordChange} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-theme-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formData.password && (
                <div className="flex items-center gap-2 mt-2 ml-1">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${
                      passwordStrength === "Weak" ? "w-1/3 bg-red-500" : 
                      passwordStrength === "Medium" ? "w-2/3 bg-yellow-500" : "w-full bg-green-500"
                    }`} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase ${
                    passwordStrength === "Weak" ? "text-red-500" : 
                    passwordStrength === "Medium" ? "text-yellow-600" : "text-green-600"
                  }`}>
                    {passwordStrength}
                  </span>
                </div>
              )}
            </div>

            {/* Role Selection (CRITICAL: Determines Google Signup Role) */}
            <div className="space-y-1.5">
              <Label className="text-theme-dark font-semibold ml-1">Select Your Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(val) => setFormData({...formData, role: val})}
              >
                <SelectTrigger className="h-11 border-slate-200 bg-white/50">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-theme-accent" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agent">Agent (Tours/Bookings)</SelectItem>
                  <SelectItem value="admin">Administrator (System Access)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r cursor-pointer from-theme-gradient-from to-theme-gradient-to hover:shadow-xl hover:opacity-90 transition-all font-bold text-lg rounded-xl shadow-lg shadow-theme-primary/20"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign Up"}
            </Button>
          </form>

          <Button 
            type="button"
            variant="outline" 
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full h-12 border-slate-200 cursor-pointer bg-white hover:bg-slate-50 group transition-all rounded-xl"
          >
            <Google className="mr-2 h-5 w-5 text-theme-accent group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-slate-700">Continue with Google</span>
          </Button>
        </CardContent>

        <CardFooter className="justify-center pb-8 pt-2">
          <p className="text-sm text-slate-500 font-medium">
            Already have an account?{" "}
            <button 
              onClick={() => router.push("/login")} 
              className="text-theme-primary font-bold hover:text-theme-dark hover:underline underline-offset-4 transition-all"
            >
              Log in here
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}