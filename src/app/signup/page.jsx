"use client";

import React, { useState } from "react";
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
import emailjs from "@emailjs/browser";

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
  Loader2, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  ShieldCheck 
} from "lucide-react";
import { Google } from "@mui/icons-material";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    countryCode: "+91",
    phone: "",
    password: "",
    role: "agent"
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Helper function to send email via EmailJS
  const sendAdminEmail = async (userDisplayName, userEmail, userRole, userPhone) => {
    try {
      await emailjs.send(
        "service_gmfmqbu",
        "template_msuvmij",
        {
          user_name: userDisplayName,
          user_email: userEmail,
          user_role: userRole,
          user_phone: userPhone,
          admin_email: "rushikesh.gaikwad@adwaittours.com",
        },
        "GjevhIIhLITokCOAK"
      );
      console.log("Admin notified via EmailJS");
    } catch (error) {
      console.error("EmailJS Error:", error);
    }
  };

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

  const validateEmail = (email) => {
    const validFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidDomains = ["@test.com", "@tempmail.com", "@mailinator.com"];
    return validFormat.test(email) && !invalidDomains.some((d) => email.endsWith(d));
  };

  // REVISED: Saving with string status for 'approved'
  const saveUserToDb = async (user, role, name, phone) => {
    const collectionName = role === "admin" ? "admins" : "agents";
    await setDoc(doc(db, collectionName, user.uid), {
      uid: user.uid,
      name: name || user.displayName,
      email: user.email,
      phone: phone || "",
      role: role,
      approved: "pending", // Set default status to pending
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
      const fullPhone = `${formData.countryCode}${formData.phone}`;
      
      await saveUserToDb(user, formData.role, formData.name, fullPhone);
      await sendAdminEmail(formData.name, formData.email, formData.role, fullPhone);
      
      toast.success("Signup successful! Waiting for admin approval.");
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // HANDLER: Google Signup
  const handleGoogleSignup = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const collectionName = formData.role === "admin" ? "admins" : "agents";
      const docSnap = await getDoc(doc(db, collectionName, user.uid));

      if (!docSnap.exists()) {
        const phone = user.phoneNumber || "Not provided";
        await saveUserToDb(user, formData.role, user.displayName, phone);
        await sendAdminEmail(user.displayName, user.email, formData.role, phone);

        toast.success(`Registered as ${formData.role}. Awaiting approval.`);
        await signOut(auth);
        router.push("/login");
      } else {
        const data = docSnap.data();
        
        // REVISED Logic for the 4 statuses saved in "approved" field
        if (data.approved === "accepted") {
          toast.success("Welcome back!");
          router.push(data.role === "admin" ? "/data-entry" : "/agent-dashboard");
        } else if (data.approved === "pending") {
          toast.error("Account pending approval.");
          await signOut(auth);
        } else if (data.approved === "rejected") {
          toast.error("Your application has been rejected.");
          await signOut(auth);
        } else if (data.approved === "suspended") {
          toast.error("Your account is currently suspended.");
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
      
      <div className="absolute top-[-5%] left-[-5%] w-[350px] h-[350px] rounded-full bg-blue-50/50 blur-[100px] animate-pulse" />

      <Card className="w-full max-w-[480px] rounded-3xl border-slate-100 shadow-2xl bg-white/80 backdrop-blur-xl z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-blue-200">
            <UserPlus className="text-white w-7 h-7" />
          </div>
          <CardTitle className="text-3xl font-extrabold text-slate-900">Create Account</CardTitle>
          <CardDescription className="text-slate-500 font-medium text-base">Join Adwait Tours Management</CardDescription>
        </CardHeader>

        <CardContent className="space-y-2">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-900 font-semibold ml-1">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="John Doe" 
                  className="pl-10 h-11 border-slate-200 focus:ring-blue-500" 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-900 font-semibold ml-1">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  type="email" 
                  placeholder="john@example.com" 
                  className="pl-10 h-11 border-slate-200 focus:ring-blue-500" 
                  required 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-slate-900 font-semibold ml-1">Code</Label>
                <Select 
                  value={formData.countryCode} 
                  onValueChange={(val) => setFormData({...formData, countryCode: val})}
                >
                  <SelectTrigger className="h-11 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+91">🇮🇳 +91</SelectItem>
                    <SelectItem value="+1">🇺🇸 +1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-slate-900 font-semibold ml-1">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    type="tel"
                    placeholder="10 digit number" 
                    className="pl-10 h-11 border-slate-200 focus:ring-blue-500" 
                    required 
                    value={formData.phone} 
                    onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-900 font-semibold ml-1">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
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
                  className="absolute right-3 top-3 text-slate-400 hover:text-blue-600"
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
                  <span className="text-[10px] font-bold uppercase text-slate-500">{passwordStrength}</span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-900 font-semibold ml-1">Select Your Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(val) => setFormData({...formData, role: val})}
              >
                <SelectTrigger className="h-11 border-slate-200 bg-white/50">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
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
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 transition-all font-bold text-lg rounded-xl shadow-lg"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Sign Up"}
            </Button>
          </form>

          <Button 
            type="button"
            variant="outline" 
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full h-12 border-slate-200 bg-white hover:bg-slate-50 transition-all rounded-xl mt-4"
          >
            <Google className="mr-2 h-5 w-5 text-red-500" />
            <span className="font-semibold text-slate-700">Continue with Google</span>
          </Button>
        </CardContent>

        <CardFooter className="justify-center pb-8 pt-2">
          <p className="text-sm text-slate-500 font-medium">
            Already have an account?{" "}
            <button 
              onClick={() => router.push("/login")} 
              className="text-blue-600 font-bold hover:underline"
            >
              Log in here
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}