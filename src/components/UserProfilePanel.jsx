"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Copy,
  KeyRound,
  Link2,
  Mail,
  Building2,
  ShieldCheck,
  UserCircle2,
  BadgeCheck,
} from "lucide-react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";

import { auth } from "@/firebase/config";
import {
  normalizeEnquirySlug,
  updateAgentEnquirySlug,
  updateAdminEnquirySlug,
  updateUserAuthMetadata,
} from "@/firebase/users";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MIN_PASSWORD_LENGTH = 8;

const passwordStrongEnough = (password) =>
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);

const roleLabel = {
  agent: "Travel Agent",
  admin: "Administrator",
  superadmin: "Super Admin",
};

export default function UserProfilePanel({ user }) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingEnquirySlug, setSavingEnquirySlug] = useState(false);
  const [passwordEnabled, setPasswordEnabled] = useState(
    Boolean(user?.hasPassword || user?.providerIds?.includes("password")),
  );
  const [enquirySlugInput, setEnquirySlugInput] = useState(user?.enquirySlug || "");
  const [activeEnquirySlug, setActiveEnquirySlug] = useState(user?.enquirySlug || "");
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [setPasswordForm, setSetPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [changePasswordForm, setChangePasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const isEnquiryRole = user?.role === "agent" || user?.role === "admin";

  const enquiryLink = useMemo(() => {
    if (typeof window === "undefined" || !isEnquiryRole) return "";
    return `${window.location.origin}/enquiry/${activeEnquirySlug || user.uid}`;
  }, [activeEnquirySlug, isEnquiryRole, user?.uid]);

  const effectiveProvider =
    user?.authProvider ||
    (user?.providerIds?.includes("google.com") ? "google" : "password");
  const canSetPassword = effectiveProvider === "google" && !passwordEnabled;
  const canChangePassword = Boolean(passwordEnabled);

  const handleBack = () => {
    if (user?.role === "admin") {
      router.push("/admin-panel");
      return;
    }
    if (user?.role === "agent") {
      router.push("/agent-panel");
      return;
    }
    if (user?.role === "superadmin") {
      router.push("/superadmin");
      return;
    }
    router.push("/");
  };

  const handleCopyLink = async () => {
    if (!enquiryLink) return;
    try {
      await navigator.clipboard.writeText(enquiryLink);
      setCopied(true);
      toast.success("Enquiry link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the enquiry link");
    }
  };

  const handleSaveEnquirySlug = async () => {
    if (!user?.uid) return;

    setSavingEnquirySlug(true);
    try {
      const updateFn = user.role === "admin" ? updateAdminEnquirySlug : updateAgentEnquirySlug;
      const savedSlug = await updateFn(user.uid, enquirySlugInput);
      setActiveEnquirySlug(savedSlug);
      setEnquirySlugInput(savedSlug);
      toast.success(
        savedSlug
          ? "Enquiry link updated successfully."
          : "Custom enquiry link removed. UID link remains active.",
      );
    } catch (error) {
      toast.error(error.message || "Could not update the enquiry link");
    } finally {
      setSavingEnquirySlug(false);
    }
  };

  const validateNewPassword = (password, confirmPassword) => {
    if (!passwordStrongEnough(password)) {
      return "Password must be at least 8 characters and include uppercase, lowercase, and a number.";
    }
    if (password !== confirmPassword) {
      return "Password and confirm password do not match.";
    }
    return null;
  };

  const handleSetPassword = async () => {
    const validationError = validateNewPassword(
      setPasswordForm.newPassword,
      setPasswordForm.confirmPassword,
    );
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSubmitting(true);
    try {
      if (!auth.currentUser) throw new Error("You must be logged in.");
      await updatePassword(auth.currentUser, setPasswordForm.newPassword);
      await updateUserAuthMetadata(auth.currentUser.uid, {
        hasPassword: true,
        passwordSetAt: new Date(),
      });
      setPasswordEnabled(true);
      setSetPasswordOpen(false);
      setSetPasswordForm({ newPassword: "", confirmPassword: "" });
      toast.success(
        "Password set successfully. You can now log in using email and password.",
      );
    } catch (error) {
      if (error.code === "auth/requires-recent-login") {
        toast.error("Please log in again with Google, then set your password.");
      } else {
        toast.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    const { currentPassword, newPassword, confirmPassword } = changePasswordForm;

    if (!currentPassword) {
      toast.error("Current password is required.");
      return;
    }

    const validationError = validateNewPassword(newPassword, confirmPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from the current password.");
      return;
    }

    setSubmitting(true);
    try {
      if (!auth.currentUser?.email) throw new Error("You must be logged in.");

      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword,
      );

      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      await updateUserAuthMetadata(auth.currentUser.uid, {
        hasPassword: true,
        passwordSetAt: new Date(),
      });
      setPasswordEnabled(true);
      setChangePasswordOpen(false);
      setChangePasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast.success("Your password has been updated successfully.");
    } catch (error) {
      if (error.code === "auth/invalid-credential") {
        toast.error("Current password is incorrect.");
      } else {
        toast.error(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#F7F9FC]">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-8 flex flex-col gap-4 rounded-[32px] bg-gradient-to-r from-theme-gradient-from to-theme-gradient-to p-6 text-white shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <Button
                  variant="secondary"
                  onClick={handleBack}
                  className="w-fit bg-white/15 text-white hover:bg-white/25"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">
                    Account Profile
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                    {user?.name || "User"}
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
                    View your account details, manage your enquiry link, and control password access from one place.
                  </p>
                </div>
              </div>
              <div className="hidden rounded-[28px] bg-white/15 p-5 backdrop-blur-sm sm:block">
                <UserCircle2 className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="rounded-[28px] border-0 shadow-lg shadow-slate-200/80">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-black text-slate-900">
                  User Details
                </CardTitle>
                <CardDescription>
                  Your account information and login setup.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Full Name
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {user?.name || "Not available"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Role
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {roleLabel[user?.role] || user?.role || "User"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Email
                  </p>
                  <p className="mt-2 break-all text-base font-semibold text-slate-900">
                    {user?.email || "Not available"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Approval Status
                  </p>
                  <p className="mt-2 text-base font-semibold capitalize text-slate-900">
                    {user?.approved || "Accepted"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    <Building2 className="h-3.5 w-3.5" />
                    Organization
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {user?.role === "superadmin"
                      ? "Global access"
                      : user?.orgName || user?.orgId || "Not assigned"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Login Method
                  </p>
                  <p className="mt-2 text-base font-semibold capitalize text-slate-900">
                    {effectiveProvider === "google" ? "Google" : "Email and Password"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Password Status
                  </p>
                  <p className="mt-2 text-base font-semibold text-slate-900">
                    {passwordEnabled ? "Password enabled" : "Password not set"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              {isEnquiryRole && (
                <Card className="rounded-[28px] border-0 shadow-lg shadow-slate-200/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
                      <Link2 className="h-5 w-5 text-theme-primary" />
                      Enquiry Link
                    </CardTitle>
                    <CardDescription>
                      Share this link with customers so their enquiry comes directly to you.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                      <p className="break-all text-sm font-medium text-slate-700">
                        {enquiryLink}
                      </p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Label htmlFor="enquiry-slug">Custom link ending</Label>
                      <div className="flex gap-2">
                        <Input
                          id="enquiry-slug"
                          value={enquirySlugInput}
                          onChange={(e) =>
                            setEnquirySlugInput(normalizeEnquirySlug(e.target.value))
                          }
                          placeholder="e.g. adwait-travel"
                          maxLength={40}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSaveEnquirySlug}
                          disabled={savingEnquirySlug}
                        >
                          {savingEnquirySlug ? "Saving..." : "Save"}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-500">
                        Use lowercase letters, numbers, and hyphens. Leave blank to use the default UID-based link.
                      </p>
                      {activeEnquirySlug ? (
                        <p className="text-xs text-slate-500">
                          Existing UID-based enquiry links will continue to work.
                        </p>
                      ) : null}
                    </div>
                    <Button
                      onClick={handleCopyLink}
                      className="mt-4 w-full bg-theme-primary text-white hover:bg-theme-primary/90"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copied ? "Copied" : "Copy Enquiry Link"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Card className="rounded-[28px] border-0 shadow-lg shadow-slate-200/80">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-xl font-black text-slate-900">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    Password & Security
                  </CardTitle>
                  <CardDescription>
                    Set or update your password without affecting Google sign-in.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 h-5 w-5 text-theme-primary" />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {passwordEnabled
                            ? "Password-based login is active"
                            : "Password-based login is not active yet"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {passwordEnabled
                            ? "You can continue using your current password or sign in with Google if that provider is linked."
                            : "Set a password to allow email and password sign-in in addition to Google login."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {canSetPassword && (
                    <Button
                      onClick={() => setSetPasswordOpen(true)}
                      className="w-full bg-theme-primary text-white hover:bg-theme-primary/90"
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Set Password
                    </Button>
                  )}

                  {canChangePassword && (
                    <Button
                      variant="outline"
                      onClick={() => setChangePasswordOpen(true)}
                      className="w-full"
                    >
                      <KeyRound className="mr-2 h-4 w-4" />
                      Change Password
                    </Button>
                  )}

                  <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                      <p>
                        Passwords are securely handled by Firebase Auth. This page never stores raw passwords in Firestore.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={setPasswordOpen} onOpenChange={setSetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Password</DialogTitle>
            <DialogDescription>
              Create a password so you can log in using either Google or email and password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-new-password">New Password</Label>
              <Input
                id="profile-new-password"
                type="password"
                value={setPasswordForm.newPassword}
                onChange={(e) =>
                  setSetPasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-confirm-password">Confirm Password</Label>
              <Input
                id="profile-confirm-password"
                type="password"
                value={setPasswordForm.confirmPassword}
                onChange={(e) =>
                  setSetPasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>
            <p className="text-xs text-slate-500">
              Use at least {MIN_PASSWORD_LENGTH} characters with uppercase,
              lowercase, and a number.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetPasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSetPassword} disabled={submitting}>
              {submitting ? "Saving..." : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Update your password to keep your account secure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-current-password">Current Password</Label>
              <Input
                id="profile-current-password"
                type="password"
                value={changePasswordForm.currentPassword}
                onChange={(e) =>
                  setChangePasswordForm((prev) => ({
                    ...prev,
                    currentPassword: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-change-new-password">New Password</Label>
              <Input
                id="profile-change-new-password"
                type="password"
                value={changePasswordForm.newPassword}
                onChange={(e) =>
                  setChangePasswordForm((prev) => ({
                    ...prev,
                    newPassword: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-change-confirm-password">Confirm New Password</Label>
              <Input
                id="profile-change-confirm-password"
                type="password"
                value={changePasswordForm.confirmPassword}
                onChange={(e) =>
                  setChangePasswordForm((prev) => ({
                    ...prev,
                    confirmPassword: e.target.value,
                  }))
                }
              />
            </div>
            <p className="text-xs text-slate-500">
              Your new password must be different from the current password.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={submitting}>
              {submitting ? "Updating..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
