"use client";

import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithPopup,
} from "firebase/auth";
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
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Icons
import {
  Mail,
  Lock,
  LogIn,
  Chrome,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { auth } from "@/firebase/config";
import { Google } from "@mui/icons-material";
import Link from "next/link";
import { getUserRecordByEmail } from "@/firebase/users";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State for toggle
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  // Handle Email/Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🔍 Check user in your DB first
      const userRecord = await getUserRecordByEmail(email);

      if (!userRecord) {
        toast.error("You are not registered. Please sign up.");
        setLoading(false);
        return;
      }

      // 🔐 Check if user is Google-only account
      if (userRecord.authProvider === "google" && !userRecord.hasPassword) {
        toast.error(
          "Please log in using Google or set a password from your profile.",
        );
        setLoading(false);
        return;
      }

      // 🔑 Firebase login
      await signInWithEmailAndPassword(auth, email, password);

      toast.success("Welcome back!")

      router.replace("/");
    } catch (error) {
      let message = "Login failed. Please try again.";

      switch (error.code) {
        case "auth/user-not-found":
          message = "You are not registered. Please sign up.";
          break;

        case "auth/wrong-password":
          message = "Incorrect password. Please try again.";
          break;

        case "auth/invalid-email":
          message = "Invalid email format.";
          break;

        case "auth/too-many-requests":
          message = "Too many attempts. Try again later.";
          break;

        default:
          message = error.message;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) {
      toast.error("Enter your email address first.");
      return;
    }

    setResetLoading(true);
    try {
      const userRecord = await getUserRecordByEmail(resetEmail);
      if (userRecord && !userRecord.hasPassword) {
        toast.error(
          "Please log in using Google or set a password from your profile.",
        );
        return;
      }

      await sendPasswordResetEmail(auth, resetEmail.trim().toLowerCase());
      toast.success("Password reset email sent.");
      setResetOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResetLoading(false);
    }
  };

  // Handle Google Login
  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // 🔍 Check if user exists in your DB
      const userRecord = await getUserRecordByEmail(user.email);

      if (!userRecord) {
        // 👉 Optional: auto-create user OR block login
        toast.error("You are not registered. Please sign up first.");
        await auth.signOut(); // logout immediately
        return;
      }

      // ✅ If user exists → allow login
      toast.success("Signed in successfully!")

      router.replace("/");
    } catch (error) {
      let message = "Google sign-in failed";

      switch (error.code) {
        case "auth/popup-closed-by-user":
          message = "Popup closed before completing login.";
          break;

        case "auth/account-exists-with-different-credential":
          message = "Account already exists with different sign-in method.";
          break;

        case "auth/network-request-failed":
          message = "Network error. Check your connection.";
          break;

        default:
          message = error.message;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#FDFCFE] relative overflow-hidden p-4">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-5%] left-[-5%] w-[300px] h-[300px] rounded-full bg-theme-muted/40 blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[300px] h-[300px] rounded-full bg-theme-secondary/10 blur-[100px]" />

      <Card className="w-full max-w-[420px] border-slate-100 shadow-2xl bg-white/70 backdrop-blur-xl z-10 transition-all duration-300 hover:shadow-theme-primary/10 rounded-3xl">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-theme-gradient-from to-theme-gradient-to rounded-2xl flex items-center justify-center mb-2 rotate-3 shadow-lg shadow-theme-primary/30">
            <LogIn className="text-white w-7 h-7" />
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight text-theme-dark">
            Login
          </CardTitle>
          <CardDescription className="text-slate-500 font-medium">
            Enter your details to manage your account
          </CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          {/* Social Login Section */}
          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            className="border-slate-200 h-12 hover:bg-white hover:border-theme-accent/50 transition-all duration-300 group"
          >
            <Google className="mr-2 h-5 w-5 text-theme-accent group-hover:scale-110 transition-transform" />
            <span className="font-semibold text-slate-700">
              Continue with Google
            </span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/0 px-2 text-slate-400 font-medium tracking-widest">
                Or login with
              </span>
            </div>
          </div>

          {/* Form Section */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-theme-dark font-semibold ml-1"
              >
                Email Address
              </Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-theme-primary transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="hello@example.com"
                  className="pl-10 h-11 border-slate-200 focus-visible:ring-theme-primary transition-all rounded-lg"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="password"
                  className="text-theme-dark font-semibold ml-1"
                >
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetOpen(true);
                  }}
                  className="text-xs font-bold text-theme-secondary hover:text-theme-dark transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 group-focus-within:text-theme-primary transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"} // Dynamic type
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 border-slate-200 focus-visible:ring-theme-primary transition-all rounded-lg"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {/* Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-theme-primary transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-linear-to-r from-theme-gradient-from to-theme-gradient-to hover:shadow-xl cursor-pointer hover:scale-[1.01] transition-all active:scale-[0.98] text-white font-bold rounded-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pb-8">
          <div className="text-sm text-center text-slate-500">
            New here?{" "}
            <Link
              href={"/signup"}
              className="font-bold text-theme-primary hover:underline transition-all"
            >
              Create an account
            </Link>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we will send you a password reset
              link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email Address</Label>
            <Input
              id="reset-email"
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="hello@example.com"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePasswordReset} disabled={resetLoading}>
              {resetLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
